import { useState, useEffect } from "react";
import { getBills, deleteBill, updatePayment, createReturn, getReturns, formatINR, formatDate } from "../api";
import BillPrint from "../components/BillPrint";

export default function BillsHistory({ token, role }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [existingReturns, setExistingReturns] = useState([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      setBills(await getBills(params, token));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const handleView = async (bill) => {
    setSelectedBill(bill);
    setShowPrint(true);
    setShowReturn(false);
  };

  const handleReturnView = async (bill) => {
    setSelectedBill(bill);
    const items = (bill.items || []).map(i => ({ ...i, return_qty: 0 }));
    setReturnItems(items);
    const rets = await getReturns(bill.id, token);
    setExistingReturns(rets);
    setShowReturn(true);
    setShowPrint(false);
  };

  const handleMarkPaid = async (bill) => {
    if (!window.confirm(`Mark bill ${bill.bill_number} as PAID?`)) return;
    try {
      await updatePayment(bill.id, "paid", "cash", null, token);
      setMsg(`✅ Bill ${bill.bill_number} marked as Paid!`);
      load();
    } catch (e) { setMsg("❌ Failed to update payment"); }
  };

  const handleDelete = async (bill) => {
    if (!window.confirm(`Delete bill ${bill.bill_number}? This cannot be undone.`)) return;
    try {
      await deleteBill(bill.id, token);
      setMsg(`✅ Bill ${bill.bill_number} deleted`);
      load();
    } catch (e) { setMsg("❌ Failed to delete bill"); }
  };

  const handleSubmitReturn = async () => {
    const returnedItems = returnItems
      .filter(i => i.return_qty > 0)
      .map(i => ({ item_name: i.item_name, qty: i.return_qty, rate: i.rate, amount: i.return_qty * i.rate }));
    if (returnedItems.length === 0) { setMsg("⚠️ Select at least one item to return"); return; }
    const returnAmount = returnedItems.reduce((s, i) => s + i.amount, 0);
    try {
      await createReturn(selectedBill.id, { original_bill_id: selectedBill.id, items: returnedItems, return_amount: returnAmount }, token);
      setMsg(`✅ Return bill created. ₹${formatINR(returnAmount)} deducted.`);
      setShowReturn(false);
      load();
    } catch (e) { setMsg("❌ Failed to create return bill"); }
  };

  const statusBadge = (s) => {
    const map = { paid: ["#dcfce7", "#166534"], credit: ["#fee2e2", "#dc2626"], partial: ["#fef9c3", "#92400e"] };
    const [bg, color] = map[s] || ["#f1f5f9", "#475569"];
    return <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 50, fontSize: 12, fontWeight: 600 }}>{s?.toUpperCase()}</span>;
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1F3A", marginBottom: 24 }}>📋 Bills History</h1>

      {msg && <div style={{ background: msg.includes("✅") ? "#dcfce7" : "#fee2e2",
        color: msg.includes("✅") ? "#166534" : "#dc2626", padding: "12px 16px",
        borderRadius: 10, marginBottom: 16, fontWeight: 600 }}>{msg}</div>}

      {/* Filters */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 20,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by customer, phone, bill number..."
          style={{ flex: 2, minWidth: 220, padding: "10px 14px", border: "2px solid #e2e8f0",
            borderRadius: 10, fontSize: 14, outline: "none" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ flex: 1, minWidth: 140, padding: "10px 14px", border: "2px solid #e2e8f0",
            borderRadius: 10, fontSize: 14, outline: "none" }}>
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="credit">Credit/Pending</option>
          <option value="partial">Partial</option>
        </select>
        <button onClick={load} style={{ background: "#1A4480", color: "#fff", border: "none",
          borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          🔄 Refresh
        </button>
      </div>

      {/* Print View */}
      {showPrint && selectedBill && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={() => window.print()}
              style={{ background: "#1A4480", color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>🖨️ Print</button>
            <button onClick={() => setShowPrint(false)}
              style={{ background: "#fff", border: "2px solid #e2e8f0", borderRadius: 8,
                padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>✕ Close</button>
          </div>
          <BillPrint bill={selectedBill} />
        </div>
      )}

      {/* Return Bill View */}
      {showReturn && selectedBill && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", color: "#dc2626", fontSize: 18, fontWeight: 800 }}>
            ↩️ Return Bill — {selectedBill.bill_number}
          </h3>
          {existingReturns.length > 0 && (
            <div style={{ background: "#fee2e2", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>Previous Returns:</div>
              {existingReturns.map((r, i) => (
                <div key={i} style={{ fontSize: 13 }}>
                  Return on {formatDate(r.created_at)} — ₹{formatINR(r.return_amount)}
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 14, color: "#374151", marginBottom: 12, fontWeight: 600 }}>
            Select items to return (enter return quantity):
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#dc2626", color: "#fff" }}>
                {["Item", "Original Qty", "Rate", "Return Qty", "Return Amount"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returnItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#f8fafc" : "#fff" }}>
                  <td style={{ padding: "10px 12px" }}>{item.item_name}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>{item.qty}</td>
                  <td style={{ padding: "10px 12px" }}>₹{formatINR(item.rate)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <input type="number" min={0} max={item.qty}
                      value={item.return_qty || 0}
                      onChange={e => {
                        const updated = [...returnItems];
                        updated[idx].return_qty = Math.min(Number(e.target.value), item.qty);
                        setReturnItems(updated);
                      }}
                      style={{ width: 70, padding: "6px", border: "2px solid #dc2626",
                        borderRadius: 6, fontSize: 14, textAlign: "center", outline: "none" }} />
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#dc2626" }}>
                    ₹{formatINR((item.return_qty || 0) * item.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 16, padding: 16, background: "#fee2e2", borderRadius: 10 }}>
            <strong>Total Return Amount: ₹{formatINR(
              returnItems.reduce((s, i) => s + (i.return_qty || 0) * i.rate, 0)
            )}</strong>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button onClick={handleSubmitReturn}
              style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8,
                padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              ↩️ Create Return Bill
            </button>
            <button onClick={() => setShowReturn(false)}
              style={{ background: "#fff", border: "2px solid #e2e8f0", borderRadius: 8,
                padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Bills Table */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading bills...</div>
        ) : bills.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No bills found</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#1A4480", color: "#fff" }}>
                  {["Bill No", "Customer", "Phone", "Date", "Items", "Total", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bills.map((bill, i) => (
                  <tr key={bill.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff",
                    borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1A4480" }}>{bill.bill_number}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{bill.customer_name}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{bill.customer_phone}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b", whiteSpace: "nowrap" }}>{formatDate(bill.created_at)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{(bill.items || []).length}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700 }}>₹{formatINR(bill.final_amount)}</td>
                    <td style={{ padding: "10px 12px" }}>{statusBadge(bill.payment_status)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => handleView(bill)}
                          style={{ background: "#eff6ff", color: "#1A4480", border: "1.5px solid #1A4480",
                            borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          🖨️ View
                        </button>
                        <button onClick={() => handleReturnView(bill)}
                          style={{ background: "#fee2e2", color: "#dc2626", border: "1.5px solid #dc2626",
                            borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          ↩️ Return
                        </button>
                        {bill.payment_status !== "paid" && (
                          <button onClick={() => handleMarkPaid(bill)}
                            style={{ background: "#dcfce7", color: "#166534", border: "1.5px solid #166534",
                              borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                            ✅ Paid
                          </button>
                        )}
                        {role === "owner" && (
                          <button onClick={() => handleDelete(bill)}
                            style={{ background: "#fee2e2", color: "#dc2626", border: "1.5px solid #dc2626",
                              borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
