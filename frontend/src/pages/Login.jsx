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
      setError("Invalid username or password. Please try again.");
    } finally { setLoading(false); }
  };

  const inp = {
    width: "100%", padding: "12px 16px", border: "1.5px solid #d1d5db",
    borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box",
    background: "#fff", color: "#111827"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0B1F3A 0%, #1A4480 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 420,
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)", overflow: "hidden"
      }}>
        {/* Header with logo */}
        <div style={{
          background: "linear-gradient(135deg, #0B1F3A, #1A4480)",
          padding: "32px 32px 24px", textAlign: "center"
        }}>
          {/* Logo */}
          <div style={{ marginBottom: 16 }}>
            <img
              src="/logo.png"
              alt="Sree Laxmidurga Agencies"
              style={{ height: 90, objectFit: "contain" }}
              onError={e => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
            <div style={{
              display: "none", width: 80, height: 80, background: "#E8A020",
              borderRadius: 16, alignItems: "center", justifyContent: "center",
              margin: "0 auto", fontSize: 28, fontWeight: 900, color: "#0B1F3A"
            }}>SLD</div>
          </div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
            Sree Laxmidurga Agencies
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>
            Billing Software — Yemmiganur
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: "28px 32px 32px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Username
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="owner  /  worker"
                style={inp}
                onFocus={e => e.target.style.borderColor = "#1A4480"}
                onBlur={e => e.target.style.borderColor = "#d1d5db"}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                style={inp}
                onFocus={e => e.target.style.borderColor = "#1A4480"}
                onBlur={e => e.target.style.borderColor = "#d1d5db"}
              />
            </div>
            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
                padding: "10px 14px", borderRadius: 8, fontSize: 13,
                marginBottom: 16, textAlign: "center"
              }}>{error}</div>
            )}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px", background: "#1A4480", color: "#fff",
              border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              transition: "all 0.2s"
            }}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div style={{
            marginTop: 20, padding: "12px 16px", background: "#f8fafc",
            borderRadius: 10, textAlign: "center", fontSize: 13, color: "#64748b",
            borderTop: "1px solid #e2e8f0"
          }}>
            <strong>8019093618</strong> &nbsp;|&nbsp; Yemmiganur, Kurnool District, AP
          </div>
        </div>
      </div>
    </div>
  );
}
