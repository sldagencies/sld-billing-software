import { useState, useEffect } from "react";
import { getDashboard, formatINR, formatDate } from "../api";

export default function Dashboard({ token, role, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setData(await getDashboard(token)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const StatCard = ({ label, value, isMoney, color, border }) => (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "20px 24px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: `4px solid ${border || color}`
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color, fontVariantNumeric: "tabular-nums" }}>
        {isMoney ? `Rs.${formatINR(value)}` : value}
      </div>
      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good Morning" : now.getHours() < 17 ? "Good Afternoon" : "Good Evening";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (loading) return (
    <div style={{ textAlign: "center", padding: 80, color: "#6b7280", fontSize: 15 }}>
      Loading...
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1F3A", margin: "0 0 4px" }}>
            {greeting}
          </h1>
          <p style={{ color: "#6b7280", margin: 0, fontSize: 14 }}>{dateStr}</p>
        </div>
        <button onClick={() => navigate("newbill")} style={{
          background: "#1A4480", color: "#fff", border: "none", borderRadius: 10,
          padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer"
        }}>
          New Bill
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Today's Sales" value={data?.today_sales || 0} isMoney color="#1A4480" border="#1A4480" />
        <StatCard label="Today's Bills" value={data?.today_bill_count || 0} color="#059669" border="#059669" />
        <StatCard label="Credit Pending" value={data?.total_credit_pending || 0} isMoney color="#dc2626" border="#dc2626" />
        <StatCard label="Pending Bills" value={data?.credit_bill_count || 0} color="#f59e0b" border="#f59e0b" />
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10, marginBottom: 28 }}>
        {[
          { label: "Bills History", page: "history", color: "#6366f1" },
          { label: "Customers", page: "customers", color: "#059669" },
          { label: "Credit / Pending", page: "credit", color: "#dc2626" },
          ...(role === "owner" ? [
            { label: "Reports", page: "reports", color: "#0ea5e9" },
            { label: "Settings", page: "settings", color: "#64748b" },
          ] : [])
        ].map(item => (
          <button key={item.page} onClick={() => navigate(item.page)} style={{
            background: "#fff", border: `1.5px solid ${item.color}`, borderRadius: 10,
            padding: "13px 10px", fontSize: 13, fontWeight: 600, color: item.color,
            cursor: "pointer", transition: "all 0.15s"
          }}
            onMouseEnter={e => { e.target.style.background = item.color; e.target.style.color = "#fff"; }}
            onMouseLeave={e => { e.target.style.background = "#fff"; e.target.style.color = item.color; }}>
            {item.label}
          </button>
        ))}
      </div>

      {/* Pinned Bills */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0B1F3A", margin: 0 }}>Pinned Bills</h2>
          <button onClick={load} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "#64748b", cursor: "pointer" }}>Refresh</button>
        </div>
        {(!data?.pinned_bills || data.pinned_bills.length === 0) ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 14 }}>
            No pinned bills yet. Create a new bill to get started.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#1A4480", color: "#fff" }}>
                  {["Bill No", "Customer", "Phone", "Date", "Amount", "Status", "Action"].map(h => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.pinned_bills.map((bill, i) => (
                  <tr key={bill.id} style={{ background: i % 2 === 0 ? "#f9fafb" : "#fff", borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 700, color: "#1A4480" }}>{bill.bill_number}</td>
                    <td style={{ padding: "9px 12px", fontWeight: 600 }}>{bill.customer_name}</td>
                    <td style={{ padding: "9px 12px", color: "#6b7280" }}>{bill.customer_phone}</td>
                    <td style={{ padding: "9px 12px", color: "#6b7280", whiteSpace: "nowrap" }}>{formatDate(bill.created_at)}</td>
                    <td style={{ padding: "9px 12px", fontWeight: 700 }}>Rs.{formatINR(bill.final_amount)}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600,
                        background: bill.payment_status === "paid" ? "#dcfce7" : bill.payment_status === "credit" ? "#fee2e2" : "#fef9c3",
                        color: bill.payment_status === "paid" ? "#166534" : bill.payment_status === "credit" ? "#dc2626" : "#92400e"
                      }}>
                        {bill.payment_status === "paid" ? "Paid" : bill.payment_status === "credit" ? "Credit" : "Partial"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <button onClick={() => navigate("history")} style={{
                        background: "#eff6ff", color: "#1A4480", border: "1px solid #1A4480",
                        borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600
                      }}>View</button>
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
