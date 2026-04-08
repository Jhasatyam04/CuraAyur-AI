(() => {
  const ensureLayer = () => {
    let layer = document.querySelector(".toast-layer");
    if (layer) return layer;

    layer = document.createElement("div");
    layer.className = "toast-layer";
    layer.setAttribute("aria-live", "polite");
    layer.setAttribute("aria-atomic", "true");
    document.body.appendChild(layer);
    return layer;
  };

  const showToast = (message, options = {}) => {
    const layer = ensureLayer();
    const toast = document.createElement("div");
    const tone = options.type || "info";
    const title = options.title || (tone === "success" ? "Success" : tone === "error" ? "Error" : "Notice");

    toast.className = `toast toast--${tone}`;
    toast.innerHTML = `
      <div class="toast__title">${title}</div>
      <div class="toast__message">${message}</div>
    `;

    layer.appendChild(toast);

    const duration = typeof options.duration === "number" ? options.duration : 3600;
    window.setTimeout(() => {
      toast.style.animation = "toastOut 0.24s ease forwards";
      window.setTimeout(() => toast.remove(), 240);
    }, duration);

    return toast;
  };

  window.CuraAyurNotify = {
    show: showToast,
  };
})();
