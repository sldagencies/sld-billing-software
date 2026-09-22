import { useState, useEffect } from "react";
import { getDashboard, togglePin, formatINR, formatDate } from "../api";

export default function Dashboard({ token, role, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setData(await getDashboard(token)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const card = (label, value, color, icon) => (
    <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderLeft: `5px solid ${color}` }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "monospace" }}>
        ₹{formatINR(value)}
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 600 }}>{label}</div>
    </div>
  );

  if (loading) return (
    <div style={{ textAlign: "center", padding: 80, fontSize: 18, color: "#64748b" }}>
      Loading dashboard...
    </div>
  );

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0B1F3A", margin: 0 }}>
            Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}! 👋
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 14 }}>{today}</p>
        </div>
        <button onClick={() => navigate("newbill")}
          style={{ background: "#1A4480", color: "#fff", border: "none", borderRadius: 12,
            padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(26,68,128,0.35)" }}>
          ➕ New Bill
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
        {card("Today's Sales", data?.today_sales || 0, "#1A4480", "💰")}
        {card("Credit Pending", data?.total_credit_pending || 0, "#dc2626", "⏳")}
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderLeft: "5px solid #059669" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#059669" }}>
            {data?.today_bill_count || 0}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 600 }}>Today's Bills</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderLeft: "5px solid #f59e0b" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>
            {data?.credit_bill_count || 0}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 600 }}>Pending Bills</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 32 }}>
        {[
          { label: "📋 Bills History", page: "history", color: "#6366f1" },
          { label: "👥 Customers", page: "customers", color: "#059669" },
          { label: "⏳ Credit/Pending", page: "credit", color: "#dc2626" },
          ...(role === "owner" ? [
            { label: "📊 Reports", page: "reports", color: "#0ea5e9" },
            { label: "⚙️ Settings", page: "settings", color: "#64748b" },
          ] : [])
        ].map(item => (
          <button key={item.page} onClick={() => navigate(item.page)}
            style={{ background: "#fff", border: `2px solid ${item.color}`, borderRadius: 12,
              padding: "16px 12px", fontSize: 14, fontWeight: 600, color: item.color,
              cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.target.style.background = item.color; e.target.style.color = "#fff"; }}
            onMouseLeave={e => { e.target.style.background = "#fff"; e.target.style.color = item.color; }}>
            {item.label}
          </button>
        ))}
      </div>

      {/* Pinned Bills */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0B1F3A", margin: 0 }}>
            📌 Pinned Bills
          </h2>
          <span style={{ fontSize: 12, color: "#64748b" }}>All saved bills are pinned here</span>
        </div>
        {(!data?.pinned_bills || data.pinned_bills.length === 0) ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 15 }}>
            No pinned bills yet. Create a new bill to get started!
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#1A4480", color: "#fff" }}>
                  {["Bill No", "Customer", "Phone", "Date", "Amount", "Status", "Action"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.pinned_bills.map((bill, i) => (
                  <tr key={bill.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff",
                    borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1A4480" }}>
                      {bill.bill_number}
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{bill.customer_name}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{bill.customer_phone}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{formatDate(bill.created_at)}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700 }}>₹{formatINR(bill.final_amount)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: 50, fontSize: 12, fontWeight: 600,
                        background: bill.payment_status === "paid" ? "#dcfce7" :
                                    bill.payment_status === "credit" ? "#fee2e2" : "#fef9c3",
                        color: bill.payment_status === "paid" ? "#166534" :
                               bill.payment_status === "credit" ? "#dc2626" : "#92400e" }}>
                        {bill.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <button onClick={() => navigate("history")}
                        style={{ background: "#1A4480", color: "#fff", border: "none",
                          borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
                        View
                      </button>
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
