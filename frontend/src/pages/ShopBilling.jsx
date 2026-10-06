import { useState, useEffect, useRef, useCallback } from "react";
import { searchProducts, createShopBill, getShopBills, updateShopBillPayment, deleteShopBill, formatINR, formatDate } from "../api";

const EMPTY_ITEM = { item_name: "", unit: "", qty: "", rate: "", amount: 0 };

export default function ShopBilling({ token, role }) {
  const [view, setView] = useState("new");
  const [shop, setShop] = useState({ name: "", phone: "", address: "" });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [payStatus, setPayStatus] = useState("credit");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchIdx, setSearchIdx] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const debounceRef = useRef(null);
  const nameRefs = useRef({});
  const qtyRefs = useRef({});
  const rateRefs = useRef({});

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

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

  // Item search from the price list — names only, the price is NOT fetched
  const handleSearch = useCallback((idx, q) => {
    updateItem(idx, "item_name", q);
    setSearchIdx(idx);
    clearTimeout(debounceRef.current);
    if (!q) { setSearchResults([]); return; }
    const el = nameRefs.current[idx];
    if (el) {
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 320 && rect.top > 320) {
        setDropdownPos({ bottom: window.innerHeight - rect.top + 2, top: "auto", left: rect.left, width: rect.width });
      } else {
        setDropdownPos({ top: rect.bottom + 2, bottom: "auto", left: rect.left, width: rect.width });
      }
    }
    debounceRef.current = setTimeout(async () => {
      try { setSearchResults(await searchProducts(q, token)); }
      catch { setSearchResults([]); }
    }, 200);
  }, [token]);

  const selectProduct = (idx, product) => {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], item_name: product.item_name, unit: product.unit };
      return updated;
    });
    setSearchResults([]);
    setSearchIdx(null);
    setTimeout(() => qtyRefs.current[idx]?.focus(), 50);
  };

  const addRow = () => {
    setItems(prev => [...prev, { ...EMPTY_ITEM }]);
    setTimeout(() => nameRefs.current[items.length]?.focus(), 60);
  };
  const removeRow = (idx) => { if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== idx)); };

  // Enter in Qty -> go to Rate. Enter in Rate -> add next row.
  const onQtyKey = (e, idx) => { if (e.key === "Enter") { e.preventDefault(); rateRefs.current[idx]?.focus(); } };
  const onRateKey = (e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } };

  const loadList = async () => {
    setLoading(true);
    try { setBills(await getShopBills(search, token)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (view === "list") loadList(); }, [view, search]);

  const handleSave = async () => {
    if (!shop.name) { setMsg("Please enter shop name"); return; }
    const validItems = items.filter(i => i.item_name && parseFloat(i.rate) > 0);
    if (validItems.length === 0) { setMsg("Please add at least one item with a rate"); return; }
    setSaving(true); setMsg("");
    try {
      await createShopBill({
        shop_name: shop.name, shop_phone: shop.phone, shop_address: shop.address,
        items: validItems.map(i => ({ item_name: i.item_name, unit: i.unit, qty: parseFloat(i.qty) || 0, rate: parseFloat(i.rate) || 0, amount: i.amount })),
        subtotal, grand_total: subtotal, payment_status: payStatus, notes
      }, token);
      setMsg("Shop bill saved!");
      setShop({ name: "", phone: "", address: "" });
      setItems([{ ...EMPTY_ITEM }]);
      setNotes(""); setPayStatus("credit");
    } catch (e) { setMsg(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleMarkPaid = async (bill) => {
    try { await updateShopBillPayment(bill.id, "paid", token); loadList(); }
    catch { setMsg("Failed to update"); }
  };
  const handleDelete = async (bill) => {
    if (!window.confirm(`Delete bill for ${bill.shop_name}?`)) return;
    try { await deleteShopBill(bill.id, token); loadList(); }
    catch { setMsg("Failed to delete"); }
  };

  const inp = { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const segBtn = (active, bg) => ({ padding: "9px 20px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", border: "none", borderRadius: 7, background: active ? bg : "transparent", color: active ? "#fff" : "#64748b" });
  const segGroup = { display: "inline-flex", gap: 2, background: "#f1f5f9", borderRadius: 10, padding: 3, border: "1px solid #e2e8f0" };

  return (
    <div>
      {searchIdx !== null && searchResults.length > 0 && (
        <div style={{
          position: "fixed",
          top: dropdownPos.top !== "auto" ? dropdownPos.top : "auto",
          bottom: dropdownPos.bottom !== "auto" ? dropdownPos.bottom : "auto",
          left: dropdownPos.left, width: dropdownPos.width, background: "#fff",
          border: "2px solid #1A4480", borderRadius: 10, zIndex: 99999,
          maxHeight: 320, overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.2)"
        }}>
          {searchResults.map((r, ri) => (
            <div key={ri} onMouseDown={() => selectProduct(searchIdx, r)}
              style={{ padding: "11px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: "#fff" }}
              onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0B1F3A" }}>{r.item_name}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{r.tab} &bull; {r.unit}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0B1F3A", margin: 0 }}>Shop Billing</h1>
        <div style={segGroup}>
          <button onClick={() => setView("new")} style={segBtn(view === "new", "#1A4480")}>New Bill</button>
          <button onClick={() => setView("list")} style={segBtn(view === "list", "#1A4480")}>All Shop Bills</button>
        </div>
      </div>

      {view === "new" ? (
        <>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Shop Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Shop Name</label>
                <input value={shop.name} onChange={e => setShop(p => ({ ...p, name: e.target.value }))} placeholder="Enter shop name" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Phone Number (optional)</label>
                <input value={shop.phone} onChange={e => setShop(p => ({ ...p, phone: e.target.value }))} placeholder="Enter phone number" style={inp} />
              </div>
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Address (optional)</label>
            <input value={shop.address} onChange={e => setShop(p => ({ ...p, address: e.target.value }))} placeholder="Shop address" style={inp} />
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Items</h3>
            <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
              Search the item name from the price list, then type the quantity and the rate yourself. Prices are not auto-filled for shop bills.
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#1A4480", color: "#fff" }}>
                    {["S.No","Item Name","Unit","Qty","Rate (Rs.)","Amount (Rs.)",""].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1A4480", width: 46 }}>{idx + 1}</td>
                      <td style={{ padding: "6px 8px", minWidth: 260 }}>
                        <input ref={el => nameRefs.current[idx] = el} value={item.item_name}
                          onChange={e => handleSearch(idx, e.target.value)}
                          onFocus={() => { setSearchIdx(idx); if (item.item_name) handleSearch(idx, item.item_name); }}
                          onBlur={() => setTimeout(() => { setSearchResults([]); setSearchIdx(null); }, 200)}
                          onKeyDown={e => { if (e.key === "Escape") { setSearchResults([]); setSearchIdx(null); } }}
                          placeholder="Type to search..." autoComplete="off"
                          style={{ ...inp, padding: "7px 10px" }} />
                      </td>
                      <td style={{ padding: "8px 10px", color: "#64748b", fontSize: 13, whiteSpace: "nowrap", minWidth: 90 }}>{item.unit}</td>
                      <td style={{ padding: "6px 8px", width: 90 }}>
                        <input ref={el => qtyRefs.current[idx] = el} value={item.qty}
                          onChange={e => updateItem(idx, "qty", e.target.value)} onKeyDown={e => onQtyKey(e, idx)}
                          placeholder="Qty" style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 14, textAlign: "center", outline: "none" }} />
                      </td>
                      <td style={{ padding: "6px 8px", width: 120 }}>
                        <input ref={el => rateRefs.current[idx] = el} value={item.rate}
                          onChange={e => updateItem(idx, "rate", e.target.value)} onKeyDown={onRateKey}
                          placeholder="Rate" style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 14, outline: "none" }} />
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#059669", whiteSpace: "nowrap" }}>Rs.{formatINR(item.amount)}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <button onClick={() => removeRow(idx)} style={{ background: "#fee2e2", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", color: "#dc2626", fontWeight: 700, fontSize: 16 }}>x</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addRow} style={{ marginTop: 10, background: "#eff6ff", border: "2px dashed #1A4480", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, color: "#1A4480", cursor: "pointer", width: "100%" }}>
              + Add Item &nbsp;(or press Enter after typing the rate)
            </button>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>Payment Status</div>
                <div style={segGroup}>
                  {[["paid","#0f766e","Paid"],["credit","#9a3412","Credit"]].map(([v,bg,l]) => (
                    <button key={v} onClick={() => setPayStatus(v)} style={segBtn(payStatus === v, bg)}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "#64748b" }}>Total Amount</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#1A4480" }}>Rs.{formatINR(subtotal)}</div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." style={inp} />
            </div>
          </div>

          {msg && <div style={{ background: msg.includes("Error") || msg.includes("Please") ? "#fef2f2" : "#f0fdf4", color: msg.includes("Error") || msg.includes("Please") ? "#dc2626" : "#166534", padding: "11px 16px", borderRadius: 8, marginBottom: 14, fontWeight: 600, fontSize: 13 }}>{msg}</div>}

          <button onClick={handleSave} disabled={saving}
            style={{ background: "#1A4480", color: "#fff", border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Shop Bill"}
          </button>
        </>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by shop name..." style={{ ...inp, marginBottom: 16 }} />
          {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading...</div> :
            bills.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No shop bills yet</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#1A4480", color: "#fff" }}>
                    {["Shop Name","Phone","Date","Items","Amount","Status","Action"].map(h => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b, i) => (
                    <tr key={b.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#1A4480" }}>{b.shop_name}</td>
                      <td style={{ padding: "9px 12px", color: "#64748b" }}>{b.shop_phone || "—"}</td>
                      <td style={{ padding: "9px 12px", color: "#64748b", whiteSpace: "nowrap" }}>{formatDate(b.created_at)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}>{(b.items || []).length}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700 }}>Rs.{formatINR(b.grand_total)}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600, background: b.payment_status === "paid" ? "#dcfce7" : "#fee2e2", color: b.payment_status === "paid" ? "#166534" : "#9a3412" }}>
                          {b.payment_status === "paid" ? "Paid" : "Credit"}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {b.payment_status !== "paid" && (
                            <button onClick={() => handleMarkPaid(b)} style={{ background: "#dcfce7", color: "#166534", border: "1px solid #166534", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Mark Paid</button>
                          )}
                          {role === "owner" && (
                            <button onClick={() => handleDelete(b)} style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Delete</button>
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
      )}
    </div>
  );
}
