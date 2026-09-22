from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import os
from supabase import create_client, Client
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime, date
import json
import jwt
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SLD Billing Software API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supabase ──────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Google Sheets ──────────────────────────────────────
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

def get_sheets_service():
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    creds_dict = json.loads(creds_json)
    creds = service_account.Credentials.from_service_account_info(
        creds_dict, scopes=SCOPES
    )
    service = build("sheets", "v4", credentials=creds)
    return service.spreadsheets()

# ── Auth ──────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "sld-billing-secret-2024")
security = HTTPBearer()

USERS = {
    "owner": {"password": os.getenv("OWNER_PASSWORD", "owner123"), "role": "owner"},
    "worker": {"password": os.getenv("WORKER_PASSWORD", "worker123"), "role": "worker"},
}

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    role: str
    username: str

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/api/login", response_model=Token)
def login(req: LoginRequest):
    user = USERS.get(req.username)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = jwt.encode(
        {"username": req.username, "role": user["role"]},
        SECRET_KEY, algorithm="HS256"
    )
    return {"access_token": token, "role": user["role"], "username": req.username}

# ── Models ────────────────────────────────────────────
class BillItem(BaseModel):
    item_name: str
    unit: str
    qty: float
    rate: float
    amount: float

class Bill(BaseModel):
    customer_name: str
    customer_phone: str
    items: List[BillItem]
    subtotal: float
    gst_enabled: bool
    gst_rate: float = 18.0
    gst_amount: float = 0.0
    discount_enabled: bool = False
    discount_amount: float = 0.0
    advance_amount: float = 0.0
    grand_total: float
    payment_status: str  # paid / credit / partial
    payment_method: str  # cash / upi / credit
    upi_transaction_id: Optional[str] = None
    notes: Optional[str] = None

class ReturnItem(BaseModel):
    item_name: str
    qty: float
    rate: float
    amount: float

class ReturnBill(BaseModel):
    original_bill_id: str
    items: List[ReturnItem]
    return_amount: float
    reason: Optional[str] = None

class NewItemRequest(BaseModel):
    item_name: str
    unit: str
    price: float

class PriceAdjustRequest(BaseModel):
    tab_name: str
    adjustment_type: str  # percentage / fixed
    adjustment_value: float  # e.g. 10 for 10%

# ── Bill Number Generator ──────────────────────────────
def generate_bill_number():
    today = datetime.now()
    prefix = f"SLD{today.strftime('%y%m')}"
    result = supabase.table("bills").select("bill_number").ilike(
        "bill_number", f"{prefix}%"
    ).order("bill_number", desc=True).limit(1).execute()
    if result.data:
        last = result.data[0]["bill_number"]
        seq = int(last[-4:]) + 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"

# ── Google Sheets: Search Products ────────────────────
@app.get("/api/products/search")
def search_products(q: str, user=Depends(verify_token)):
    if not q or len(q) < 2:
        return []
    sheets = get_sheets_service()
    tabs = [
        "PVC", "CPVC", "UPVC", "SWR Drainage", "GI & Brass",
        "Motors & Pumps", "Water Tanks", "Sanitary Ware",
        "Taps & Valves", "Column Pipes", "Solvents",
        "Miscellaneous", "New Items"
    ]
    results = []
    q_lower = q.lower()
    for tab in tabs:
        try:
            resp = sheets.values().get(
                spreadsheetId=SHEET_ID,
                range=f"'{tab}'!A4:D1000"
            ).execute()
            rows = resp.get("values", [])
            for row in rows:
                if len(row) >= 3:
                    item_name = row[1] if len(row) > 1 else ""
                    unit = row[2] if len(row) > 2 else ""
                    price_raw = row[3] if len(row) > 3 else "0"
                    try:
                        price = float(str(price_raw).replace(",", "").strip())
                    except:
                        price = 0.0
                    if q_lower in item_name.lower() and item_name not in ["—", ""] and price > 0:
                        results.append({
                            "item_name": item_name,
                            "unit": unit,
                            "price": price,
                            "tab": tab
                        })
        except:
            continue
    return results[:20]  # Max 20 results

# ── Google Sheets: Add New Item to "New Items" tab ────
@app.post("/api/products/new")
def add_new_item(item: NewItemRequest, user=Depends(verify_token)):
    sheets = get_sheets_service()
    try:
        resp = sheets.values().get(
            spreadsheetId=SHEET_ID,
            range="'New Items'!A:A"
        ).execute()
        rows = resp.get("values", [])
        next_row = len(rows) + 1
        sno = next_row - 3  # offset for headers
        sheets.values().append(
            spreadsheetId=SHEET_ID,
            range="'New Items'!A:D",
            valueInputOption="USER_ENTERED",
            body={"values": [[sno, item.item_name, item.unit, item.price]]}
        ).execute()
        return {"message": "Item added to New Items tab", "item": item.item_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Price Adjustment ───────────────────────────────────
@app.post("/api/products/adjust-price")
def adjust_prices(req: PriceAdjustRequest, user=Depends(verify_token)):
    if user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Owner access only")
    sheets = get_sheets_service()
    try:
        resp = sheets.values().get(
            spreadsheetId=SHEET_ID,
            range=f"'{req.tab_name}'!A4:D1000"
        ).execute()
        rows = resp.get("values", [])
        updates = []
        for i, row in enumerate(rows):
            if len(row) >= 4:
                try:
                    old_price = float(str(row[3]).replace(",", "").strip())
                    if old_price > 0:
                        if req.adjustment_type == "percentage":
                            new_price = round(old_price * (1 + req.adjustment_value / 100), 2)
                        else:
                            new_price = round(old_price + req.adjustment_value, 2)
                        actual_row = i + 4
                        updates.append({
                            "range": f"'{req.tab_name}'!D{actual_row}",
                            "values": [[new_price]]
                        })
                except:
                    continue
        if updates:
            sheets.values().batchUpdate(
                spreadsheetId=SHEET_ID,
                body={"valueInputOption": "USER_ENTERED", "data": updates}
            ).execute()
        return {"message": f"Updated {len(updates)} prices in {req.tab_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Bills CRUD ─────────────────────────────────────────
@app.post("/api/bills")
def create_bill(bill: Bill, user=Depends(verify_token)):
    bill_number = generate_bill_number()
    now = datetime.now().isoformat()
    data = {
        "bill_number": bill_number,
        "created_at": now,
        "customer_name": bill.customer_name,
        "customer_phone": bill.customer_phone,
        "items": [item.dict() for item in bill.items],
        "subtotal": bill.subtotal,
        "gst_enabled": bill.gst_enabled,
        "gst_rate": bill.gst_rate,
        "gst_amount": bill.gst_amount,
        "discount_enabled": bill.discount_enabled,
        "discount_amount": bill.discount_amount,
        "advance_amount": bill.advance_amount,
        "grand_total": bill.grand_total,
        "payment_status": bill.payment_status,
        "payment_method": bill.payment_method,
        "upi_transaction_id": bill.upi_transaction_id,
        "notes": bill.notes,
        "created_by": user["username"],
        "is_pinned": True,
        "return_amount": 0.0,
        "final_amount": bill.grand_total
    }
    result = supabase.table("bills").insert(data).execute()
    # Upsert customer
    existing = supabase.table("customers").select("*").eq(
        "phone", bill.customer_phone).execute()
    if existing.data:
        cust = existing.data[0]
        supabase.table("customers").update({
            "total_purchases": cust["total_purchases"] + bill.grand_total,
            "outstanding_credit": cust["outstanding_credit"] + (
                bill.grand_total if bill.payment_status == "credit" else 0
            ),
            "bill_count": cust["bill_count"] + 1,
            "last_purchase": now
        }).eq("phone", bill.customer_phone).execute()
    else:
        supabase.table("customers").insert({
            "name": bill.customer_name,
            "phone": bill.customer_phone,
            "total_purchases": bill.grand_total,
            "outstanding_credit": bill.grand_total if bill.payment_status == "credit" else 0,
            "bill_count": 1,
            "last_purchase": now
        }).execute()
    if bill.payment_status == "credit":
        supabase.table("credit_reminders").insert({
            "bill_id": result.data[0]["id"],
            "bill_number": bill_number,
            "customer_name": bill.customer_name,
            "customer_phone": bill.customer_phone,
            "amount": bill.grand_total,
            "reminder_count": 0,
            "status": "active",
            "created_at": now
        }).execute()
    return {"bill_number": bill_number, "id": result.data[0]["id"]}

@app.get("/api/bills")
def get_bills(
    status: Optional[str] = None,
    search: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user=Depends(verify_token)
):
    query = supabase.table("bills").select("*")
    if status:
        query = query.eq("payment_status", status)
    if search:
        query = query.or_(
            f"customer_name.ilike.%{search}%,bill_number.ilike.%{search}%,customer_phone.ilike.%{search}%"
        )
    if from_date:
        query = query.gte("created_at", from_date)
    if to_date:
        query = query.lte("created_at", to_date)
    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return result.data

@app.get("/api/bills/pinned")
def get_pinned_bills(user=Depends(verify_token)):
    result = supabase.table("bills").select("*").eq(
        "is_pinned", True
    ).order("created_at", desc=True).limit(20).execute()
    return result.data

@app.get("/api/bills/{bill_id}")
def get_bill(bill_id: str, user=Depends(verify_token)):
    result = supabase.table("bills").select("*").eq("id", bill_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Bill not found")
    return result.data[0]

@app.patch("/api/bills/{bill_id}/pin")
def toggle_pin(bill_id: str, pinned: bool, user=Depends(verify_token)):
    supabase.table("bills").update({"is_pinned": pinned}).eq("id", bill_id).execute()
    return {"message": "Updated"}

@app.patch("/api/bills/{bill_id}/payment")
def update_payment(bill_id: str, payment_status: str, payment_method: str,
                   upi_id: Optional[str] = None, user=Depends(verify_token)):
    supabase.table("bills").update({
        "payment_status": payment_status,
        "payment_method": payment_method,
        "upi_transaction_id": upi_id,
        "paid_at": datetime.now().isoformat() if payment_status == "paid" else None
    }).eq("id", bill_id).execute()
    if payment_status == "paid":
        supabase.table("credit_reminders").update(
            {"status": "stopped"}
        ).eq("bill_id", bill_id).execute()
    return {"message": "Payment updated"}

@app.delete("/api/bills/{bill_id}")
def delete_bill(bill_id: str, user=Depends(verify_token)):
    if user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Owner access only")
    supabase.table("bills").delete().eq("id", bill_id).execute()
    return {"message": "Bill deleted"}

# ── Return Bills ───────────────────────────────────────
@app.post("/api/bills/{bill_id}/return")
def create_return(bill_id: str, ret: ReturnBill, user=Depends(verify_token)):
    original = supabase.table("bills").select("*").eq("id", bill_id).execute()
    if not original.data:
        raise HTTPException(status_code=404, detail="Original bill not found")
    orig = original.data[0]
    now = datetime.now().isoformat()
    new_final = orig["final_amount"] - ret.return_amount
    return_data = {
        "original_bill_id": bill_id,
        "bill_number": orig["bill_number"],
        "customer_name": orig["customer_name"],
        "customer_phone": orig["customer_phone"],
        "items": [item.dict() for item in ret.items],
        "return_amount": ret.return_amount,
        "reason": ret.reason,
        "created_at": now
    }
    supabase.table("return_bills").insert(return_data).execute()
    supabase.table("bills").update({
        "return_amount": orig.get("return_amount", 0) + ret.return_amount,
        "final_amount": new_final
    }).eq("id", bill_id).execute()
    return {"message": "Return bill created", "new_final_amount": new_final}

@app.get("/api/bills/{bill_id}/returns")
def get_returns(bill_id: str, user=Depends(verify_token)):
    result = supabase.table("return_bills").select("*").eq(
        "original_bill_id", bill_id
    ).execute()
    return result.data

# ── Dashboard Stats ────────────────────────────────────
@app.get("/api/dashboard")
def get_dashboard(user=Depends(verify_token)):
    today = date.today().isoformat()
    # Today's bills
    today_bills = supabase.table("bills").select("*").gte(
        "created_at", today
    ).execute()
    today_data = today_bills.data or []
    today_sales = sum(b["grand_total"] for b in today_data)
    today_count = len(today_data)
    # Credit pending
    credit_bills = supabase.table("bills").select("*").eq(
        "payment_status", "credit"
    ).execute()
    credit_data = credit_bills.data or []
    total_credit = sum(b["final_amount"] for b in credit_data)
    # Pinned bills
    pinned = supabase.table("bills").select("*").eq(
        "is_pinned", True
    ).order("created_at", desc=True).limit(10).execute()
    return {
        "today_sales": today_sales,
        "today_bill_count": today_count,
        "total_credit_pending": total_credit,
        "credit_bill_count": len(credit_data),
        "pinned_bills": pinned.data or []
    }

# ── Reports ────────────────────────────────────────────
@app.get("/api/reports/summary")
def get_report(period: str = "monthly", user=Depends(verify_token)):
    if user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Owner access only")
    from datetime import timedelta
    now = datetime.now()
    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0).isoformat()
    elif period == "weekly":
        start = (now - timedelta(days=7)).isoformat()
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0).isoformat()
    bills = supabase.table("bills").select("*").gte(
        "created_at", start
    ).execute()
    data = bills.data or []
    total_revenue = sum(b["grand_total"] for b in data)
    total_gst = sum(b.get("gst_amount", 0) for b in data)
    paid_count = len([b for b in data if b["payment_status"] == "paid"])
    credit_count = len([b for b in data if b["payment_status"] == "credit"])
    # Top items
    item_sales = {}
    for bill in data:
        for item in bill.get("items", []):
            name = item["item_name"]
            item_sales[name] = item_sales.get(name, 0) + item["amount"]
    top_items = sorted(item_sales.items(), key=lambda x: x[1], reverse=True)[:10]
    return {
        "period": period,
        "total_revenue": total_revenue,
        "total_gst_collected": total_gst,
        "bill_count": len(data),
        "paid_count": paid_count,
        "credit_count": credit_count,
        "top_items": [{"name": k, "amount": v} for k, v in top_items]
    }

# ── Customers ──────────────────────────────────────────
@app.get("/api/customers")
def get_customers(search: Optional[str] = None, user=Depends(verify_token)):
    query = supabase.table("customers").select("*")
    if search:
        query = query.or_(f"name.ilike.%{search}%,phone.ilike.%{search}%")
    result = query.order("last_purchase", desc=True).execute()
    return result.data

@app.get("/api/customers/{phone}/bills")
def get_customer_bills(phone: str, user=Depends(verify_token)):
    result = supabase.table("bills").select("*").eq(
        "customer_phone", phone
    ).order("created_at", desc=True).execute()
    return result.data

# ── Credit Reminders ───────────────────────────────────
@app.get("/api/credit-reminders")
def get_reminders(user=Depends(verify_token)):
    result = supabase.table("credit_reminders").select("*").eq(
        "status", "active"
    ).order("created_at", desc=True).execute()
    return result.data

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SLD Billing Software"}
