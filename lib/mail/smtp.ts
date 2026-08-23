import nodemailer from "nodemailer";

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASSWORD?.trim()
  );
}

export function mailFrom(): string {
  return (
    process.env.MAIL_FROM?.trim() ||
    "Always Growing Ahead <admin@alwaysgrowingahead.com>"
  );
}

function getTransport() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure =
    process.env.SMTP_SECURE === "1" ||
    process.env.SMTP_SECURE === "true" ||
    port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    authMethod: "LOGIN",
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: process.env.SMTP_PASSWORD?.trim(),
    },
  });
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured");
  }
  await getTransport().sendMail({
    from: mailFrom(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
