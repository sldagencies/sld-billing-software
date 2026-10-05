import { useState, useRef, useCallback, useEffect } from "react";
import { searchProducts, createQuotation, getQuotations, deleteQuotation, formatINR, formatDate } from "../api";

const EMPTY_ITEM = { item_name: "", unit: "", qty: "", rate: 0, amount: 0 };

export default function Quotation({ token, role }) {
  const [view, setView] = useState("new");
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(18);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchIdx, setSearchIdx] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [savedQuote, setSavedQuote] = useState(null);
  const debounceRef = useRef(null);
  const searchRefs = useRef({});
  const qtyRefs = useRef({});

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const gstAmount = gstEnabled ? (subtotal * gstRate) / 100 : 0;
  const grandTotal = subtotal + gstAmount;

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
    if (!q || q.length < 1) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try { setSearchResults(await searchProducts(q, token)); }
      catch { setSearchResults([]); }
    }, 200);
  }, [token]);

  const selectProduct = (idx, product) => {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], item_name: product.item_name, unit: product.unit, rate: product.price, qty: "", amount: 0 };
      return updated;
    });
    setSearchResults([]); setSearchIdx(null);
    setTimeout(() => qtyRefs.current[idx]?.focus(), 50);
  };

  const addRow = () => {
    setItems(prev => [...prev, { ...EMPTY_ITEM }]);
    setTimeout(() => searchRefs.current[items.length]?.focus(), 60);
  };
  const removeRow = (idx) => { if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== idx)); };
  const handleQtyKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } };

  const loadList = async () => {
    setLoading(true);
    try { setQuotations(await getQuotations(search, token)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (view === "list") loadList(); }, [view, search]);

  const handleSave = async () => {
    if (!customer.name) { setMsg("Please enter customer name"); return; }
    const validItems = items.filter(i => i.item_name && i.rate > 0);
    if (validItems.length === 0) { setMsg("Please add at least one item"); return; }
    setSaving(true); setMsg("");
    try {
      const q = {
        customer_name: customer.name, customer_phone: customer.phone,
        items: validItems.map(i => ({ item_name: i.item_name, unit: i.unit, qty: parseFloat(i.qty) || 0, rate: i.rate, amount: i.amount })),
        subtotal, gst_enabled: gstEnabled, gst_rate: gstRate, gst_amount: gstAmount, grand_total: grandTotal
      };
      const result = await createQuotation(q, token);
      setSavedQuote({ ...q, quotation_number: result.quotation_number, created_at: new Date().toISOString() });
      setMsg(`Quotation ${result.quotation_number} saved!`);
    } catch (e) { setMsg(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleNew = () => {
    setCustomer({ name: "", phone: "" });
    setItems([{ ...EMPTY_ITEM }]);
    setGstEnabled(false); setMsg(""); setSavedQuote(null);
  };

  const handleDelete = async (q) => {
    if (!window.confirm(`Delete quotation ${q.quotation_number}?`)) return;
    try { await deleteQuotation(q.id, token); loadList(); }
    catch { setMsg("Failed to delete"); }
  };

  const inp = { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const segBtn = (active, bg) => ({ padding: "9px 20px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", border: "none", borderRadius: 7, background: active ? bg : "transparent", color: active ? "#fff" : "#64748b" });
  const segGroup = { display: "inline-flex", gap: 2, background: "#f1f5f9", borderRadius: 10, padding: 3, border: "1px solid #e2e8f0" };

  if (savedQuote) return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button onClick={() => window.print()} style={{ background: "#1A4480", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Print Quotation</button>
        <button onClick={handleNew} style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>New Quotation</button>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 700 }}>
        <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "3px solid #1A4480", paddingBottom: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#1A4480" }}>Sree Laxmidurga Agencies</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Yemmiganur, Kurnool District, AP</div>
          <div style={{ marginTop: 10, background: "#1A4480", color: "#fff", display: "inline-block", padding: "6px 24px", borderRadius: 6, fontSize: 18, fontWeight: 900, letterSpacing: 2 }}>QUOTATION</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 13 }}>
          <div><strong>To:</strong> {savedQuote.customer_name} {savedQuote.customer_phone && `(${savedQuote.customer_phone})`}</div>
          <div><strong>No:</strong> {savedQuote.quotation_number} &nbsp; <strong>Date:</strong> {formatDate(savedQuote.created_at)}</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: "#1A4480", color: "#fff" }}>
            {["#","Item","Qty","Rate","Amount"].map(h => <th key={h} style={{ padding: 8, textAlign: "left" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {savedQuote.items.map((it, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: 8 }}>{i+1}</td>
                <td style={{ padding: 8 }}>{it.item_name}</td>
                <td style={{ padding: 8 }}>{it.qty}</td>
                <td style={{ padding: 8 }}>Rs.{formatINR(it.rate)}</td>
                <td style={{ padding: 8, fontWeight: 700 }}>Rs.{formatINR(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ textAlign: "right", marginTop: 14, fontSize: 15 }}>
          {savedQuote.gst_enabled && <div>GST ({savedQuote.gst_rate}%): Rs.{formatINR(savedQuote.gst_amount)}</div>}
          <div style={{ fontWeight: 900, fontSize: 20, color: "#1A4480", marginTop: 6 }}>Total: Rs.{formatINR(savedQuote.grand_total)}</div>
        </div>
        <div style={{ marginTop: 20, fontSize: 11, color: "#94a3b8", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
          This is a price estimate, not a tax invoice. Prices valid for 7 days.
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {searchIdx !== null && searchResults.length > 0 && (
        <div style={{ position: "fixed", zIndex: 99999 }}>
          {/* dropdown reused inline below for simplicity on this page */}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0B1F3A", margin: 0 }}>Quotation</h1>
        <div style={segGroup}>
          <button onClick={() => setView("new")} style={segBtn(view === "new", "#1A4480")}>New Quotation</button>
          <button onClick={() => setView("list")} style={segBtn(view === "list", "#1A4480")}>All Quotations</button>
        </div>
      </div>

      {view === "new" ? (
        <>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Customer Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Customer Name</label>
                <input value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Enter customer name" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Phone Number</label>
                <input value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="Enter phone number" style={inp} />
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Items</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr style={{ background: "#1A4480", color: "#fff" }}>
                  {["S.No","Item Name","Unit","Qty","Rate","Amount",""].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1A4480" }}>{idx+1}</td>
                      <td style={{ padding: "6px 8px", minWidth: 240, position: "relative" }}>
                        <input ref={el => searchRefs.current[idx] = el} value={item.item_name}
                          onChange={e => handleSearch(idx, e.target.value)}
                          onFocus={() => { setSearchIdx(idx); if (item.item_name) handleSearch(idx, item.item_name); }}
                          onBlur={() => setTimeout(() => { setSearchResults([]); setSearchIdx(null); }, 200)}
                          placeholder="Search product..." style={{ ...inp, padding: "7px 10px" }} autoComplete="off" />
                        {searchIdx === idx && searchResults.length > 0 && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "2px solid #1A4480", borderRadius: 10, zIndex: 999, maxHeight: 280, overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
                            {searchResults.map((r, ri) => (
                              <div key={ri} onMouseDown={() => selectProduct(idx, r)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.item_name}</div>
                                  <div style={{ fontSize: 11, color: "#64748b" }}>{r.tab}</div>
                                </div>
                                <div style={{ fontWeight: 800, color: "#1A4480" }}>Rs.{formatINR(r.price)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#64748b", fontSize: 13 }}>{item.unit}</td>
                      <td style={{ padding: "6px 8px", width: 90 }}>
                        <input ref={el => qtyRefs.current[idx] = el} value={item.qty} onChange={e => updateItem(idx, "qty", e.target.value)} onKeyDown={handleQtyKeyDown}
                          style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 14, textAlign: "center", outline: "none" }} placeholder="Qty" />
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 700 }}>Rs.{formatINR(item.rate)}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#059669" }}>Rs.{formatINR(item.amount)}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <button onClick={() => removeRow(idx)} style={{ background: "#fee2e2", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", color: "#dc2626", fontWeight: 700 }}>x</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addRow} style={{ marginTop: 10, background: "#eff6ff", border: "2px dashed #1A4480", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, color: "#1A4480", cursor: "pointer", width: "100%" }}>
              + Add Item (or press Enter after quantity)
            </button>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>GST</span>
                <button onClick={() => setGstEnabled(!gstEnabled)} style={{ background: gstEnabled ? "#059669" : "#e2e8f0", border: "none", borderRadius: 20, width: 48, height: 26, cursor: "pointer", position: "relative" }}>
                  <div style={{ position: "absolute", top: 3, left: gstEnabled ? 24 : 3, width: 20, height: 20, background: "#fff", borderRadius: "50%" }} />
                </button>
                {gstEnabled && (
                  <select value={gstRate} onChange={e => setGstRate(Number(e.target.value))} style={{ padding: "4px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6 }}>
                    {[5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "#64748b" }}>Estimated Total</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#1A4480" }}>Rs.{formatINR(grandTotal)}</div>
              </div>
            </div>
          </div>

          {msg && <div style={{ background: msg.includes("Error") || msg.includes("Please") ? "#fef2f2" : "#f0fdf4", color: msg.includes("Error") || msg.includes("Please") ? "#dc2626" : "#166534", padding: "11px 16px", borderRadius: 8, marginBottom: 14, fontWeight: 600, fontSize: 13 }}>{msg}</div>}

          <button onClick={handleSave} disabled={saving} style={{ background: "#1A4480", color: "#fff", border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Quotation"}
          </button>
        </>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or quotation no..." style={{ ...inp, marginBottom: 16 }} />
          {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading...</div> :
            quotations.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No quotations yet</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#1A4480", color: "#fff" }}>
                {["Quote No","Customer","Phone","Date","Amount","Action"].map(h => <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {quotations.map((q, i) => (
                  <tr key={q.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 700, color: "#1A4480" }}>{q.quotation_number}</td>
                    <td style={{ padding: "9px 12px", fontWeight: 600 }}>{q.customer_name}</td>
                    <td style={{ padding: "9px 12px", color: "#64748b" }}>{q.customer_phone || "—"}</td>
                    <td style={{ padding: "9px 12px", color: "#64748b", whiteSpace: "nowrap" }}>{formatDate(q.created_at)}</td>
                    <td style={{ padding: "9px 12px", fontWeight: 700 }}>Rs.{formatINR(q.grand_total)}</td>
                    <td style={{ padding: "9px 12px" }}>
                      {role === "owner" && <button onClick={() => handleDelete(q)} style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
