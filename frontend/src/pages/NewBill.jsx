import { useState, useRef, useCallback, useEffect } from "react";
import { searchProducts, createBill, addNewItem, formatINR } from "../api";
import BillPrint from "../components/BillPrint";

const EMPTY_ITEM = { item_name: "", unit: "", qty: 1, rate: 0, amount: 0 };

export default function NewBill({ token }) {
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(18);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountAmt, setDiscountAmt] = useState(0);
  const [advanceAmt, setAdvanceAmt] = useState(0);
  const [payStatus, setPayStatus] = useState("credit");
  const [payMethod, setPayMethod] = useState("cash");
  const [searchResults, setSearchResults] = useState([]);
  const [searchIdx, setSearchIdx] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [editingRate, setEditingRate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedBill, setSavedBill] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemData, setNewItemData] = useState({ item_name: "", unit: "Per Piece", price: "" });
  const [msg, setMsg] = useState("");
  const inputRefs = useRef({});
  const debounceRef = useRef(null);

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const gstAmount = gstEnabled ? (subtotal * gstRate) / 100 : 0;
  const discount = discountEnabled ? parseFloat(discountAmt) || 0 : 0;
  const advance = parseFloat(advanceAmt) || 0;
  const grandTotal = subtotal + gstAmount - discount - advance;

  const updateItem = (idx, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "qty" || field === "rate") {
        const qty = parseFloat(field === "qty" ? value : updated[idx].qty) || 0;
        const rate = parseFloat(field === "rate" ? value : updated[idx].rate) || 0;
        updated[idx].amount = parseFloat((qty * rate).toFixed(2));
      }
      return updated;
    });
  };

  const handleSearch = useCallback((idx, q, inputEl) => {
    updateItem(idx, "item_name", q);
    setSearchIdx(idx);
    clearTimeout(debounceRef.current);

    // Calculate dropdown position from input element
    if (inputEl) {
      const rect = inputEl.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: rect.width + 200
      });
    }

    if (q.length < 1) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchProducts(q, token);
        setSearchResults(res);
      } catch { setSearchResults([]); }
    }, 250);
  }, [token]);

  const selectProduct = (idx, product) => {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        item_name: product.item_name,
        unit: product.unit,
        rate: product.price,
        amount: parseFloat((updated[idx].qty * product.price).toFixed(2))
      };
      return updated;
    });
    setSearchResults([]);
    setSearchIdx(null);
    // Focus qty input of same row after selecting
    setTimeout(() => {
      const qtyInput = document.getElementById(`qty-${idx}`);
      if (qtyInput) qtyInput.focus();
    }, 50);
  };

  const addRow = () => {
    setItems(prev => [...prev, { ...EMPTY_ITEM }]);
    // Focus new search input after adding row
    setTimeout(() => {
      const newIdx = items.length;
      const el = inputRefs.current[newIdx];
      if (el) el.focus();
    }, 80);
  };

  const removeRow = (idx) => {
    if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Escape") { setSearchResults([]); setSearchIdx(null); }
    // Enter: if dropdown open, do nothing (user selects from list)
    // Enter: if dropdown closed, move to qty field
    if (e.key === "Enter" && searchResults.length === 0) {
      e.preventDefault();
      const qtyEl = document.getElementById(`qty-${idx}`);
      if (qtyEl) qtyEl.focus();
    }
  };

  const handleQtyKeyDown = (e, idx) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Move to next row's search input, or add new row
      const nextEl = inputRefs.current[idx + 1];
      if (nextEl) {
        nextEl.focus();
      } else {
        addRow();
      }
    }
  };

  const handleSave = async () => {
    if (!customer.name || !customer.phone) { setMsg("Please enter customer name and phone"); return; }
    const validItems = items.filter(i => i.item_name && i.rate > 0);
    if (validItems.length === 0) { setMsg("Please add at least one item with price"); return; }
    setSaving(true); setMsg("");
    try {
      const bill = {
        customer_name: customer.name, customer_phone: customer.phone,
        items: validItems, subtotal, gst_enabled: gstEnabled, gst_rate: gstRate,
        gst_amount: gstAmount, discount_enabled: discountEnabled, discount_amount: discount,
        advance_amount: advance, grand_total: Math.max(0, grandTotal),
        payment_status: payStatus, payment_method: payMethod
      };
      const result = await createBill(bill, token);
      setSavedBill({ ...bill, bill_number: result.bill_number, id: result.id, created_at: new Date().toISOString() });
      setMsg(`Bill ${result.bill_number} saved successfully!`);
      setShowPrint(true);
    } catch (e) { setMsg(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleNewBill = () => {
    setCustomer({ name: "", phone: "" });
    setItems([{ ...EMPTY_ITEM }]);
    setGstEnabled(false); setDiscountEnabled(false);
    setDiscountAmt(0); setAdvanceAmt(0);
    setPayStatus("credit"); setPayMethod("cash");
    setSavedBill(null); setShowPrint(false); setMsg("");
    setTimeout(() => { const el = document.getElementById("cust-name"); if (el) el.focus(); }, 50);
  };

  const handleAddNewItem = async () => {
    if (!newItemData.item_name || !newItemData.price) return;
    try {
      await addNewItem({ item_name: newItemData.item_name, unit: newItemData.unit, price: parseFloat(newItemData.price) }, token);
      setMsg("New item added to price list!");
      setShowNewItemModal(false);
      setNewItemData({ item_name: "", unit: "Per Piece", price: "" });
    } catch { setMsg("Failed to add item"); }
  };

  const btn = (color, active) => ({
    padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: `2px solid ${color}`,
    background: active ? color : "#fff", color: active ? "#fff" : color
  });

  const inp = { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };

  if (showPrint && savedBill) return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button onClick={() => window.print()} style={{ background: "#1A4480", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Print Bill</button>
        <button onClick={handleNewBill} style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>New Bill</button>
      </div>
      <BillPrint bill={savedBill} />
    </div>
  );

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0B1F3A", margin: 0 }}>New Bill</h1>
        <button onClick={() => setShowNewItemModal(true)}
          style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add New Item to Price List
        </button>
      </div>

      {/* Customer */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Customer Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Customer Name (Sri / M/s)</label>
            <input id="cust-name" value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))}
              placeholder="Enter customer name" style={inp}
              onKeyDown={e => e.key === "Enter" && document.getElementById("cust-phone")?.focus()} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Phone Number</label>
            <input id="cust-phone" value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))}
              placeholder="Enter phone number" style={inp}
              onKeyDown={e => e.key === "Enter" && inputRefs.current[0]?.focus()} />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Items</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#1A4480", color: "#fff" }}>
              {["S.No", "Item Name", "Unit", "Qty", "Rate (Rs.)", "Edit Rate", "Amount (Rs.)", ""].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1A4480", width: 46 }}>{idx + 1}</td>
                <td style={{ padding: "6px 8px", minWidth: 240 }}>
                  <input
                    ref={el => inputRefs.current[idx] = el}
                    value={item.item_name}
                    onChange={e => handleSearch(idx, e.target.value, e.target)}
                    onKeyDown={e => handleKeyDown(e, idx)}
                    placeholder="Search product..."
                    style={{ ...inp, padding: "7px 10px" }}
                    onFocus={e => {
                      if (item.item_name.length >= 1) {
                        handleSearch(idx, item.item_name, e.target);
                      }
                      setSearchIdx(idx);
                    }}
                    onBlur={() => setTimeout(() => { setSearchResults([]); setSearchIdx(null); }, 200)}
                    autoComplete="off"
                  />
                </td>
                <td style={{ padding: "8px 10px", color: "#64748b", whiteSpace: "nowrap", fontSize: 13 }}>{item.unit || "—"}</td>
                <td style={{ padding: "6px 8px", width: 110 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <button onMouseDown={() => updateItem(idx, "qty", Math.max(1, (parseFloat(item.qty) || 1) - 1))}
                      style={{ width: 26, height: 26, borderRadius: 5, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>-</button>
                    <input
                      id={`qty-${idx}`}
                      value={item.qty}
                      onChange={e => updateItem(idx, "qty", e.target.value)}
                      onKeyDown={e => handleQtyKeyDown(e, idx)}
                      style={{ width: 46, padding: "5px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 14, textAlign: "center", outline: "none" }}
                    />
                    <button onMouseDown={() => updateItem(idx, "qty", (parseFloat(item.qty) || 0) + 1)}
                      style={{ width: 26, height: 26, borderRadius: 5, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>+</button>
                  </div>
                </td>
                <td style={{ padding: "8px 10px", fontWeight: 700 }}>Rs.{formatINR(item.rate)}</td>
                <td style={{ padding: "6px 8px" }}>
                  {editingRate === idx ? (
                    <input autoFocus value={item.rate} onChange={e => updateItem(idx, "rate", e.target.value)}
                      onBlur={() => setEditingRate(null)}
                      onKeyDown={e => e.key === "Enter" && setEditingRate(null)}
                      style={{ width: 80, padding: "5px 7px", border: "2px solid #f59e0b", borderRadius: 6, fontSize: 13, outline: "none" }} />
                  ) : (
                    <button onClick={() => setEditingRate(idx)}
                      style={{ background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: "#92400e", fontWeight: 600 }}>
                      Edit
                    </button>
                  )}
                </td>
                <td style={{ padding: "8px 10px", fontWeight: 700, color: "#059669" }}>Rs.{formatINR(item.amount)}</td>
                <td style={{ padding: "6px 8px" }}>
                  <button onClick={() => removeRow(idx)}
                    style={{ background: "#fee2e2", border: "none", borderRadius: 6, width: 26, height: 26, cursor: "pointer", color: "#dc2626", fontSize: 15, fontWeight: 700 }}>x</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addRow}
          style={{ marginTop: 10, background: "#eff6ff", border: "2px dashed #1A4480", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, color: "#1A4480", cursor: "pointer", width: "100%" }}>
          + Add Item &nbsp;(or press Enter after entering quantity)
        </button>
      </div>

      {/* DROPDOWN — fixed position so it appears on screen regardless of scroll */}
      {searchIdx !== null && searchResults.length > 0 && (
        <div style={{
          position: "fixed",
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: Math.max(dropdownPos.width, 400),
          background: "#fff",
          border: "2px solid #1A4480",
          borderRadius: 10,
          zIndex: 99999,
          maxHeight: 320,
          overflowY: "auto",
          boxShadow: "0 12px 40px rgba(0,0,0,0.20)"
        }}>
          <div style={{ padding: "8px 14px", background: "#1A4480", color: "#fff", fontSize: 12, fontWeight: 600 }}>
            {searchResults.length} item(s) found — click to select
          </div>
          {searchResults.map((r, ri) => (
            <div key={ri}
              onMouseDown={(e) => { e.preventDefault(); selectProduct(searchIdx, r); }}
              style={{
                padding: "11px 14px", cursor: "pointer",
                borderBottom: "1px solid #f1f5f9",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "#fff"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#0B1F3A" }}>{r.item_name}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{r.tab} &bull; {r.unit}</div>
              </div>
              <div style={{ fontWeight: 800, color: r.price > 0 ? "#1A4480" : "#94a3b8", fontSize: 15, flexShrink: 0, marginLeft: 16 }}>
                {r.price > 0 ? `Rs.${formatINR(r.price)}` : "No price"}
              </div>
            </div>
          ))}
          <div
            onMouseDown={() => { setNewItemData(p => ({ ...p, item_name: items[searchIdx]?.item_name || "" })); setShowNewItemModal(true); setSearchResults([]); }}
            style={{ padding: "10px 14px", cursor: "pointer", background: "#fffbeb", color: "#92400e", fontWeight: 600, fontSize: 12, borderTop: "2px solid #fde68a" }}>
            + Not found? Add to price list
          </div>
        </div>
      )}

      {/* Options & Totals */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Options</h3>
            {[
              { label: "GST", enabled: gstEnabled, setEnabled: setGstEnabled, color: "#059669",
                extra: gstEnabled && (
                  <select value={gstRate} onChange={e => setGstRate(Number(e.target.value))}
                    style={{ padding: "4px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13, outline: "none" }}>
                    {[5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                )
              },
              { label: "Discount", enabled: discountEnabled, setEnabled: setDiscountEnabled, color: "#f59e0b",
                extra: discountEnabled && (
                  <input type="number" value={discountAmt} onChange={e => setDiscountAmt(e.target.value)}
                    placeholder="Rs.0" style={{ width: 80, padding: "4px 8px", border: "1.5px solid #f59e0b", borderRadius: 6, fontSize: 13, outline: "none" }} />
                )
              }
            ].map(({ label, enabled, setEnabled, color, extra }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: 14, background: "#f8fafc", borderRadius: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#374151", flex: 1 }}>{label}</span>
                <button onClick={() => setEnabled(!enabled)}
                  style={{ background: enabled ? color : "#e2e8f0", border: "none", borderRadius: 20, width: 48, height: 26, cursor: "pointer", position: "relative", transition: "all 0.2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 3, left: enabled ? 24 : 3, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "all 0.2s" }} />
                </button>
                <span style={{ fontSize: 12, color: enabled ? color : "#94a3b8", fontWeight: 600, minWidth: 24 }}>{enabled ? "ON" : "OFF"}</span>
                {extra}
              </div>
            ))}
            <div style={{ padding: 14, background: "#f8fafc", borderRadius: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Advance Payment (Rs.)</label>
              <input type="number" value={advanceAmt} onChange={e => setAdvanceAmt(e.target.value)}
                placeholder="0" style={{ ...inp, padding: "8px 12px" }} />
            </div>
          </div>
          <div>
            <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Bill Total</h3>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18 }}>
              {[
                { label: "Subtotal", value: subtotal, color: "#374151" },
                ...(gstEnabled ? [{ label: `GST (${gstRate}%)`, value: gstAmount, color: "#6366f1" }] : []),
                ...(discountEnabled && discount > 0 ? [{ label: "Discount", value: -discount, color: "#f59e0b" }] : []),
                ...(advance > 0 ? [{ label: "Advance Paid", value: -advance, color: "#059669" }] : []),
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>
                    {row.value < 0 ? "-" : ""}Rs.{formatINR(Math.abs(row.value))}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0" }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: "#0B1F3A" }}>GRAND TOTAL</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: "#1A4480" }}>Rs.{formatINR(Math.max(0, grandTotal))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Payment</h3>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Status</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["paid","#059669","Paid"],["credit","#dc2626","Credit"],["partial","#f59e0b","Partial"]].map(([v,c,l]) => (
                <button key={v} onClick={() => setPayStatus(v)} style={btn(c, payStatus === v)}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Method</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["cash","#374151","Cash"],["upi","#6366f1","UPI"],["credit","#dc2626","Credit"]].map(([v,c,l]) => (
                <button key={v} onClick={() => setPayMethod(v)} style={btn(c, payMethod === v)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div style={{
          background: msg.includes("Error") || msg.includes("Please") ? "#fee2e2" : "#dcfce7",
          color: msg.includes("Error") || msg.includes("Please") ? "#dc2626" : "#166534",
          padding: "11px 16px", borderRadius: 8, marginBottom: 14, fontWeight: 600, fontSize: 13
        }}>{msg}</div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ background: "#1A4480", color: "#fff", border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving..." : "Save Bill"}
        </button>
        <button onClick={handleNewBill}
          style={{ background: "#fff", color: "#374151", border: "2px solid #e2e8f0", borderRadius: 10, padding: "13px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          New Bill
        </button>
        <button onClick={() => setItems([{ ...EMPTY_ITEM }])}
          style={{ background: "#fff", color: "#dc2626", border: "2px solid #dc2626", borderRadius: 10, padding: "13px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Clear
        </button>
      </div>

      {/* New Item Modal */}
      {showNewItemModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 420 }}>
            <h3 style={{ margin: "0 0 18px", color: "#0B1F3A", fontSize: 17, fontWeight: 800 }}>Add New Item to Price List</h3>
            {[
              { label: "Item Name", key: "item_name", placeholder: '3" PVC Special Coupler' },
              { label: "Unit", key: "unit", placeholder: "Per Piece / Per Meter" },
              { label: "Price (Rs.)", key: "price", placeholder: "Enter price", type: "number" }
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{f.label}</label>
                <input type={f.type || "text"} value={newItemData[f.key]}
                  onChange={e => setNewItemData(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} style={inp} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleAddNewItem}
                style={{ flex: 1, background: "#1A4480", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Add to Price List
              </button>
              <button onClick={() => setShowNewItemModal(false)}
                style={{ background: "#fff", color: "#374151", border: "2px solid #e2e8f0", borderRadius: 8, padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
