export default function Navbar({ page, setPage, role, username, onLogout }) {
  const s = (id) => ({
    padding: "10px 16px", cursor: "pointer", borderRadius: 8, fontSize: 14,
    fontWeight: 600, border: "none", background: page === id ? "#1A4480" : "transparent",
    color: page === id ? "#fff" : "#334155", transition: "all 0.2s"
  });

  const navItems = [
    { id: "dashboard", label: "🏠 Dashboard" },
    { id: "newbill", label: "➕ New Bill" },
    { id: "history", label: "📋 Bills History" },
    { id: "customers", label: "👥 Customers" },
    { id: "credit", label: "⏳ Credit/Pending" },
    ...(role === "owner" ? [{ id: "reports", label: "📊 Reports" }] : []),
    ...(role === "owner" ? [{ id: "settings", label: "⚙️ Settings" }] : []),
  ];

  return (
    <div style={{ background: "#fff", borderBottom: "2px solid #e2e8f0", padding: "0 24px",
      display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", position: "sticky",
      top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 24, padding: "10px 0" }}>
        <div style={{ background: "#1A4480", borderRadius: 8, width: 36, height: 36,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#E8A020", fontSize: 18, fontWeight: 900 }}>S</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#0B1F3A" }}>SLD Billing</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Sree Laxmidurga Agencies</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, flex: 1, flexWrap: "wrap" }}>
        {navItems.map(n => (
          <button key={n.id} style={s(n.id)} onClick={() => setPage(n.id)}>{n.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
        <div style={{ fontSize: 13, color: "#475569" }}>
          👤 <strong>{username}</strong>
          <span style={{ marginLeft: 6, background: role === "owner" ? "#1A4480" : "#059669",
            color: "#fff", borderRadius: 50, padding: "2px 8px", fontSize: 11 }}>
            {role}
          </span>
        </div>
        <button onClick={onLogout} style={{ background: "#fee2e2", color: "#dc2626",
          border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13,
          fontWeight: 600, cursor: "pointer" }}>Logout</button>
      </div>
    </div>
  );
}
