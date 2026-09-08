import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db/pool";
import { appBaseUrl } from "@/lib/app-url";
import { isSmtpConfigured, sendMail } from "@/lib/mail/smtp";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import { updateUserPassword } from "@/lib/db/repositories/users";
import type { RowDataPacket } from "mysql2";

const TOKEN_TTL_MS = 60 * 60 * 1000;

type TokenRow = RowDataPacket & {
  user_id: number;
  expires_at: Date;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function copyForLocale(locale: string) {
  if (locale === "ar") {
    return {
      subject: "إعادة تعيين كلمة المرور",
      body: "اضغط على الزر أدناه لإعادة تعيين كلمة المرور.",
      button: "إعادة التعيين",
      expiry: "ينتهي هذا الرابط خلال ساعة.",
    };
  }
  if (locale === "ckb") {
    return {
      subject: "وشەی نهێنی نوێ بکەرەوە",
      body: "بۆ نوێکردنەوەی وشەی نهێنی کرتە لە دوگمەی خوارەوە بکە.",
      button: "نوێکردنەوەی وشەی نهێنی",
      expiry: "ئەم لینکە دوای یەک کاتژمێر بەسەردەچێت.",
    };
  }
  return {
    subject: "Reset your password",
    body: "Click the button below to reset your password.",
    button: "Reset password",
    expiry: "This link expires in 1 hour.",
  };
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (isMockMapDataEnabled()) return;

  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      email: string;
      password_hash: string | null;
      preferred_locale: string;
    })[]
  >(
    `SELECT id, email, password_hash, preferred_locale
     FROM users WHERE email = ? LIMIT 1`,
    [email.toLowerCase()]
  );
  const user = rows[0];
  if (!user?.password_hash) return;

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  const locale = user.preferred_locale || "en";

  await pool.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", [
    user.id,
  ]);
  await pool.execute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [user.id, tokenHash, expiresAt]
  );

  const resetUrl = `${appBaseUrl()}/${locale}/reset-password?token=${token}`;
  const copy = copyForLocale(locale);
  const text = `${copy.body}\n\n${resetUrl}\n\n${copy.expiry}`;
  const html = `<p>${copy.body}</p><p><a href="${resetUrl}">${copy.button}</a></p><p>${copy.expiry}</p>`;

  if (!isSmtpConfigured()) {
    console.info(`[email] SMTP not configured. Reset URL for ${user.email}: ${resetUrl}`);
    return;
  }

  await sendMail({
    to: user.email,
    subject: copy.subject,
    text,
    html,
  });
}

export async function peekPasswordResetToken(
  token: string
): Promise<{ ok: true } | { ok: false; reason: "invalid" | "expired" }> {
  if (!token || isMockMapDataEnabled()) return { ok: false, reason: "invalid" };

  const tokenHash = hashToken(token);
  const [rows] = await pool.execute<TokenRow[]>(
    `SELECT user_id, expires_at
     FROM password_reset_tokens
     WHERE token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) return { ok: false, reason: "invalid" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; reason: "invalid" | "expired" }> {
  if (!input.token || isMockMapDataEnabled()) {
    return { ok: false, reason: "invalid" };
  }

  const tokenHash = hashToken(input.token);
  const [rows] = await pool.execute<TokenRow[]>(
    `SELECT user_id, expires_at
     FROM password_reset_tokens
     WHERE token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) return { ok: false, reason: "invalid" };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", [
      row.user_id,
    ]);
    return { ok: false, reason: "expired" };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  await updateUserPassword(row.user_id, passwordHash);
  await pool.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", [
    row.user_id,
  ]);
  return { ok: true };
}
