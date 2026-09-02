const crypto = require("node:crypto");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeRequestId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const token = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `WR-${date}-${token}`;
}

function tradeInsFor(body) {
  if (Array.isArray(body.tradeIns) && body.tradeIns.length) return body.tradeIns;
  if (body.tradeIn !== "Yes") return [];
  return [{
    brand: body.tradeBrand,
    model: body.tradeModel,
    reference: body.tradeReference,
    year: body.tradeYear,
    dial: body.tradeDial,
    bracelet: body.tradeBracelet,
    condition: body.tradeCondition,
    set: body.tradeSet,
    expectedValue: body.tradeExpectedValue,
    currency: "USD",
  }];
}

function requiredFields(body) {
  const required = ["brand", "model", "occasion", "budget", "condition", "timeline", "tradeIn", "fullName", "preferredContact", "location"];
  const missing = required.filter((field) => !String(body[field] || "").trim());
  if (body.tradeIn === "Yes") {
    const trades = tradeInsFor(body);
    if (!trades.length) missing.push("tradeIns");
    trades.forEach((trade, index) => {
      ["brand", "model", "condition", "set"].forEach((field) => {
        if (!String(trade?.[field] || "").trim()) missing.push(`tradeIns.${index}.${field}`);
      });
    });
  }
  return missing;
}

function requestEmailHtml(body, requestId) {
  const watches = Array.isArray(body.watches) && body.watches.length ? body.watches : [body];
  const tradeIns = tradeInsFor(body);
  const watchRows = watches.flatMap((watch, index) => [
    [`Watch ${index + 1}`, `${watch.brand} ${watch.model}`],
    [`Watch ${index + 1} reference`, watch.reference || "Needs identification"],
    [`Watch ${index + 1} configuration`, [watch.year, watch.caseMaterial, watch.dial, watch.bracelet].filter(Boolean).join(" · ") || "Open"],
    [`Watch ${index + 1} brief`, [watch.condition, watch.budget, watch.timeline, watch.occasion].filter(Boolean).join(" · ")],
  ]);
  const tradeRows = tradeIns.flatMap((trade, index) => [
    [`Trade-in ${index + 1}`, `${trade.brand || ""} ${trade.model || ""}`.trim()],
    [`Trade-in ${index + 1} reference`, trade.reference || "Needs identification"],
    [`Trade-in ${index + 1} details`, [trade.year, trade.dial, trade.bracelet, trade.condition, trade.set].filter(Boolean).join(" · ")],
    [`Trade-in ${index + 1} expected value`, trade.expectedValue ? `${trade.expectedValue} ${trade.currency || "USD"}` : "Not specified"],
  ]);
  const rows = [
    ["Request", requestId],
    ["Number of watches", watches.length],
    ...watchRows,
    ["Condition notes", body.conditionNotes],
    ["Inspiration link", body.inspirationUrl],
    ["Timeline", body.timeline],
    ["Trade-in", body.tradeIn],
    ["Number of trade-ins", body.tradeIn === "Yes" ? tradeIns.length : 0],
    ...tradeRows,
    ["Client", body.fullName],
    ["Email", body.email],
    ["Phone", body.phone],
    ["Preferred contact", body.preferredContact],
    ["Location", body.location],
    ["Lead source", body.source || body.utmSource],
    ["Campaign", body.utmCampaign],
    ["Medium", body.utmMedium],
    ["Landing page", body.landingPage],
  ].filter(([, value]) => value);

  const tableRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #dfe5e4;color:#687374;font-size:12px;text-transform:uppercase;letter-spacing:.06em">${escapeHtml(label)}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #dfe5e4;color:#172022;font-size:14px;font-weight:600">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:32px;background:#eef1f0;font-family:Arial,sans-serif">
        <div style="max-width:680px;margin:0 auto;background:#fff;border-top:5px solid #0b0c0c">
          <div style="padding:28px 32px 18px">
            <div style="color:#81724f;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Omni Timepieces · Private Request</div>
            <h1 style="margin:10px 0 0;color:#0b0c0c;font-size:28px">${watches.length > 1 ? `${watches.length} watch private request` : `${escapeHtml(body.brand)} ${escapeHtml(body.model)}`}</h1>
          </div>
          <table style="width:100%;border-collapse:collapse">${tableRows}</table>
        </div>
      </body>
    </html>`;
}

async function deliverToWebhook(body, requestId) {
  const headers = { "Content-Type": "application/json" };
  if (process.env.WATCH_REQUEST_WEBHOOK_BEARER) {
    headers.Authorization = `Bearer ${process.env.WATCH_REQUEST_WEBHOOK_BEARER}`;
  }

  const response = await fetch(process.env.WATCH_REQUEST_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ requestId, type: "watch_request", ...body }),
  });

  if (!response.ok) throw new Error(`Webhook delivery failed with status ${response.status}`);
}

async function deliverWithResend(body, requestId) {
  const recipients = process.env.WATCH_REQUEST_TO_EMAIL
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.WATCH_REQUEST_FROM_EMAIL,
      to: recipients,
      reply_to: body.email || undefined,
      subject: `${requestId} — ${Array.isArray(body.watches) && body.watches.length > 1 ? `${body.watches.length} watches` : `${body.brand} ${body.model}`}`,
      html: requestEmailHtml(body, requestId),
    }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    console.error("Resend email delivery failed", { requestId, status: response.status, detail: detail.message });
    throw new Error(`Email delivery failed with status ${response.status}`);
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ message: "Use POST to create a watch request." });
  }

  let body;
  try {
    body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
  } catch (_) {
    return response.status(400).json({ message: "Send the request as valid JSON." });
  }
  if (JSON.stringify(body).length > 30000) {
    return response.status(413).json({ message: "This request is too large. Shorten the notes and try again." });
  }

  const missing = requiredFields(body);
  if (missing.length || (!body.email && !body.phone) || body.consent !== true) {
    return response.status(400).json({ message: "Complete the required contact and watch details before sending." });
  }

  body.currency = "USD";
  body.tradeCurrency = "USD";
  body.tradeIns = tradeInsFor(body).map((trade) => ({ ...trade, currency: "USD" }));

  const requestId = makeRequestId();

  try {
    if (process.env.RESEND_API_KEY && process.env.WATCH_REQUEST_TO_EMAIL && process.env.WATCH_REQUEST_FROM_EMAIL) {
      await deliverWithResend(body, requestId);
    } else if (process.env.WATCH_REQUEST_WEBHOOK_URL) {
      await deliverToWebhook(body, requestId);
    } else if (process.env.WATCH_REQUEST_PREVIEW_MODE === "true") {
      return response.status(200).json({ ok: true, preview: true, requestId });
    } else {
      return response.status(503).json({
        message: "Request delivery is not connected yet. Please contact the private desk directly.",
      });
    }

    return response.status(200).json({ ok: true, requestId });
  } catch (error) {
    console.error("Watch request delivery failed", { requestId, error: error.message });
    return response.status(502).json({ message: "Your request could not be delivered. Please try again shortly." });
  }
};
