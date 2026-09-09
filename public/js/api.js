const API_BASE = "/api";

function getToken() { return localStorage.getItem("agridirect_token"); }
function getUser() {
  try { return JSON.parse(localStorage.getItem("agridirect_user")); }
  catch { return null; }
}
function saveSession(token, user) {
  localStorage.setItem("agridirect_token", token);
  localStorage.setItem("agridirect_user", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("agridirect_token");
  localStorage.removeItem("agridirect_user");
}

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = `Bearer ${getToken()}`;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function requireLogin(role) {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = "/index.html";
    return null;
  }
  if (role && user.role !== role) {
    window.location.href = user.role === "farmer" ? "/farmer.html" : "/buyer.html";
    return null;
  }
  return user;
}

function logout() {
  clearSession();
  window.location.href = "/index.html";
}
