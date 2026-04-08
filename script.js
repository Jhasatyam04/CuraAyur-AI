/* ===================================================================
   Disease Prediction App - Core Interaction Script
   =================================================================== */

document.addEventListener("DOMContentLoaded", () => {
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

  const isAuthenticated = async () => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return false;

      const data = JSON.parse(raw);
      const hasSessionMarker = sessionStorage.getItem(SESSION_KEY) === "active";
      const hasExpiry = typeof data.expiresAt === "number";
      const isNotExpired = hasExpiry && Date.now() < data.expiresAt;

      if (!Boolean(data && data.isAuthenticated === true && hasSessionMarker && isNotExpired)) {
        return false;
      }

      const me = await fetch(`${API_BASE}/auth/me`, {
        method: "GET",
        credentials: "include",
      });

      return me.ok;
    } catch {
      return false;
    }
  };

  const updateNavState = async () => {
    const guestItems = document.querySelectorAll(".nav-auth-guest");
    const userItems = document.querySelectorAll(".nav-auth-user");

    const signedIn = await isAuthenticated();

    guestItems.forEach((item) => {
      item.classList.toggle("is-hidden", signedIn);
    });

    userItems.forEach((item) => {
      item.hidden = !signedIn;
    });
  };

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;

      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  const mobileToggle = document.querySelector(".mobile-menu-toggle");
  const mobileDrawer = document.querySelector(".mobile-drawer");
  const closeTriggers = document.querySelectorAll("[data-mobile-close]");
  const mobileDrawerLinks = document.querySelectorAll(".mobile-drawer-nav a");
  const logoutButtons = document.querySelectorAll("#desktop-logout, #mobile-logout");

  logoutButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();

      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Continue local cleanup even if backend call fails.
      }

      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = "index.html";
    });
  });

  updateNavState();

  if (mobileToggle && mobileDrawer) {
    const openDrawer = () => {
      document.body.classList.add("drawer-open");
      mobileToggle.setAttribute("aria-expanded", "true");
      mobileDrawer.setAttribute("aria-hidden", "false");
    };

    const closeDrawer = () => {
      document.body.classList.remove("drawer-open");
      mobileToggle.setAttribute("aria-expanded", "false");
      mobileDrawer.setAttribute("aria-hidden", "true");
    };

    mobileToggle.addEventListener("click", openDrawer);

    closeTriggers.forEach((trigger) => {
      trigger.addEventListener("click", closeDrawer);
    });

    mobileDrawerLinks.forEach((link) => {
      link.addEventListener("click", closeDrawer);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) closeDrawer();
    });
  }
});
