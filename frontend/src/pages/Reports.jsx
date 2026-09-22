import { useState, useEffect } from "react";
import { getReport, formatINR } from "../api";

export default function Reports({ token, role }) {
  const [period, setPeriod] = useState("monthly");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try { setData(await getReport(period, token)); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [period]);

  if (role !== "owner") return (
    <div style={{ textAlign: "center", padding: 80, color: "#dc2626", fontSize: 18, fontWeight: 700 }}>
      🔒 Owner access only
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1F3A", margin: 0 }}>📊 Reports</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {[["daily", "Today"], ["weekly", "This Week"], ["monthly", "This Month"]].map(([val, label]) => (
            <button key={val} onClick={() => setPeriod(val)}
              style={{ padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                border: "2px solid #1A4480", background: period === val ? "#1A4480" : "#fff",
                color: period === val ? "#fff" : "#1A4480" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>Loading report...</div>
      ) : data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total Revenue", value: `₹${formatINR(data.total_revenue)}`, color: "#1A4480", icon: "💰" },
              { label: "GST Collected", value: `₹${formatINR(data.total_gst_collected)}`, color: "#6366f1", icon: "🧾" },
              { label: "Bills Generated", value: data.bill_count, color: "#059669", icon: "📋" },
              { label: "Paid Bills", value: data.paid_count, color: "#059669", icon: "✅" },
              { label: "Credit Bills", value: data.credit_count, color: "#dc2626", icon: "⏳" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 16, padding: 24,
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderLeft: `5px solid ${s.color}`, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 16px", color: "#0B1F3A", fontSize: 16, fontWeight: 800 }}>🏆 Top Selling Products</h3>
            {(data.top_items || []).map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ width: 28, height: 28, background: "#1A4480", color: "#fff",
                  borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{item.name}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>₹{formatINR(item.amount)}</span>
              </div>
            ))}
            {(!data.top_items || data.top_items.length === 0) && (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>No data yet</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
