import { useState } from "react";
import { adjustPrices, api } from "../api";

const TABS = ["PVC", "CPVC", "UPVC", "SWR Drainage", "GI & Brass", "Motors & Pumps",
  "Water Tanks", "Sanitary Ware", "Taps & Valves", "Column Pipes", "Solvents", "Miscellaneous", "New Items"];

export default function Settings({ token, role }) {
  const [adjTab, setAdjTab] = useState("PVC");
  const [adjType, setAdjType] = useState("percentage");
  const [adjValue, setAdjValue] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (role !== "owner") return (
    <div style={{ textAlign: "center", padding: 80, color: "#dc2626", fontSize: 18, fontWeight: 700 }}>
      🔒 Owner access only
    </div>
  );

  const handleAdjust = async () => {
    if (!adjValue) { setMsg("⚠️ Enter adjustment value"); return; }
    if (!window.confirm(`Adjust prices in ${adjTab} by ${adjType === "percentage" ? adjValue + "%" : "₹" + adjValue}?`)) return;
    setLoading(true); setMsg("");
    try {
      const res = await adjustPrices({
        tab_name: adjTab,
        adjustment_type: adjType,
        adjustment_value: parseFloat(adjValue)
      }, token);
      setMsg(`✅ ${res.message}`);
    } catch (e) { setMsg(`❌ Error: ${e.message}`); }
    finally { setLoading(false); }
  };

  const Section = ({ title, children }) => (
    <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <h3 style={{ margin: "0 0 20px", color: "#0B1F3A", fontSize: 16, fontWeight: 800 }}>{title}</h3>
      {children}
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1F3A", marginBottom: 24 }}>⚙️ Settings</h1>
      {msg && <div style={{ background: msg.includes("✅") ? "#dcfce7" : "#fee2e2",
        color: msg.includes("✅") ? "#166534" : "#dc2626", padding: "12px 16px",
        borderRadius: 10, marginBottom: 20, fontWeight: 600 }}>{msg}</div>}

      {/* Business Info */}
      <Section title="🏪 Business Information">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { label: "Business Name", value: "Sree Laxmidurga Agencies" },
            { label: "Phone", value: "8019093618" },
            { label: "Email", value: "sreelaxmidurgaagencies@gmail.com" },
            { label: "Website", value: "www.sreelaxmidurga.in" },
            { label: "Address", value: "Yemmiganur, Kurnool District, AP — 518 360" },
            { label: "Serving Since", value: "2009" },
          ].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{f.label}</label>
              <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: 14,
                fontWeight: 600, color: "#374151", border: "1.5px solid #e2e8f0" }}>{f.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: 14, background: "#fffbeb", borderRadius: 10,
          fontSize: 13, color: "#92400e" }}>
          ⚙️ To update business info, contact your developer. These are used on printed bills.
        </div>
      </Section>

      {/* Price Adjustment */}
      <Section title="💰 Price Adjustment (Google Sheets)">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Adjust prices across an entire category at once. This updates your Google Sheets price list directly.
          <br/><strong>⚠️ This action cannot be undone. Double-check before applying.</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Category Tab
            </label>
            <select value={adjTab} onChange={e => setAdjTab(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0",
                borderRadius: 10, fontSize: 14, outline: "none" }}>
              {TABS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Type
            </label>
            <select value={adjType} onChange={e => setAdjType(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0",
                borderRadius: 10, fontSize: 14, outline: "none" }}>
              <option value="percentage">% Increase</option>
              <option value="fixed">Fixed ₹ Increase</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Value
            </label>
            <input type="number" value={adjValue} onChange={e => setAdjValue(e.target.value)}
              placeholder={adjType === "percentage" ? "e.g. 10" : "e.g. 5"}
              style={{ width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0",
                borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <button onClick={handleAdjust} disabled={loading}
            style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 10,
              padding: "11px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" }}>
            {loading ? "Updating..." : "Apply ✓"}
          </button>
        </div>
        <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", borderRadius: 8, fontSize: 12, color: "#64748b" }}>
          Example: Select "PVC" → Type "Percentage" → Value "10" → Click Apply → All PVC prices increase by 10%
        </div>
      </Section>

      {/* Configuration Status */}
      <Section title="🔗 System Configuration">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Supabase Database", status: "Connected ✅", color: "#059669" },
            { label: "Google Sheets Price List", status: "Connected ✅", color: "#059669" },
            { label: "AiSensy WhatsApp API", status: "Configure in .env ⚙️", color: "#f59e0b" },
            { label: "UPI Payment Link", status: "Configure in .env ⚙️", color: "#f59e0b" },
            { label: "Bill Number Format", status: "SLD + YYMM + 0001 (auto)", color: "#6366f1" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderRadius: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.status}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* User Management */}
      <Section title="👥 User Access">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { role: "Owner (Dad)", user: "owner", access: "Full access — bills, reports, settings, delete", color: "#1A4480" },
            { role: "Worker", user: "worker", access: "Create bills, search products, print only", color: "#059669" },
          ].map(u => (
            <div key={u.user} style={{ padding: 16, background: "#f8fafc", borderRadius: 12,
              borderLeft: `4px solid ${u.color}` }}>
              <div style={{ fontWeight: 800, color: u.color, fontSize: 15, marginBottom: 4 }}>{u.role}</div>
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>Login: <code style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 4 }}>{u.user}</code></div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{u.access}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: 12, background: "#fffbeb", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
          ⚙️ To change passwords, update OWNER_PASSWORD and WORKER_PASSWORD in Railway environment variables.
        </div>
      </Section>
    </div>
  );
}
