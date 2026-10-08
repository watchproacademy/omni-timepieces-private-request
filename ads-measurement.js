// Standard Google Ads measurement. No form fields or enhanced-conversion data.
(() => {
  if (window.location.hostname !== "concierge.omnitimepieces.com") return;
  if (navigator.globalPrivacyControl || navigator.doNotTrack === "1") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("set", "allow_ad_personalization_signals", false);
  window.gtag("config", "AW-18487089756", { allow_ad_personalization_signals: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=AW-18487089756";
  document.head.appendChild(script);

  const recorded = new Set();
  window.addEventListener("omni:funnel", (event) => {
    const detail = event.detail || {};
    if (detail.event !== "private_request_submitted" || detail.preview !== false || !detail.requestId) return;
    if (recorded.has(detail.requestId)) return;
    recorded.add(detail.requestId);
    window.gtag("event", "conversion", {
      send_to: "AW-18487089756/VsDXCMynl40dENy0qu9E",
      transaction_id: detail.requestId,
      value: 0,
      currency: "USD",
    });
  });
})();
