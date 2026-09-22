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
  const searchRef = useRef({});
  const debounceRef = useRef(null);

  // Calculations
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
    if (q.length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchProducts(q, token);
        setSearchResults(res);
      } catch { setSearchResults([]); }
    }, 300);
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

  const removeRow = (idx) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Enter") { e.preventDefault(); addRow(); }
  };

  const handleSave = async () => {
    if (!customer.name || !customer.phone) {
      setMsg("⚠️ Please enter customer name and phone"); return;
    }
    const validItems = items.filter(i => i.item_name && i.rate > 0);
    if (validItems.length === 0) {
      setMsg("⚠️ Please add at least one item with price"); return;
    }
    setSaving(true); setMsg("");
    try {
      const bill = {
        customer_name: customer.name,
        customer_phone: customer.phone,
        items: validItems,
        subtotal, gst_enabled: gstEnabled, gst_rate: gstRate, gst_amount: gstAmount,
        discount_enabled: discountEnabled, discount_amount: discount,
        advance_amount: advance, grand_total: grandTotal,
        payment_status: payStatus, payment_method: payMethod
      };
      const result = await createBill(bill, token);
      setSavedBill({ ...bill, bill_number: result.bill_number, id: result.id,
        created_at: new Date().toISOString() });
      setMsg(`✅ Bill ${result.bill_number} saved successfully!`);
      setShowPrint(true);
    } catch (e) {
      setMsg(`❌ Error: ${e.message}`);
    } finally { setSaving(false); }
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
      await addNewItem({
        item_name: newItemData.item_name,
        unit: newItemData.unit,
        price: parseFloat(newItemData.price)
      }, token);
      setMsg("✅ New item added to price list!");
      setShowNewItemModal(false);
      setNewItemData({ item_name: "", unit: "Per Piece", price: "" });
    } catch (e) { setMsg("❌ Failed to add item"); }
  };

  const btnStyle = (color, active) => ({
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: `2px solid ${color}`,
    background: active ? color : "#fff", color: active ? "#fff" : color, transition: "all 0.2s"
  });

  if (showPrint && savedBill) {
    return (
      <div>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => window.print()}
            style={{ background: "#1A4480", color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            🖨️ Print Bill
          </button>
          <button onClick={handleNewBill}
            style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            🔄 New Bill
          </button>
        </div>
        <BillPrint bill={savedBill} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1F3A", margin: 0 }}>➕ New Bill</h1>
        <button onClick={() => setShowNewItemModal(true)}
          style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8,
            padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Add New Item to Price List
        </button>
      </div>

      {/* Customer Section */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0B1F3A", fontSize: 16, fontWeight: 700 }}>
          👤 Customer Details
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { label: "Customer Name (Sri / M/s)", key: "name", placeholder: "Enter customer name" },
            { label: "Phone Number", key: "phone", placeholder: "Enter 10-digit phone" }
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                {f.label}
              </label>
              <input value={customer[f.key]}
                onChange={e => setCustomer(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ width: "100%", padding: "11px 14px", border: "2px solid #e2e8f0",
                  borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "#1A4480"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            </div>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0B1F3A", fontSize: 16, fontWeight: 700 }}>
          📦 Items
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#1A4480", color: "#fff" }}>
                {["S.No", "Item Name", "Unit", "Qty", "Rate (₹)", "Edit Rate", "Amount (₹)", ""].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? "#f8fafc" : "#fff",
                  borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1A4480", width: 50 }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: "8px 12px", position: "relative", minWidth: 240 }}>
                    <input value={item.item_name}
                      onChange={e => handleSearch(idx, e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx)}
                      placeholder="Type to search product..."
                      ref={el => searchRef.current[idx] = el}
                      style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e2e8f0",
                        borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.target.style.borderColor = "#1A4480"}
                      onBlur={e => { e.target.style.borderColor = "#e2e8f0"; setTimeout(() => { setSearchResults([]); setSearchIdx(null); }, 200); }} />
                    {searchIdx === idx && searchResults.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0,
                        background: "#fff", border: "2px solid #1A4480", borderRadius: 10,
                        zIndex: 999, maxHeight: 280, overflowY: "auto",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
                        {searchResults.map((r, ri) => (
                          <div key={ri} onMouseDown={() => selectProduct(idx, r)}
                            style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                              display: "flex", justifyContent: "space-between", alignItems: "center" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.item_name}</div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>{r.tab} • {r.unit}</div>
                            </div>
                            <div style={{ fontWeight: 700, color: "#1A4480", fontSize: 14 }}>₹{r.price}</div>
                          </div>
                        ))}
                        <div onMouseDown={() => { setShowNewItemModal(true); setSearchResults([]); }}
                          style={{ padding: "10px 14px", cursor: "pointer", background: "#fffbeb",
                            color: "#92400e", fontWeight: 600, fontSize: 13, borderTop: "2px solid #fde68a" }}>
                          + Not found? Add "{item.item_name}" to price list
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "8px 12px", color: "#64748b", whiteSpace: "nowrap" }}>{item.unit}</td>
                  <td style={{ padding: "8px 12px", width: 90 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button onMouseDown={() => updateItem(idx, "qty", Math.max(1, (parseFloat(item.qty) || 1) - 1))}
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #e2e8f0",
                          background: "#f8fafc", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>−</button>
                      <input value={item.qty}
                        onChange={e => updateItem(idx, "qty", e.target.value)}
                        style={{ width: 48, padding: "6px", border: "1.5px solid #e2e8f0",
                          borderRadius: 6, fontSize: 14, textAlign: "center", outline: "none" }} />
                      <button onMouseDown={() => updateItem(idx, "qty", (parseFloat(item.qty) || 0) + 1)}
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #e2e8f0",
                          background: "#f8fafc", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>+</button>
                    </div>
                  </td>
                  <td style={{ padding: "8px 12px", fontWeight: 700, whiteSpace: "nowrap" }}>
                    ₹{formatINR(item.rate)}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    {editingRate === idx ? (
                      <input autoFocus value={item.rate}
                        onChange={e => updateItem(idx, "rate", e.target.value)}
                        onBlur={() => setEditingRate(null)}
                        style={{ width: 80, padding: "6px", border: "2px solid #f59e0b",
                          borderRadius: 6, fontSize: 14, outline: "none" }} />
                    ) : (
                      <button onClick={() => setEditingRate(idx)}
                        style={{ background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: 6,
                          padding: "5px 10px", fontSize: 12, cursor: "pointer", color: "#92400e", fontWeight: 600 }}>
                        ✏️ Edit
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#059669", whiteSpace: "nowrap" }}>
                    ₹{formatINR(item.amount)}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <button onClick={() => removeRow(idx)}
                      style={{ background: "#fee2e2", border: "none", borderRadius: 6,
                        width: 28, height: 28, cursor: "pointer", color: "#dc2626", fontSize: 16 }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addRow}
          style={{ marginTop: 12, background: "#eff6ff", border: "2px dashed #1A4480",
            borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600,
            color: "#1A4480", cursor: "pointer", width: "100%" }}>
          ➕ Add Item (or press Enter in item search)
        </button>
      </div>

      {/* Toggles & Totals */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Left — Toggles */}
          <div>
            <h3 style={{ margin: "0 0 16px", color: "#0B1F3A", fontSize: 16, fontWeight: 700 }}>
              ⚙️ Options
            </h3>
            {/* GST */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
              padding: 16, background: "#f8fafc", borderRadius: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#374151", flex: 1 }}>GST</span>
              <button onClick={() => setGstEnabled(!gstEnabled)}
                style={{ background: gstEnabled ? "#059669" : "#e2e8f0", border: "none",
                  borderRadius: 20, width: 52, height: 28, cursor: "pointer", position: "relative",
                  transition: "all 0.3s" }}>
                <div style={{ position: "absolute", top: 3, left: gstEnabled ? 26 : 3,
                  width: 22, height: 22, background: "#fff", borderRadius: "50%", transition: "all 0.3s" }} />
              </button>
              <span style={{ fontSize: 13, color: gstEnabled ? "#059669" : "#94a3b8", fontWeight: 600 }}>
                {gstEnabled ? "ON" : "OFF"}
              </span>
              {gstEnabled && (
                <select value={gstRate} onChange={e => setGstRate(Number(e.target.value))}
                  style={{ padding: "4px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6,
                    fontSize: 13, outline: "none" }}>
                  {[5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              )}
            </div>
            {/* Discount */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
              padding: 16, background: "#f8fafc", borderRadius: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#374151", flex: 1 }}>Discount</span>
              <button onClick={() => setDiscountEnabled(!discountEnabled)}
                style={{ background: discountEnabled ? "#f59e0b" : "#e2e8f0", border: "none",
                  borderRadius: 20, width: 52, height: 28, cursor: "pointer", position: "relative", transition: "all 0.3s" }}>
                <div style={{ position: "absolute", top: 3, left: discountEnabled ? 26 : 3,
                  width: 22, height: 22, background: "#fff", borderRadius: "50%", transition: "all 0.3s" }} />
              </button>
              <span style={{ fontSize: 13, color: discountEnabled ? "#f59e0b" : "#94a3b8", fontWeight: 600 }}>
                {discountEnabled ? "ON" : "OFF"}
              </span>
              {discountEnabled && (
                <input type="number" value={discountAmt} onChange={e => setDiscountAmt(e.target.value)}
                  placeholder="₹0" style={{ width: 80, padding: "4px 8px", border: "1.5px solid #f59e0b",
                    borderRadius: 6, fontSize: 13, outline: "none" }} />
              )}
            </div>
            {/* Advance */}
            <div style={{ padding: 16, background: "#f8fafc", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                💵 Advance Payment
              </div>
              <input type="number" value={advanceAmt} onChange={e => setAdvanceAmt(e.target.value)}
                placeholder="₹0 (enter if customer paid advance)"
                style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0",
                  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "#1A4480"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            </div>
          </div>

          {/* Right — Totals */}
          <div>
            <h3 style={{ margin: "0 0 16px", color: "#0B1F3A", fontSize: 16, fontWeight: 700 }}>
              💰 Bill Total
            </h3>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20 }}>
              {[
                { label: "Subtotal", value: subtotal, color: "#374151" },
                ...(gstEnabled ? [{ label: `GST (${gstRate}%)`, value: gstAmount, color: "#6366f1" }] : []),
                ...(discountEnabled && discount > 0 ? [{ label: "Discount", value: -discount, color: "#f59e0b" }] : []),
                ...(advance > 0 ? [{ label: "Advance Paid", value: -advance, color: "#059669" }] : []),
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: 14, color: "#64748b" }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: row.color }}>
                    {row.value < 0 ? "-" : ""}₹{formatINR(Math.abs(row.value))}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between",
                padding: "16px 0 0", marginTop: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#0B1F3A" }}>GRAND TOTAL</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: "#1A4480" }}>
                  ₹{formatINR(Math.max(0, grandTotal))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0B1F3A", fontSize: 16, fontWeight: 700 }}>
          💳 Payment
        </h3>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Status</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["paid", "#059669", "✅ Paid"], ["credit", "#dc2626", "⏳ Credit"], ["partial", "#f59e0b", "💰 Partial"]].map(
                ([val, color, label]) => (
                  <button key={val} onClick={() => setPayStatus(val)} style={btnStyle(color, payStatus === val)}>
                    {label}
                  </button>
                )
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Method</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["cash", "#374151", "💵 Cash"], ["upi", "#6366f1", "📱 UPI"], ["credit", "#dc2626", "📒 Credit"]].map(
                ([val, color, label]) => (
                  <button key={val} onClick={() => setPayMethod(val)} style={btnStyle(color, payMethod === val)}>
                    {label}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div style={{ background: msg.includes("✅") ? "#dcfce7" : "#fee2e2",
          color: msg.includes("✅") ? "#166534" : "#dc2626",
          padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontWeight: 600, fontSize: 14 }}>
          {msg}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={handleSave} disabled={saving}
          style={{ background: "#1A4480", color: "#fff", border: "none", borderRadius: 12,
            padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer",
            opacity: saving ? 0.7 : 1, boxShadow: "0 4px 14px rgba(26,68,128,0.35)" }}>
          {saving ? "⏳ Saving..." : "💾 Save Bill"}
        </button>
        <button onClick={handleNewBill}
          style={{ background: "#fff", color: "#374151", border: "2px solid #e2e8f0",
            borderRadius: 12, padding: "14px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          🔄 New Bill
        </button>
        <button onClick={() => setItems([{ ...EMPTY_ITEM }])}
          style={{ background: "#fff", color: "#dc2626", border: "2px solid #dc2626",
            borderRadius: 12, padding: "14px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          🗑️ Clear Items
        </button>
      </div>

      {/* New Item Modal */}
      {showNewItemModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%",
            maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 20px", color: "#0B1F3A", fontSize: 18, fontWeight: 800 }}>
              ➕ Add New Item to Price List
            </h3>
            {[
              { label: "Item Name", key: "item_name", placeholder: "e.g. 3\" PVC Special Coupler" },
              { label: "Unit", key: "unit", placeholder: "Per Piece / Per Meter / Per Bundle" },
              { label: "Price (₹)", key: "price", placeholder: "Enter price", type: "number" }
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  {f.label}
                </label>
                <input type={f.type || "text"} value={newItemData[f.key]}
                  onChange={e => setNewItemData(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0",
                    borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={handleAddNewItem}
                style={{ flex: 1, background: "#1A4480", color: "#fff", border: "none",
                  borderRadius: 8, padding: "12px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                ✅ Add to Price List
              </button>
              <button onClick={() => setShowNewItemModal(false)}
                style={{ background: "#fff", color: "#374151", border: "2px solid #e2e8f0",
                  borderRadius: 8, padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
