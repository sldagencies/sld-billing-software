import { useState, useRef, useCallback, useEffect } from "react";
import { searchProducts, createBill, addNewItem, formatINR } from "../api";
import BillPrint from "../components/BillPrint";

const EMPTY_ITEM = { item_name: "", unit: "", qty: "", rate: 0, amount: 0 };

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
  const [sharingWA, setSharingWA] = useState(false);
  const debounceRef = useRef(null);
  const searchInputRefs = useRef({});
  const qtyInputRefs = useRef({});
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

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

  const handleSearch = useCallback((idx, q) => {
    updateItem(idx, "item_name", q);
    setSearchIdx(idx);
    clearTimeout(debounceRef.current);
    if (!q || q.length < 1) { setSearchResults([]); return; }

    // Calculate dropdown position based on input element
    const inputEl = searchInputRefs.current[idx];
    if (inputEl) {
      const rect = inputEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropH = 320;
      if (spaceBelow < dropH && spaceAbove > dropH) {
        // open upward
        setDropdownPos({ bottom: window.innerHeight - rect.top + 2, top: "auto", left: rect.left, width: rect.width });
      } else {
        // open downward
        setDropdownPos({ top: rect.bottom + 2, bottom: "auto", left: rect.left, width: rect.width });
      }
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchProducts(q, token);
        setSearchResults(res);
      } catch { setSearchResults([]); }
    }, 200);
  }, [token]);

  const selectProduct = (idx, product) => {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        item_name: product.item_name,
        unit: product.unit,
        rate: product.price,
        qty: "",
        amount: 0
      };
      return updated;
    });
    setSearchResults([]);
    setSearchIdx(null);
    // Focus qty input after selecting item
    setTimeout(() => {
      const qtyEl = qtyInputRefs.current[idx];
      if (qtyEl) { qtyEl.focus(); qtyEl.select(); }
    }, 50);
  };

  const addRow = () => {
    setItems(prev => [...prev, { ...EMPTY_ITEM }]);
    // Focus new search input after adding row
    setTimeout(() => {
      const newIdx = items.length;
      const el = searchInputRefs.current[newIdx];
      if (el) el.focus();
    }, 60);
  };

  const removeRow = (idx) => {
    if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Enter on search input → handled by selectProduct (focus qty)
  // Enter on qty input → add new row and focus its search box
  const handleQtyKeyDown = (e, idx) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRow();
    }
  };

  const handleSearchKeyDown = (e, idx) => {
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
        advance_amount: advance, grand_total: Math.max(0, grandTotal),
        payment_status: payStatus, payment_method: payMethod
      };
      const result = await createBill(bill, token);
      setSavedBill({ ...bill, bill_number: result.bill_number, id: result.id, created_at: new Date().toISOString() });
      setMsg(`Bill ${result.bill_number} saved successfully!`);
      setShowPrint(true);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
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

  const handleShareWhatsApp = async () => {
    if (!savedBill) return;
    setSharingWA(true); setMsg("");
    try {
      // Load html2canvas + jsPDF from CDN if not already loaded
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const el = document.getElementById("bill-print-area");
      const canvas = await window.html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Bill_${savedBill.bill_number}.pdf`;
      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

      // Try native share (works on mobile — opens WhatsApp share sheet directly)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Bill ${savedBill.bill_number}`,
          text: `Bill ${savedBill.bill_number} from Sree Laxmidurga Agencies — Total: Rs.${formatINR(savedBill.grand_total)}`
        });
        setMsg("Bill shared successfully!");
      } else {
        // Fallback: download PDF + open WhatsApp chat with message
        pdf.save(fileName);
        const phone = savedBill.customer_phone.replace(/\D/g, "");
        const waPhone = phone.length === 10 ? `91${phone}` : phone;
        const text = encodeURIComponent(
          `Dear ${savedBill.customer_name}, your bill ${savedBill.bill_number} from Sree Laxmidurga Agencies — Total: Rs.${formatINR(savedBill.grand_total)}. PDF downloaded, please attach it here. Thank you!`
        );
        window.open(`https://wa.me/${waPhone}?text=${text}`, "_blank");
        setMsg("PDF downloaded. WhatsApp opened — please attach the downloaded PDF manually.");
      }
    } catch (e) {
      console.error(e);
      setMsg("Error: Could not prepare PDF for sharing. Try Print Bill instead.");
    } finally {
      setSharingWA(false);
    }
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

  const segBtn = (active, activeBg, activeText) => ({
    padding: "9px 20px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    borderRadius: 7,
    background: active ? activeBg : "transparent",
    color: active ? activeText : "#64748b",
    transition: "all 0.15s",
  });
  const segGroup = { display: "inline-flex", gap: 2, background: "#f1f5f9", borderRadius: 10, padding: 3, border: "1px solid #e2e8f0" };

  const inp = { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };

  if (showPrint && savedBill) return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => window.print()} style={{ background: "#1A4480", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Print Bill</button>
        <button onClick={handleShareWhatsApp} disabled={sharingWA} style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: sharingWA ? 0.7 : 1 }}>
          {sharingWA ? "Preparing PDF..." : "Share on WhatsApp"}
        </button>
        <button onClick={handleNewBill} style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>New Bill</button>
      </div>
      {msg && (
        <div style={{ background: msg.includes("Error") ? "#fef2f2" : "#f0fdf4", color: msg.includes("Error") ? "#dc2626" : "#166534", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontWeight: 600, fontSize: 13 }}>{msg}</div>
      )}
      <div id="bill-print-area">
        <BillPrint bill={savedBill} />
      </div>
    </div>
  );

  return (
    <div>
      {/* Fixed dropdown — renders outside table so never clipped */}
      {searchIdx !== null && searchResults.length > 0 && (
        <div style={{
          position: "fixed",
          top: dropdownPos.top !== "auto" ? dropdownPos.top : "auto",
          bottom: dropdownPos.bottom !== "auto" ? dropdownPos.bottom : "auto",
          left: dropdownPos.left,
          width: dropdownPos.width,
          background: "#fff",
          border: "2px solid #1A4480",
          borderRadius: 10,
          zIndex: 99999,
          maxHeight: 320,
          overflowY: "auto",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)"
        }}>
          {searchResults.map((r, ri) => (
            <div key={ri}
              onMouseDown={() => selectProduct(searchIdx, r)}
              style={{
                padding: "11px 16px", cursor: "pointer",
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
              <div style={{ fontWeight: 800, color: r.price > 0 ? "#1A4480" : "#94a3b8", fontSize: 14, flexShrink: 0, marginLeft: 16 }}>
                {r.price > 0 ? `Rs.${formatINR(r.price)}` : "No price"}
              </div>
            </div>
          ))}
          <div
            onMouseDown={() => { setNewItemData(p => ({ ...p, item_name: items[searchIdx]?.item_name || "" })); setShowNewItemModal(true); setSearchResults([]); }}
            style={{ padding: "10px 16px", cursor: "pointer", background: "#fffbeb", color: "#92400e", fontWeight: 600, fontSize: 12, borderTop: "2px solid #fde68a" }}>
            + Not found? Add to price list
          </div>
        </div>
      )}

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
            <input value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Enter customer name" style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Phone Number</label>
            <input value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="Enter phone number" style={inp} />
          </div>
        </div>
      </div>

      {/* Items */}
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
                  <td style={{ padding: "6px 8px", minWidth: 260 }}>
                    <input
                      ref={el => searchInputRefs.current[idx] = el}
                      value={item.item_name}
                      onChange={e => handleSearch(idx, e.target.value)}
                      onKeyDown={e => handleSearchKeyDown(e, idx)}
                      placeholder="Type to search..."
                      style={{ ...inp, padding: "7px 10px" }}
                      onFocus={e => {
                        setSearchIdx(idx);
                        if (item.item_name) handleSearch(idx, item.item_name);
                      }}
                      onBlur={() => setTimeout(() => { setSearchResults([]); setSearchIdx(null); }, 200)}
                      autoComplete="off"
                    />
                  </td>
                  <td style={{ padding: "8px 10px", color: "#64748b", whiteSpace: "nowrap", fontSize: 13, minWidth: 90 }}>{item.unit}</td>
                  <td style={{ padding: "6px 8px", width: 110 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <button onMouseDown={() => updateItem(idx, "qty", Math.max(0, (parseFloat(item.qty) || 0) - 1))}
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>-</button>
                      <input
                        ref={el => qtyInputRefs.current[idx] = el}
                        value={item.qty}
                        onChange={e => updateItem(idx, "qty", e.target.value)}
                        onKeyDown={e => handleQtyKeyDown(e, idx)}
                        style={{ width: 50, padding: "6px 4px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 14, textAlign: "center", outline: "none" }}
                        placeholder="Qty"
                      />
                      <button onMouseDown={() => updateItem(idx, "qty", (parseFloat(item.qty) || 0) + 1)}
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>+</button>
                    </div>
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>Rs.{formatINR(item.rate)}</td>
                  <td style={{ padding: "6px 8px" }}>
                    {editingRate === idx ? (
                      <input autoFocus value={item.rate}
                        onChange={e => updateItem(idx, "rate", e.target.value)}
                        onBlur={() => setEditingRate(null)}
                        onKeyDown={e => { if (e.key === "Enter") setEditingRate(null); }}
                        style={{ width: 80, padding: "5px 7px", border: "2px solid #f59e0b", borderRadius: 6, fontSize: 13, outline: "none" }} />
                    ) : (
                      <button onClick={() => setEditingRate(idx)}
                        style={{ background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: "#92400e", fontWeight: 600 }}>Edit</button>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#059669", whiteSpace: "nowrap" }}>Rs.{formatINR(item.amount)}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <button onClick={() => removeRow(idx)}
                      style={{ background: "#fee2e2", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", color: "#dc2626", fontWeight: 700, fontSize: 16 }}>x</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addRow}
          style={{ marginTop: 10, background: "#eff6ff", border: "2px dashed #1A4480", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, color: "#1A4480", cursor: "pointer", width: "100%" }}>
          + Add Item &nbsp;(or press Enter after entering quantity)
        </button>
      </div>

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
                    placeholder="Rs.0" style={{ width: 90, padding: "4px 8px", border: "1.5px solid #f59e0b", borderRadius: 6, fontSize: 13, outline: "none" }} />
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
              <input type="number" value={advanceAmt} onChange={e => setAdvanceAmt(e.target.value)} placeholder="0" style={{ ...inp, padding: "8px 12px" }} />
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
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 14 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: "#0B1F3A" }}>GRAND TOTAL</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: "#1A4480" }}>Rs.{formatINR(Math.max(0, grandTotal))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 22, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Payment</h3>
        <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 }}>Status</div>
            <div style={segGroup}>
              {[
                ["paid",    "#0f766e", "#fff", "Paid"],
                ["credit",  "#9a3412", "#fff", "Credit"],
                ["partial", "#854d0e", "#fff", "Partial"],
              ].map(([v, bg, text, l]) => (
                <button key={v} onClick={() => setPayStatus(v)} style={segBtn(payStatus === v, bg, text)}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 }}>Method</div>
            <div style={segGroup}>
              {[
                ["cash",   "#1A4480", "#fff", "Cash"],
                ["upi",    "#1A4480", "#fff", "UPI"],
                ["credit", "#1A4480", "#fff", "Credit"],
              ].map(([v, bg, text, l]) => (
                <button key={v} onClick={() => setPayMethod(v)} style={segBtn(payMethod === v, bg, text)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div style={{
          background: msg.includes("Error") || msg.includes("Please") ? "#fef2f2" : "#f0fdf4",
          color: msg.includes("Error") || msg.includes("Please") ? "#dc2626" : "#166534",
          border: `1px solid ${msg.includes("Error") || msg.includes("Please") ? "#fecaca" : "#bbf7d0"}`,
          padding: "11px 16px", borderRadius: 8, marginBottom: 14, fontWeight: 600, fontSize: 13
        }}>{msg}</div>
      )}

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
          style={{ background: "#fff", color: "#9a3412", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "13px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Clear
        </button>
      </div>

      {/* New Item Modal */}
      {showNewItemModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
