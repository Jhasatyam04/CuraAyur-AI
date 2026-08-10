document.addEventListener("DOMContentLoaded", () => {
  const AUTH_KEY = "curaayurAuth";
  const SESSION_KEY = "curaayurSession";

  const notify = (message, options = {}) => {
    if (window.CuraAyurNotify && typeof window.CuraAyurNotify.show === "function") {
      window.CuraAyurNotify.show(message, options);
      return;
    }

    window.console.warn(message);
  };

  const layout = document.getElementById("authLayout");
  if (!layout) return;

  const toggleButtons = document.querySelectorAll(".toggle-btn");
  const switchLinks = document.querySelectorAll(".link-btn");
  const formsWrapper = document.querySelector(".auth-forms");
  const forms = {
    login: document.getElementById("loginForm"),
    signup: document.getElementById("signupForm"),
  };

  let activeMode = null;

  const params = new URLSearchParams(window.location.search);
  const nextPath = params.get("next");

  const isSafeInternalPath = (path) => {
    if (!path) return false;
    return /^[a-zA-Z0-9_\-./]+\.html(?:#[a-zA-Z0-9_\-./]+)?$/.test(path);
  };

  const getRedirectPath = () => {
    return "cardio.html";
  };

  if (isSafeInternalPath(nextPath)) {
    window.setTimeout(() => {
      notify("Please log in or sign up to continue.", { title: "Authentication Required", type: "info" });
    }, 120);
  }

  const setAuthenticated = ({ mode, user, token, expiresInSec }) => {
    const now = Date.now();
    const ttl = Number(expiresInSec) > 0 ? Number(expiresInSec) * 1000 : 12 * 60 * 60 * 1000;
    const authData = {
      isAuthenticated: true,
      mode,
      user,
      token,
      at: new Date(now).toISOString(),
      expiresAt: now + ttl,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    sessionStorage.setItem(SESSION_KEY, "active");
  };

  const clearAuth = () => {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const setMode = (mode) => {
    if (!forms[mode]) return;

    if (activeMode === mode) {
      return;
    }

    if (formsWrapper) {
      formsWrapper.classList.remove("is-switching");
      void formsWrapper.offsetWidth;
      formsWrapper.classList.add("is-switching");
      window.setTimeout(() => formsWrapper.classList.remove("is-switching"), 460);
    }

    Object.entries(forms).forEach(([key, form]) => {
      form.classList.toggle("is-active", key === mode);
    });

    toggleButtons.forEach((btn) => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });

    if (mode === "signup") {
      window.history.replaceState({}, "", "#signup");
    } else {
      window.history.replaceState({}, "", "#login");
    }

    activeMode = mode;
  };

  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  switchLinks.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  if (forms.login) {
    forms.login.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!forms.login.checkValidity()) {
        notify("Please enter your email and password to log in.", { title: "Missing Details", type: "error" });
        forms.login.reportValidity();
        return;
      }

      const emailInput = forms.login.querySelector("#login-email");
      const passwordInput = forms.login.querySelector("#login-password");

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailInput.value.trim().toLowerCase(),
            password: passwordInput.value
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Login failed');
        }

        setAuthenticated({
          mode: "login",
          user: result.data.user,
          token: result.data.token,
          expiresInSec: 12 * 60 * 60,
        });
        window.location.href = getRedirectPath();
      } catch (error) {
        clearAuth();
        notify(error.message || "Unable to log in right now", { title: "Login Failed", type: "error" });
      }
    });
  }

  if (forms.signup) {
    forms.signup.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!forms.signup.checkValidity()) {
        forms.signup.reportValidity();
        return;
      }

      const password = forms.signup.querySelector("#signup-password");
      const confirm = forms.signup.querySelector("#signup-confirm");
      if (password && confirm && password.value !== confirm.value) {
        confirm.setCustomValidity("Passwords do not match");
        confirm.reportValidity();
        confirm.setCustomValidity("");
        return;
      }

      const nameInput = forms.signup.querySelector("#signup-name");
      const emailInput = forms.signup.querySelector("#signup-email");

      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameInput.value.trim(),
            email: emailInput.value.trim().toLowerCase(),
            password: password.value
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Signup failed');
        }

        setAuthenticated({
          mode: "signup",
          user: result.data.user,
          token: result.data.token,
          expiresInSec: 12 * 60 * 60,
        });
        window.location.href = getRedirectPath();
      } catch (error) {
        clearAuth();
        notify(error.message || "Unable to create account right now", { title: "Signup Failed", type: "error" });
      }
    });
  }

  const hashMode = window.location.hash === "#signup" ? "signup" : "login";
  setMode(hashMode);
});
