import { useState, useRef, useCallback } from "react";
import { searchProducts, formatINR } from "../api";

const EMPTY_ITEM = { item_name: "", unit: "", qty: "", rate: 0, amount: 0 };

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function Quotation({ token }) {
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(18);
  const [sharing, setSharing] = useState(false);
  const [msg, setMsg] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchIdx, setSearchIdx] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const debounceRef = useRef(null);
  const searchRefs = useRef({});
  const qtyRefs = useRef({});

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const gstAmount = gstEnabled ? (subtotal * gstRate) / 100 : 0;
  const grandTotal = subtotal + gstAmount;
  const filledItems = items.filter(i => i.item_name && parseFloat(i.qty) > 0 && i.rate > 0);
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

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
    if (!q) { setSearchResults([]); return; }
    const el = searchRefs.current[idx];
    if (el) {
      const rect = el.getBoundingClientRect();
      if (window.innerHeight - rect.bottom < 320 && rect.top > 320) {
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

  const handleClear = () => {
    setCustomer({ name: "", phone: "" });
    setItems([{ ...EMPTY_ITEM }]);
    setGstEnabled(false); setMsg("");
  };

  const handleShareWhatsApp = async () => {
    if (!customer.name) { setMsg("Please enter customer name"); return; }
    if (!customer.phone) { setMsg("Please enter customer phone number"); return; }
    if (filledItems.length === 0) { setMsg("Please add at least one item with a quantity"); return; }
    setSharing(true); setMsg("");
    try {
      if (!window.html2canvas) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      if (!window.jspdf) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

      const el = document.getElementById("quotation-pdf-area");
      const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let heightLeft = imgH, position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
        heightLeft -= pageH;
      }

      const safeName = customer.name.replace(/[^a-z0-9]+/gi, "_");
      const fileName = `Quotation_${safeName}.pdf`;
      const pdfFile = new File([pdf.output("blob")], fileName, { type: "application/pdf" });
      const text = `Dear ${customer.name}, please find your quotation from Sree Laxmidurga Agencies. Total: Rs.${formatINR(grandTotal)}. Thank you!`;

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({ files: [pdfFile], title: "Quotation", text });
        setMsg("Quotation shared.");
      } else {
        pdf.save(fileName);
        const digits = customer.phone.replace(/\D/g, "");
        const waPhone = digits.length === 10 ? `91${digits}` : digits;
        window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, "_blank");
        setMsg("PDF downloaded and WhatsApp opened. Attach the downloaded PDF in the chat and send.");
      }
    } catch (e) {
      console.error(e);
      setMsg("Error: Could not create the PDF. Please try again.");
    } finally { setSharing(false); }
  };

  const inp = { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const isErr = msg.includes("Error") || msg.includes("Please");

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
              style={{ padding: "11px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}
              onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#0B1F3A" }}>{r.item_name}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{r.tab} &bull; {r.unit}</div>
              </div>
              <div style={{ fontWeight: 800, color: r.price > 0 ? "#1A4480" : "#94a3b8", fontSize: 14, marginLeft: 16 }}>
                {r.price > 0 ? `Rs.${formatINR(r.price)}` : "No price"}
              </div>
            </div>
          ))}
        </div>
      )}

      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0B1F3A", margin: "0 0 20px" }}>Quotation</h1>

      <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Customer Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Customer Name</label>
            <input value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Enter customer name" style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Phone Number (WhatsApp)</label>
            <input value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="Enter 10-digit phone number" style={inp} />
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 14px", color: "#0B1F3A", fontSize: 15, fontWeight: 700 }}>Items</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr style={{ background: "#1A4480", color: "#fff" }}>
              {["S.No","Item Name","Unit","Qty","Rate (Rs.)","Amount (Rs.)",""].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1A4480", width: 46 }}>{idx + 1}</td>
                  <td style={{ padding: "6px 8px", minWidth: 260 }}>
                    <input ref={el => searchRefs.current[idx] = el} value={item.item_name}
                      onChange={e => handleSearch(idx, e.target.value)}
                      onFocus={() => { setSearchIdx(idx); if (item.item_name) handleSearch(idx, item.item_name); }}
                      onBlur={() => setTimeout(() => { setSearchResults([]); setSearchIdx(null); }, 200)}
                      placeholder="Type to search..." autoComplete="off" style={{ ...inp, padding: "7px 10px" }} />
                  </td>
                  <td style={{ padding: "8px 10px", color: "#64748b", fontSize: 13, whiteSpace: "nowrap", minWidth: 90 }}>{item.unit}</td>
                  <td style={{ padding: "6px 8px", width: 90 }}>
                    <input ref={el => qtyRefs.current[idx] = el} value={item.qty}
                      onChange={e => updateItem(idx, "qty", e.target.value)} onKeyDown={handleQtyKeyDown}
                      placeholder="Qty" style={{ width: "100%", padding: "7px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 14, textAlign: "center", outline: "none" }} />
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>Rs.{formatINR(item.rate)}</td>
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
          + Add Item &nbsp;(or press Enter after entering quantity)
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>GST</span>
            <button onClick={() => setGstEnabled(!gstEnabled)} style={{ background: gstEnabled ? "#059669" : "#e2e8f0", border: "none", borderRadius: 20, width: 48, height: 26, cursor: "pointer", position: "relative" }}>
              <div style={{ position: "absolute", top: 3, left: gstEnabled ? 24 : 3, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "all 0.2s" }} />
            </button>
            <span style={{ fontSize: 12, color: gstEnabled ? "#059669" : "#94a3b8", fontWeight: 600 }}>{gstEnabled ? "ON" : "OFF"}</span>
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

      {msg && (
        <div style={{ background: isErr ? "#fef2f2" : "#f0fdf4", color: isErr ? "#dc2626" : "#166534", border: `1px solid ${isErr ? "#fecaca" : "#bbf7d0"}`, padding: "11px 16px", borderRadius: 8, marginBottom: 14, fontWeight: 600, fontSize: 13 }}>{msg}</div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={handleShareWhatsApp} disabled={sharing}
          style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: sharing ? 0.7 : 1 }}>
          {sharing ? "Preparing PDF..." : "Share on WhatsApp"}
        </button>
        <button onClick={handleClear}
          style={{ background: "#fff", color: "#374151", border: "2px solid #e2e8f0", borderRadius: 10, padding: "13px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Clear
        </button>
      </div>

      {/* Off-screen layout that becomes the PDF */}
      <div style={{ position: "absolute", left: -9999, top: 0 }}>
        <div id="quotation-pdf-area" style={{ width: 794, background: "#fff", padding: 36, boxSizing: "border-box", fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
          <div style={{ textAlign: "center", borderBottom: "3px solid #1A4480", paddingBottom: 14, marginBottom: 18 }}>
            <img src="/logo.png" alt="" style={{ height: 80, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
            <div style={{ fontSize: 22, fontWeight: 900, color: "#1A4480" }}>Sree Laxmidurga Agencies</div>
            <div style={{ fontSize: 12, color: "#475569" }}>Yemmiganur, Kurnool District, Andhra Pradesh | 8019093618</div>
            <div style={{ marginTop: 10, background: "#1A4480", color: "#fff", display: "inline-block", padding: "6px 28px", borderRadius: 6, fontSize: 18, fontWeight: 900, letterSpacing: 2 }}>QUOTATION</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 13 }}>
            <div><strong>To:</strong> {customer.name} {customer.phone && `(${customer.phone})`}</div>
            <div><strong>Date:</strong> {today}</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#1A4480", color: "#fff" }}>
              {["S.No","Item","Qty","Rate (Rs.)","Amount (Rs.)"].map(h => <th key={h} style={{ padding: 8, textAlign: "left" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filledItems.map((it, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #cbd5e1" }}>
                  <td style={{ padding: 8 }}>{i + 1}</td>
                  <td style={{ padding: 8 }}>{it.item_name}</td>
                  <td style={{ padding: 8 }}>{it.qty}</td>
                  <td style={{ padding: 8 }}>{formatINR(it.rate)}</td>
                  <td style={{ padding: 8, fontWeight: 700 }}>{formatINR(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: "right", marginTop: 14, fontSize: 14 }}>
            {gstEnabled && <div>GST ({gstRate}%): Rs.{formatINR(gstAmount)}</div>}
            <div style={{ fontWeight: 900, fontSize: 20, color: "#1A4480", marginTop: 6 }}>Total: Rs.{formatINR(grandTotal)}</div>
          </div>
          <div style={{ marginTop: 24, fontSize: 11, color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
            This is a price estimate, not a tax invoice. Prices are subject to change.
          </div>
        </div>
      </div>
    </div>
  );
}
