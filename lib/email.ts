import nodemailer from "nodemailer";

type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Transactional email (Resend)
// export async function sendTransactionalEmail({
//   to,
//   subject,
//   text,
// }: TransactionalEmail) {
//   const apiKey = process.env.RESEND_API_KEY;
//   const from = process.env.EMAIL_FROM;

//   if (!apiKey || !from) {
//     if (process.env.NODE_ENV !== "production") {
//       console.info(`[email preview] ${subject} to ${to}\n${text}`);
//       return;
//     }
//     throw new Error("Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
//   }

//   const response = await fetch("https://api.resend.com/emails", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${apiKey}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       from,
//       to: [to],
//       subject,
//       text,
//       html: `<p>${escapeHtml(text).replaceAll("\n", "<br />")}</p>`,
//     }),
//     signal: AbortSignal.timeout(10_000),
//   });

//   if (!response.ok) {
//     const detail = await response.text();
//     throw new Error(`Email delivery failed (${response.status}): ${detail.slice(0, 300)}`);
//   }
// }

// Transactional email (Nodemailer)
export async function sendTransactionalEmail({
  to,
  subject,
  text,
}: TransactionalEmail) {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!user || !appPassword) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email preview] ${subject} to ${to}\n${text}`);
      return;
    }

    throw new Error(
      "Email delivery is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.",
    );
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass: appPassword.replace(/\s/g, ""),
    },
  });

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>${escapeHtml(text).replaceAll("\n", "<br />")}</p>
    </div>
  `;

  await transporter.sendMail({
    from: {
      name: "Helfer",
      address: user,
    },
    to,
    subject,
    text,
    html,
  });
}
