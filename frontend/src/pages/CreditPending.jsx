import { useState, useEffect } from "react";
import { getCreditReminders, getBills, updatePayment, formatINR, formatDate } from "../api";

export default function CreditPending({ token }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try { setBills(await getBills({ status: "credit" }, token)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleMarkPaid = async (bill) => {
    if (!window.confirm(`Mark ${bill.bill_number} as PAID?`)) return;
    try {
      await updatePayment(bill.id, "paid", "cash", null, token);
      setMsg(`✅ Bill ${bill.bill_number} marked as Paid!`);
      load();
    } catch (e) { setMsg("❌ Error"); }
  };

  const totalCredit = bills.reduce((s, b) => s + (b.final_amount || 0), 0);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1F3A", marginBottom: 24 }}>⏳ Credit / Pending Bills</h1>
      {msg && <div style={{ background: "#dcfce7", color: "#166534", padding: "12px 16px",
        borderRadius: 10, marginBottom: 16, fontWeight: 600 }}>{msg}</div>}
      <div style={{ background: "#fee2e2", borderRadius: 16, padding: 24, marginBottom: 20,
        borderLeft: "6px solid #dc2626" }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#dc2626" }}>₹{formatINR(totalCredit)}</div>
        <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
          Total Outstanding Credit — {bills.length} bills pending
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading...</div> :
          bills.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No pending bills! 🎉</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#dc2626", color: "#fff" }}>
                  {["Bill No", "Customer", "Phone", "Date", "Amount", "Days Pending", "Action"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bills.map((bill, i) => {
                  const days = Math.floor((new Date() - new Date(bill.created_at)) / 86400000);
                  return (
                    <tr key={bill.id} style={{ background: i % 2 === 0 ? "#fff5f5" : "#fff",
                      borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#dc2626" }}>{bill.bill_number}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{bill.customer_name}</td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{bill.customer_phone}</td>
                      <td style={{ padding: "10px 12px", color: "#64748b", whiteSpace: "nowrap" }}>{formatDate(bill.created_at)}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700 }}>₹{formatINR(bill.final_amount)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: days > 15 ? "#fee2e2" : days > 7 ? "#fef9c3" : "#f0fdf4",
                          color: days > 15 ? "#dc2626" : days > 7 ? "#92400e" : "#166534",
                          padding: "3px 10px", borderRadius: 50, fontSize: 12, fontWeight: 700 }}>
                          {days} days
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => handleMarkPaid(bill)}
                          style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 6,
                            padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          ✅ Mark Paid
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
