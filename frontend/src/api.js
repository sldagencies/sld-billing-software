const BASE = import.meta.env.VITE_API_URL || "https://sld-billing-software-production.up.railway.app";

export async function api(path, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error (${res.status})`);
    }
    return res.json();
  } catch (err) {
    if (err.message === "Failed to fetch") {
      throw new Error("Cannot connect to server. Please check your internet connection.");
    }
    throw err;
  }
}

export const login = (u, p) => api("/api/login", "POST", { username: u, password: p });
export const searchProducts = (q, t) => api(`/api/products/search?q=${encodeURIComponent(q)}`, "GET", null, t);
export const createBill = (b, t) => api("/api/bills", "POST", b, t);
export const getBills = (p, t) => { const q = new URLSearchParams(p).toString(); return api(`/api/bills?${q}`, "GET", null, t); };
export const getPinnedBills = (t) => api("/api/bills/pinned", "GET", null, t);
export const getBill = (id, t) => api(`/api/bills/${id}`, "GET", null, t);
export const createReturn = (id, d, t) => api(`/api/bills/${id}/return`, "POST", d, t);
export const getReturns = (id, t) => api(`/api/bills/${id}/returns`, "GET", null, t);
export const getDashboard = (t) => api("/api/dashboard", "GET", null, t);
export const getReport = (p, t) => api(`/api/reports/summary?period=${p}`, "GET", null, t);
export const getCustomers = (s, t) => api(`/api/customers${s ? `?search=${s}` : ""}`, "GET", null, t);
export const getCustomerBills = (ph, t) => api(`/api/customers/${ph}/bills`, "GET", null, t);
export const getCreditReminders = (t) => api("/api/credit-reminders", "GET", null, t);
export const updatePayment = (id, s, m, u, t) => { let url = `/api/bills/${id}/payment?payment_status=${s}&payment_method=${m}`; if (u) url += `&upi_id=${u}`; return api(url, "PATCH", null, t); };
export const togglePin = (id, p, t) => api(`/api/bills/${id}/pin?pinned=${p}`, "PATCH", null, t);
export const deleteBill = (id, t) => api(`/api/bills/${id}`, "DELETE", null, t);
export const addNewItem = (item, t) => api("/api/products/new", "POST", item, t);
export const adjustPrices = (d, t) => api("/api/products/adjust-price", "POST", d, t);

export const formatINR = (n) => {
  if (!n && n !== 0) return "0.00";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

export const formatDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
};
