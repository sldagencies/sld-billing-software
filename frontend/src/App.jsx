import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewBill from "./pages/NewBill";
import BillsHistory from "./pages/BillsHistory";
import CustomerLedger from "./pages/CustomerLedger";
import CreditPending from "./pages/CreditPending";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Navbar from "./components/Navbar";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("sld_token"));
  const [role, setRole] = useState(localStorage.getItem("sld_role"));
  const [username, setUsername] = useState(localStorage.getItem("sld_user"));
  const [page, setPage] = useState("dashboard");

  const handleLogin = (data) => {
    localStorage.setItem("sld_token", data.access_token);
    localStorage.setItem("sld_role", data.role);
    localStorage.setItem("sld_user", data.username);
    setToken(data.access_token);
    setRole(data.role);
    setUsername(data.username);
    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null); setRole(null); setUsername(null);
  };

  if (!token) return <Login onLogin={handleLogin} />;

  const pages = {
    dashboard: <Dashboard token={token} role={role} navigate={setPage} />,
    newbill: <NewBill token={token} role={role} navigate={setPage} />,
    history: <BillsHistory token={token} role={role} navigate={setPage} />,
    customers: <CustomerLedger token={token} role={role} />,
    credit: <CreditPending token={token} role={role} />,
    reports: <Reports token={token} role={role} />,
    settings: <Settings token={token} role={role} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "Inter, Arial, sans-serif" }}>
      <Navbar page={page} setPage={setPage} role={role} username={username} onLogout={handleLogout} />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
        {pages[page] || pages.dashboard}
      </div>
    </div>
  );
}
