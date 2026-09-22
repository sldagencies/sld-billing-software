import { useState, useEffect } from "react";
import { getCustomers, getCustomerBills, formatINR, formatDate } from "../api";

export default function CustomerLedger({ token }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try { setCustomers(await getCustomers(search, token)); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelect = async (cust) => {
    setSelected(cust);
    try { setBills(await getCustomerBills(cust.phone, token)); }
    catch (e) { console.error(e); }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1F3A", marginBottom: 24 }}>👥 Customer Ledger</h1>
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 2fr" : "1fr", gap: 20 }}>
        {/* Customer List */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search customer..."
            style={{ width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0",
              borderRadius: 10, fontSize: 14, outline: "none", marginBottom: 16, boxSizing: "border-box" }} />
          {loading ? <div style={{ textAlign: "center", color: "#64748b", padding: 20 }}>Loading...</div> :
            customers.map(c => (
              <div key={c.id} onClick={() => handleSelect(c)}
                style={{ padding: "14px 16px", borderRadius: 10, cursor: "pointer", marginBottom: 8,
                  background: selected?.id === c.id ? "#eff6ff" : "#f8fafc",
                  border: `2px solid ${selected?.id === c.id ? "#1A4480" : "transparent"}`,
                  transition: "all 0.2s" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0B1F3A" }}>{c.name}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>📞 {c.phone}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>
                    Total: ₹{formatINR(c.total_purchases)}
                  </span>
                  {c.outstanding_credit > 0 && (
                    <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                      Credit: ₹{formatINR(c.outstanding_credit)}
                    </span>
                  )}
                </div>
              </div>
            ))
          }
        </div>
        {/* Bill History */}
        {selected && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0B1F3A" }}>{selected.name}</h2>
                <div style={{ fontSize: 13, color: "#64748b" }}>📞 {selected.phone} | {selected.bill_count} bills</div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: 8,
                  padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}>✕ Close</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Total Purchases", value: `₹${formatINR(selected.total_purchases)}`, color: "#1A4480" },
                { label: "Outstanding Credit", value: `₹${formatINR(selected.outstanding_credit)}`, color: "#dc2626" },
              ].map(s => (
                <div key={s.label} style={{ background: "#f8fafc", borderRadius: 10, padding: 16,
                  textAlign: "center", borderLeft: `4px solid ${s.color}` }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#1A4480", color: "#fff" }}>
                    {["Bill No", "Date", "Amount", "Status"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b, i) => (
                    <tr key={b.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff",
                      borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#1A4480" }}>{b.bill_number}</td>
                      <td style={{ padding: "8px 12px", color: "#64748b" }}>{formatDate(b.created_at)}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>₹{formatINR(b.final_amount)}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ padding: "3px 8px", borderRadius: 50, fontSize: 11, fontWeight: 600,
                          background: b.payment_status === "paid" ? "#dcfce7" : "#fee2e2",
                          color: b.payment_status === "paid" ? "#166534" : "#dc2626" }}>
                          {b.payment_status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
