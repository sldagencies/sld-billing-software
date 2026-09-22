import { formatINR, formatDate } from "../api";

export default function BillPrint({ bill }) {
  const rows = bill.items || [];
  const ROWS_PER_PAGE = 18;
  const firstPageRows = rows.slice(0, ROWS_PER_PAGE);
  const extraPages = [];
  for (let i = ROWS_PER_PAGE; i < rows.length; i += 25) {
    extraPages.push(rows.slice(i, i + 25));
  }

  const style = `
    @media print {
      body * { visibility: hidden !important; }
      #bill-print, #bill-print * { visibility: visible !important; }
      #bill-print { position: fixed; top: 0; left: 0; width: 100%; }
      .no-print { display: none !important; }
      @page { margin: 0; size: A4; }
    }
    #bill-print { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
    .bill-page { width: 210mm; min-height: 297mm; padding: 8mm 8mm; box-sizing: border-box; page-break-after: always; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #1A4480; padding: 5px 7px; }
    th { background: #1A4480; color: #fff; font-weight: 700; text-align: center; }
  `;

  const TableHead = () => (
    <thead>
      <tr>
        <th style={{ width: 40 }}>S. No</th>
        <th style={{ textAlign: "left" }}>Items</th>
        <th style={{ width: 60 }}>Qty.</th>
        <th style={{ width: 80 }}>Rate Rs.</th>
        <th colSpan={2} style={{ width: 120 }}>Amount</th>
      </tr>
      <tr style={{ background: "#1A4480", color: "#fff" }}>
        <th></th><th></th><th></th><th></th>
        <th style={{ width: 70 }}>Rs.</th>
        <th style={{ width: 50 }}>Ps.</th>
      </tr>
    </thead>
  );

  const renderRow = (item, idx) => {
    const rs = Math.floor(item.amount);
    const ps = Math.round((item.amount - rs) * 100);
    return (
      <tr key={idx} style={{ minHeight: 22 }}>
        <td style={{ textAlign: "center" }}>{idx + 1}</td>
        <td>{item.item_name}</td>
        <td style={{ textAlign: "center" }}>{item.qty}</td>
        <td style={{ textAlign: "right" }}>{formatINR(item.rate)}</td>
        <td style={{ textAlign: "right" }}>{rs.toLocaleString("en-IN")}</td>
        <td style={{ textAlign: "center" }}>{ps > 0 ? ps : "—"}</td>
      </tr>
    );
  };

  const EmptyRows = ({ count }) => Array.from({ length: count }).map((_, i) => (
    <tr key={`empty-${i}`} style={{ height: 22 }}>
      <td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>
  ));

  const gstRs = Math.floor(bill.gst_amount || 0);
  const grandRs = Math.floor(Math.max(0, bill.grand_total));
  const grandPs = Math.round((Math.max(0, bill.grand_total) - grandRs) * 100);

  const billDate = bill.created_at
    ? new Date(bill.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  return (
    <div id="bill-print">
      <style>{style}</style>

      {/* PAGE 1 — FRONT (Full Header) */}
      <div className="bill-page">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          borderBottom: "3px solid #1A4480", paddingBottom: 10, marginBottom: 10 }}>
          {/* Left — Logo + Name */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 70, height: 70, background: "#e8f4ff", borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 28, color: "#1A4480" }}>SLD</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#1A4480" }}>Sree Laxmidurga</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A4480", letterSpacing: 2 }}>AGENCIES</div>
              <div style={{ fontSize: 10, background: "#1A4480", color: "#fff",
                padding: "2px 8px", borderRadius: 4, display: "inline-block", marginTop: 2 }}>
                SERVING SINCE 2009
              </div>
            </div>
          </div>

          {/* Center — Contact */}
          <div style={{ textAlign: "center", fontSize: 11 }}>
            <div style={{ fontStyle: "italic", color: "#1A4480", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
              Your Trusted Partner for Water Solutions
            </div>
            <div>📞 8019093618</div>
            <div>✉️ sreelaxmidurgaagencies@gmail.com</div>
            <div>🌐 www.sreelaxmidurga.in</div>
            <div>📍 518 360, Kurnool District, Andhra Pradesh</div>
          </div>

          {/* Right — Brand Logos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { name: "FINOLEX", sub: "PIPES", bg: "#003087", color: "#FFD100" },
              { name: "CRI", sub: "C.R.I. PUMPS", bg: "#1a6b2e", color: "#fff" },
              { name: "PLASTO", sub: "TANKS & PIPE FITTINGS", bg: "#004B8D", color: "#fff" },
            ].map(b => (
              <div key={b.name} style={{ background: b.bg, padding: "4px 10px", borderRadius: 6,
                textAlign: "center", minWidth: 110 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: b.color }}>{b.name}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.8)" }}>{b.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Title + No + Date */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ background: "#1A4480", color: "#fff", padding: "6px 20px",
            borderRadius: 6, fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>INVOICE</div>
          <div style={{ textAlign: "right", fontSize: 12 }}>
            <div><strong>No:</strong> <span style={{ background: "#e8f4ff", padding: "2px 12px",
              borderRadius: 4, fontWeight: 700 }}>{bill.bill_number}</span></div>
            <div style={{ marginTop: 4 }}><strong>Date:</strong> <span style={{ background: "#e8f4ff",
              padding: "2px 12px", borderRadius: 4 }}>{billDate}</span></div>
          </div>
        </div>

        {/* Customer */}
        <div style={{ marginBottom: 10, fontSize: 13 }}>
          <strong>Sri / M/s: </strong>
          <span style={{ borderBottom: "1.5px solid #000", paddingBottom: 1, paddingRight: 80 }}>
            {bill.customer_name}
          </span>
          <span style={{ marginLeft: 20 }}>📞 {bill.customer_phone}</span>
        </div>

        {/* Items Table */}
        <table>
          <TableHead />
          <tbody>
            {firstPageRows.map((item, idx) => renderRow(item, idx))}
            {firstPageRows.length < ROWS_PER_PAGE && (
              <EmptyRows count={ROWS_PER_PAGE - firstPageRows.length} />
            )}
            {/* GST Row */}
            <tr style={{ background: "#e8f4ff" }}>
              <td colSpan={4} style={{ textAlign: "right", fontWeight: 700, fontSize: 13 }}>GST</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                {bill.gst_enabled ? gstRs.toLocaleString("en-IN") : "—"}
              </td>
              <td style={{ textAlign: "center" }}>—</td>
            </tr>
            {/* Discount Row */}
            {bill.discount_enabled && bill.discount_amount > 0 && (
              <tr style={{ background: "#fffbeb" }}>
                <td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>Discount</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>
                  {Math.floor(bill.discount_amount).toLocaleString("en-IN")}
                </td>
                <td style={{ textAlign: "center" }}>—</td>
              </tr>
            )}
            {/* Advance Row */}
            {bill.advance_amount > 0 && (
              <tr style={{ background: "#f0fdf4" }}>
                <td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>Advance Paid</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>
                  {Math.floor(bill.advance_amount).toLocaleString("en-IN")}
                </td>
                <td style={{ textAlign: "center" }}>—</td>
              </tr>
            )}
            {/* Grand Total */}
            <tr style={{ background: "#1A4480" }}>
              <td colSpan={4} style={{ textAlign: "right", fontWeight: 800, color: "#fff",
                fontSize: 14, letterSpacing: 1 }}>GRAND TOTAL</td>
              <td style={{ textAlign: "right", fontWeight: 900, color: "#FFD100", fontSize: 14 }}>
                {grandRs.toLocaleString("en-IN")}
              </td>
              <td style={{ textAlign: "center", fontWeight: 700, color: "#fff" }}>
                {grandPs > 0 ? grandPs : "—"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          marginTop: 16, paddingTop: 10, borderTop: "2px solid #1A4480" }}>
          <div style={{ fontStyle: "italic", fontSize: 22, fontWeight: 700, color: "#1A4480" }}>
            Thank You!<br />
            <span style={{ fontSize: 14 }}>for trusting us</span>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#1A4480",
            fontStyle: "italic", fontWeight: 600 }}>
            Quality Products.<br />Reliable Solutions.<br />A Better Tomorrow.
          </div>
          <div style={{ fontSize: 11, textAlign: "right" }}>
            <div style={{ display: "flex", gap: 16 }}>
              {["✅ GENUINE PRODUCTS", "🤝 RELIABLE SERVICE", "🏗️ BUILDING STRONGER TOMORROW"].map(t => (
                <div key={t} style={{ textAlign: "center", fontWeight: 700, color: "#1A4480",
                  fontSize: 10, maxWidth: 70 }}>{t}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* EXTRA PAGES — Plain (back page layout) */}
      {extraPages.map((pageItems, pageIdx) => (
        <div key={pageIdx} className="bill-page">
          <div style={{ marginBottom: 8, fontSize: 12, color: "#64748b" }}>
            <strong>{bill.bill_number}</strong> — {bill.customer_name} — Continued (Page {pageIdx + 2})
          </div>
          <table>
            <TableHead />
            <tbody>
              {pageItems.map((item, idx) => renderRow(item, ROWS_PER_PAGE + pageIdx * 25 + idx))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
