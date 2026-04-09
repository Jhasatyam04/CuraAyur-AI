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
  const googleButton = document.querySelector(".btn-google");
  const forms = {
    login: document.getElementById("loginForm"),
    signup: document.getElementById("signupForm"),
  };

  let activeMode = null;
  let googleClientId = "";
  let googleTokenClient = null;
  let googleAuthInProgress = false;

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

  const setAuthenticated = ({ mode, user, expiresInSec }) => {
    const now = Date.now();
    const ttl = Number(expiresInSec) > 0 ? Number(expiresInSec) * 1000 : 12 * 60 * 60 * 1000;
    const authData = {
      isAuthenticated: true,
      mode,
      user,
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

  const requestAuth = async (path, payload) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Authentication failed");
    }

    return data;
  };

  const fetchGoogleConfig = async () => {
    const response = await fetch(`${API_BASE}/auth/google/config`, {
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error("Unable to load Google login config");
    }

    if (!data.enabled || !data.clientId) {
      throw new Error("Google login is not configured yet");
    }

    googleClientId = data.clientId;
    return data.clientId;
  };

  const setGoogleButtonState = (isLoading) => {
    if (!googleButton) return;
    googleButton.disabled = isLoading;
    googleButton.style.opacity = isLoading ? "0.75" : "1";
    googleButton.style.cursor = isLoading ? "not-allowed" : "pointer";
  };

  const handleGoogleSuccess = async (accessToken) => {
    const result = await requestAuth("/auth/google", { accessToken });

    setAuthenticated({
      mode: "google",
      user: result.user,
      expiresInSec: result.expiresInSec,
    });

    window.location.href = getRedirectPath();
  };

  const ensureGoogleTokenClient = async () => {
    if (googleTokenClient) {
      return googleTokenClient;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      throw new Error("Google SDK did not load. Please try again.");
    }

    if (!googleClientId) {
      await fetchGoogleConfig();
    }

    googleTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: "openid email profile",
      callback: async (tokenResponse) => {
        if (!tokenResponse || tokenResponse.error || !tokenResponse.access_token) {
          const message = tokenResponse && tokenResponse.error ? "Google login was cancelled or blocked." : "Google login failed. Please try again.";
          notify(message, { title: "Google Login", type: "error" });
          googleAuthInProgress = false;
          setGoogleButtonState(false);
          return;
        }

        try {
          await handleGoogleSuccess(tokenResponse.access_token);
        } catch (error) {
          clearAuth();
          notify(error.message || "Unable to complete Google login.", { title: "Google Login", type: "error" });
        } finally {
          googleAuthInProgress = false;
          setGoogleButtonState(false);
        }
      },
    });

    return googleTokenClient;
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
        const result = await requestAuth("/auth/login", {
          email: emailInput ? emailInput.value.trim() : "",
          password: passwordInput ? passwordInput.value : "",
        });

        setAuthenticated({
          mode: "login",
          user: result.user,
          expiresInSec: result.expiresInSec,
        });
        window.location.href = getRedirectPath();
      } catch (error) {
        clearAuth();
        if (error.message === "Invalid credentials") {
          notify("Invalid email or password. If you are new, please sign up first.", { title: "Login Failed", type: "error" });
          return;
        }

        notify(error.message || "Unable to log in right now", { title: "Login Failed", type: "error" });
      }
    });
  }

  if (googleButton) {
    googleButton.addEventListener("click", async () => {
      if (googleAuthInProgress) {
        return;
      }

      googleAuthInProgress = true;
      setGoogleButtonState(true);

      try {
        const tokenClient = await ensureGoogleTokenClient();
        tokenClient.requestAccessToken({ prompt: "consent" });
      } catch (error) {
        googleAuthInProgress = false;
        setGoogleButtonState(false);
        notify(error.message || "Google login is unavailable right now.", { title: "Google Login", type: "error" });
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
        const result = await requestAuth("/auth/signup", {
          name: nameInput ? nameInput.value.trim() : "",
          email: emailInput ? emailInput.value.trim() : "",
          password: password ? password.value : "",
        });

        setAuthenticated({
          mode: "signup",
          user: result.user,
          expiresInSec: result.expiresInSec,
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