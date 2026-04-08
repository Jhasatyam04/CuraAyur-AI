document.addEventListener("DOMContentLoaded", () => {
  const PROTECTED_PAGES = ["cardio.html", "diabetes.html", "breast_cancer.html"];
  const AUTH_KEY = "curaayurAuth";
  const SESSION_KEY = "curaayurSession";

  const getApiBaseUrl = () => {
    if (window.location.protocol === "file:") {
      return "http://localhost:5000/api";
    }

    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5000/api";
    }

    return `${window.location.origin}/api`;
  };

  const API_BASE = getApiBaseUrl();

  const getCurrentPage = () => {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf("/") + 1).toLowerCase();
  };

  const isAuthenticated = async () => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return false;

      const data = JSON.parse(raw);
      const hasSessionMarker = sessionStorage.getItem(SESSION_KEY) === "active";
      const isValidShape = Boolean(data && data.isAuthenticated === true);
      const hasExpiry = typeof data.expiresAt === "number";
      const isNotExpired = hasExpiry && Date.now() < data.expiresAt;

      if (!isValidShape || !hasSessionMarker || !isNotExpired) {
        localStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }

      const me = await fetch(`${API_BASE}/auth/me`, {
        method: "GET",
        credentials: "include",
      });

      if (!me.ok) {
        localStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }

      return true;
    } catch {
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
  };

  const redirectToLogin = (targetPage) => {
    const next = encodeURIComponent(targetPage);
    window.location.href = `login.html?next=${next}`;
  };

  const currentPage = getCurrentPage();
  const protectedSet = new Set(PROTECTED_PAGES);

  if (protectedSet.has(currentPage)) {
    isAuthenticated().then((ok) => {
      if (!ok) {
        redirectToLogin(currentPage);
      }
    });
  }

  document.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    const normalized = href.toLowerCase();
    if (!protectedSet.has(normalized)) return;

    link.addEventListener("click", async (event) => {
      event.preventDefault();

      const ok = await isAuthenticated();
      if (ok) {
        window.location.href = normalized;
        return;
      }

      redirectToLogin(normalized);
    });
  });
});
