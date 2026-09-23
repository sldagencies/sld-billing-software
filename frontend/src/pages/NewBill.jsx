import { useState, useRef, useCallback } from "react";
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
  const [editingRate, setEditingRate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedBill, setSavedBill] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemData, setNewItemData] = useState({ item_name: "", unit: "Per Piece", price: "" });
  const [msg, setMsg] = useState("");
  const [pendingNewItem, setPendingNewItem] = useState("");
  const debounceRef = useRef(null);

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const gstAmount = gstEnabled ? (subtotal * gstRate) / 100 : 0;
  const afterGst = subtotal + gstAmount;
  const discount = discountEnabled ? parseFloat(discountAmt) || 0 : 0;
  const advance = parseFloat(advanceAmt) || 0;
  const grandTotal = afterGst - discount - advance;

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

  const handleSearch = useCallback((idx, q) => {
    updateItem(idx, "item_name", q);
    setSearchIdx(idx);
    clearTimeout(debounceRef.current);
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
  };

  const addRow = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeRow = (idx) => { if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== idx)); };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Enter") { e.preventDefault(); addRow(); }
    if (e.key === "Escape") { setSearchResults([]); setSearchIdx(null); }
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
        advance_amount: advance, grand_total: grandTotal,
        payment_status: payStatus, payment_method: payMethod
      };
      const result = await createBill(bill, token);
      setSavedBill({ ...bill, bill_number: result.bill_number, id: result.id, created_at: new Date().toISOString() });
      setMsg(`Bill ${result.bill_number} saved!`);
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
    background: active ? color : "#fff", color: active ? "#fff" : color, transition: "all 0.15s"
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0B1F3A", margin: 0 }}>New Bill</h1>
        <button onClick={() => { setPendingNewItem(""); setShowNewItemModal(true); }}
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
            <input value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Enter customer name" style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Phone Number</label>
            <input value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="Enter phone number" style={inp} />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Items</h3>
        <div style={{ overflowX: "auto" }}>
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
                  <td style={{ padding: "6px 8px", position: "relative", minWidth: 260 }}>
                    <input
                      value={item.item_name}
                      onChange={e => handleSearch(idx, e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx)}
                      placeholder="Search product..."
                      style={{ ...inp, padding: "7px 10px" }}
                      onFocus={() => { if (item.item_name.length >= 1) setSearchIdx(idx); }}
                      onBlur={() => setTimeout(() => { setSearchResults([]); setSearchIdx(null); }, 180)}
                    />
                    {/* DROPDOWN — shows ALL results */}
                    {searchIdx === idx && searchResults.length > 0 && (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, right: 0,
                        background: "#fff", border: "2px solid #1A4480", borderRadius: 10,
                        zIndex: 9999, maxHeight: 360, overflowY: "auto",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.18)"
                      }}>
                        {searchResults.map((r, ri) => (
                          <div key={ri} onMouseDown={() => selectProduct(idx, r)}
                            style={{
                              padding: "10px 14px", cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                              display: "flex", justifyContent: "space-between", alignItems: "center"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: "#0B1F3A" }}>{r.item_name}</div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>{r.tab} &bull; {r.unit}</div>
                            </div>
                            <div style={{ fontWeight: 800, color: r.price > 0 ? "#1A4480" : "#94a3b8", fontSize: 14, flexShrink: 0, marginLeft: 12 }}>
                              {r.price > 0 ? `Rs.${formatINR(r.price)}` : "No price"}
                            </div>
                          </div>
                        ))}
                        {/* Add new item option */}
                        <div onMouseDown={() => { setNewItemData(p => ({ ...p, item_name: item.item_name })); setShowNewItemModal(true); setSearchResults([]); }}
                          style={{ padding: "10px 14px", cursor: "pointer", background: "#fffbeb", color: "#92400e", fontWeight: 600, fontSize: 12, borderTop: "2px solid #fde68a" }}>
                          + Not found? Add "{item.item_name}" to price list
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", color: "#64748b", whiteSpace: "nowrap", fontSize: 13 }}>{item.unit}</td>
                  <td style={{ padding: "6px 8px", width: 100 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <button onMouseDown={() => updateItem(idx, "qty", Math.max(1, (parseFloat(item.qty) || 1) - 1))}
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 700, fontSize: 16, lineHeight: 1 }}>-</button>
                      <input value={item.qty} onChange={e => updateItem(idx, "qty", e.target.value)}
                        style={{ width: 44, padding: "5px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 14, textAlign: "center", outline: "none" }} />
                      <button onMouseDown={() => updateItem(idx, "qty", (parseFloat(item.qty) || 0) + 1)}
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 700, fontSize: 16, lineHeight: 1 }}>+</button>
                    </div>
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>
                    Rs.{formatINR(item.rate)}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    {editingRate === idx ? (
                      <input autoFocus value={item.rate} onChange={e => updateItem(idx, "rate", e.target.value)}
                        onBlur={() => setEditingRate(null)}
                        style={{ width: 80, padding: "5px 7px", border: "2px solid #f59e0b", borderRadius: 6, fontSize: 13, outline: "none" }} />
                    ) : (
                      <button onClick={() => setEditingRate(idx)}
                        style={{ background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: "#92400e", fontWeight: 600 }}>
                        Edit
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#059669", whiteSpace: "nowrap" }}>
                    Rs.{formatINR(item.amount)}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <button onClick={() => removeRow(idx)}
                      style={{ background: "#fee2e2", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", color: "#dc2626", fontSize: 16, fontWeight: 700 }}>x</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addRow}
          style={{ marginTop: 10, background: "#eff6ff", border: "2px dashed #1A4480", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, color: "#1A4480", cursor: "pointer", width: "100%" }}>
          + Add Item &nbsp;(or press Enter in search box)
        </button>
      </div>

      {/* Options & Totals */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Options</h3>
            {/* GST Toggle */}
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
            {/* Advance */}
            <div style={{ padding: 14, background: "#f8fafc", borderRadius: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Advance Payment (Rs.)</label>
              <input type="number" value={advanceAmt} onChange={e => setAdvanceAmt(e.target.value)}
                placeholder="0" style={{ ...inp, padding: "8px 12px" }} />
            </div>
          </div>

          {/* Totals */}
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
        <div style={{ background: msg.includes("Error") || msg.includes("Please") ? "#fee2e2" : "#dcfce7",
          color: msg.includes("Error") || msg.includes("Please") ? "#dc2626" : "#166534",
          padding: "11px 16px", borderRadius: 8, marginBottom: 14, fontWeight: 600, fontSize: 13 }}>
          {msg}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
            <h3 style={{ margin: "0 0 18px", color: "#0B1F3A", fontSize: 17, fontWeight: 800 }}>Add New Item to Price List</h3>
            {[
              { label: "Item Name", key: "item_name", placeholder: "e.g. 3\" PVC Special Coupler" },
              { label: "Unit", key: "unit", placeholder: "Per Piece / Per Meter / Per Bundle" },
              { label: "Price (Rs.)", key: "price", placeholder: "Enter price", type: "number" }
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{f.label}</label>
                <input type={f.type || "text"} value={newItemData[f.key]}
                  onChange={e => setNewItemData(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} style={inp} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
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
