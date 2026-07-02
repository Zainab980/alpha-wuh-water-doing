/**
 * Email sending via Resend.
 *
 * One low-level deliver() sends through Resend. The per-email helpers build the
 * content and call it. deliver() never throws — a mail hiccup can't break a
 * sign-up (the row is already "pending").
 *
 * Inbox (not spam) is a DELIVERABILITY concern, decided by sender
 * authentication, not by this code: verify your domain in Resend (SPF + DKIM +
 * DMARC) and set EMAIL_FROM to an address on that domain. Sending from the
 * shared test address (onboarding@resend.dev) will tend to land in spam.
 */
import { Resend } from "resend";

const FROM =
  process.env.EMAIL_FROM ?? "Wuh Water Doing <onboarding@resend.dev>";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type Message = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

async function deliver(msg: Message): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      headers: msg.headers,
    });
    if (error) {
      console.error("[email] Resend rejected:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Resend threw:", err);
    return false;
  }
}

export async function sendConfirmEmail(opts: {
  to: string;
  areaLabel: string;
  confirmUrl: string;
}): Promise<void> {
  const ok = await deliver({
    to: opts.to,
    subject: "Confirm your water alerts",
    html: confirmHtml(opts.areaLabel, opts.confirmUrl),
    text: confirmText(opts.areaLabel, opts.confirmUrl),
  });
  if (!ok) console.warn("[email] confirm email not sent to", opts.to);
}

export async function sendAlertEmail(opts: {
  to: string;
  areaLabel: string;
  notice: { title: string; summary: string; link: string };
  unsubscribeUrl: string;
}): Promise<boolean> {
  return deliver({
    to: opts.to,
    subject: `Water notice for ${opts.areaLabel}: ${opts.notice.title}`,
    html: alertHtml(opts),
    text: alertText(opts),
    headers: {
      // One-click unsubscribe (mailbox providers reward this for bulk mail).
      "List-Unsubscribe": `<${opts.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

/**
 * Ops alert to the team — used when the checker fails. No-op if ADMIN_EMAIL
 * isn't set.
 */
export async function sendOpsAlert(subject: string, text: string): Promise<void> {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return;
  await deliver({ to, subject, html: `<pre>${text}</pre>`, text });
}

/**
 * Government of Barbados branded email shell — mirrors the platform's
 * submission-confirmation template: yellow header (#ffc726 / #1a202c text),
 * white body, blue footer (#00267f / #ffffff text).
 */
function renderEmail(content: string): string {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.55; color: #1a202c; margin: 0; padding: 0; background-color: #f4f5f7; }
      .wrapper { max-width: 640px; margin: 0 auto; background: #ffffff; }
      .header { background-color: #ffc726; padding: 20px 40px; }
      .header span { font-size: 18px; font-weight: 700; color: #1a202c; }
      .body { padding: 8px 40px 32px; }
      .title { font-size: 30px; font-weight: 800; color: #1a202c; margin: 28px 0 20px; line-height: 1.15; }
      .intro { font-size: 15px; color: #1a202c; margin: 0 0 24px; }
      .callout { background-color: #ace6e9; padding: 16px 24px; margin: 0 0 28px; border-radius: 4px; }
      .callout .c-label { font-size: 14px; color: #1a4d66; margin: 0 0 4px; }
      .callout .c-value { font-size: 18px; font-weight: 800; color: #00267f; margin: 0; }
      .btn { background-color: #00267f; color: #ffffff !important; padding: 12px 22px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 700; }
      .muted { color: #555555; font-size: 13px; }
      .footer { background-color: #00267f; color: #ffffff; padding: 28px 40px; }
      .footer p { font-size: 14px; color: #ffffff; margin: 0 0 14px; }
      .footer a { color: #ffffff; }
      .footer .copyright { opacity: 0.9; margin: 0; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header"><span>Government of Barbados</span></div>
      <div class="body">${content}</div>
      <div class="footer">
        <p>This is an automated email from the Government of Barbados.</p>
        <p>Please do not reply to this email.</p>
        <p class="copyright">&copy; ${year} Government of Barbados</p>
      </div>
    </div>
  </body>
</html>`;
}

function confirmHtml(areaLabel: string, confirmUrl: string): string {
  return renderEmail(`
    <h1 class="title">Confirm your water alerts</h1>
    <p class="intro">You asked to get an email when water is affected in <strong>${areaLabel}</strong>. Confirm below and we'll let you know whenever there's a notice for your area.</p>
    <p style="margin: 24px 0;"><a class="btn" href="${confirmUrl}">Confirm my alerts</a></p>
    <p class="muted">If you didn't ask for this, you can ignore this email — nothing will happen.</p>
  `);
}

function confirmText(areaLabel: string, confirmUrl: string): string {
  return [
    "Confirm your water alerts",
    "",
    `You asked to get an email when water is affected in ${areaLabel}.`,
    "Confirm by opening this link:",
    confirmUrl,
    "",
    "If you didn't ask for this, you can ignore this email.",
  ].join("\n");
}

function alertHtml(opts: {
  areaLabel: string;
  notice: { title: string; summary: string; link: string };
  unsubscribeUrl: string;
}): string {
  return renderEmail(`
    <h1 class="title">Water notice for ${opts.areaLabel}</h1>
    <div class="callout">
      <p class="c-label">Notice</p>
      <p class="c-value">${opts.notice.title}</p>
    </div>
    <p class="intro">${opts.notice.summary}</p>
    <p style="margin: 24px 0;"><a class="btn" href="${opts.notice.link}">Read the full BWA notice</a></p>
    <p class="muted">You're getting this because you signed up for water alerts in ${opts.areaLabel}. <a href="${opts.unsubscribeUrl}">Unsubscribe</a>.</p>
  `);
}

function alertText(opts: {
  areaLabel: string;
  notice: { title: string; summary: string; link: string };
  unsubscribeUrl: string;
}): string {
  return [
    `Water notice for ${opts.areaLabel}`,
    "",
    opts.notice.title,
    opts.notice.summary,
    "",
    `Read the full BWA notice: ${opts.notice.link}`,
    "",
    `Unsubscribe: ${opts.unsubscribeUrl}`,
  ].join("\n");
}
