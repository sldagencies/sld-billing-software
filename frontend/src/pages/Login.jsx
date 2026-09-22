import { useState } from "react";
import { login } from "../api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await login(username, password);
      onLogin(data);
    } catch (err) {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0B1F3A,#1A4480)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 48, width: "100%",
        maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 72, height: 72, background: "#1A4480", borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 32, color: "#E8A020", fontWeight: 900 }}>S</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0B1F3A", margin: 0 }}>
            Sree Laxmidurga Agencies
          </h1>
          <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 14 }}>
            Billing Software — Login
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Username
            </label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="owner / worker"
              style={{ width: "100%", padding: "12px 16px", border: "2px solid #e2e8f0",
                borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box",
                transition: "border 0.2s" }}
              onFocus={e => e.target.style.borderColor = "#1A4480"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ width: "100%", padding: "12px 16px", border: "2px solid #e2e8f0",
                borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "#1A4480"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </div>
          {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px",
            borderRadius: 8, fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "14px", background: "#1A4480", color: "#fff",
              border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Logging in..." : "Login →"}
          </button>
        </form>
        <div style={{ marginTop: 24, padding: "16px", background: "#f8fafc",
          borderRadius: 10, fontSize: 13, color: "#64748b", textAlign: "center" }}>
          📞 8019093618 | Yemmiganur, Kurnool District, AP
        </div>
      </div>
    </div>
  );
}
