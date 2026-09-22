const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function api(path, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const login = (username, password) =>
  api("/api/login", "POST", { username, password });

export const searchProducts = (q, token) =>
  api(`/api/products/search?q=${encodeURIComponent(q)}`, "GET", null, token);

export const createBill = (bill, token) =>
  api("/api/bills", "POST", bill, token);

export const getBills = (params, token) => {
  const q = new URLSearchParams(params).toString();
  return api(`/api/bills?${q}`, "GET", null, token);
};

export const getPinnedBills = (token) =>
  api("/api/bills/pinned", "GET", null, token);

export const getBill = (id, token) =>
  api(`/api/bills/${id}`, "GET", null, token);

export const createReturn = (billId, data, token) =>
  api(`/api/bills/${billId}/return`, "POST", data, token);

export const getReturns = (billId, token) =>
  api(`/api/bills/${billId}/returns`, "GET", null, token);

export const getDashboard = (token) =>
  api("/api/dashboard", "GET", null, token);

export const getReport = (period, token) =>
  api(`/api/reports/summary?period=${period}`, "GET", null, token);

export const getCustomers = (search, token) =>
  api(`/api/customers${search ? `?search=${search}` : ""}`, "GET", null, token);

export const getCustomerBills = (phone, token) =>
  api(`/api/customers/${phone}/bills`, "GET", null, token);

export const getCreditReminders = (token) =>
  api("/api/credit-reminders", "GET", null, token);

export const updatePayment = (billId, status, method, upiId, token) => {
  let url = `/api/bills/${billId}/payment?payment_status=${status}&payment_method=${method}`;
  if (upiId) url += `&upi_id=${upiId}`;
  return api(url, "PATCH", null, token);
};

export const togglePin = (billId, pinned, token) =>
  api(`/api/bills/${billId}/pin?pinned=${pinned}`, "PATCH", null, token);

export const deleteBill = (billId, token) =>
  api(`/api/bills/${billId}`, "DELETE", null, token);

export const addNewItem = (item, token) =>
  api("/api/products/new", "POST", item, token);

export const adjustPrices = (data, token) =>
  api("/api/products/adjust-price", "POST", data, token);

// Format Indian number
export const formatINR = (n) => {
  if (!n && n !== 0) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

export const formatDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
};
