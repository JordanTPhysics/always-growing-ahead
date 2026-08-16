import { createHash, randomBytes } from "node:crypto";
import { pool } from "@/lib/db/pool";
import { appBaseUrl } from "@/lib/app-url";
import { isSmtpConfigured, sendMail } from "@/lib/mail/smtp";
import { isMockMapDataEnabled } from "@/lib/mock/nottingham";
import { setEmailVerified } from "@/lib/db/repositories/users";
import type { RowDataPacket } from "mysql2";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

type TokenRow = RowDataPacket & {
  user_id: number;
  expires_at: Date;
  preferred_locale: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function copyForLocale(locale: string) {
  if (locale === "ar") {
    return {
      subject: "تأكيد بريدك الإلكتروني",
      body: "اضغط على الزر أدناه لتأكيد بريدك الإلكتروني.",
      button: "تأكيد البريد",
      expiry: "ينتهي هذا الرابط خلال 24 ساعة.",
    };
  }
  if (locale === "ckb") {
    return {
      subject: "ئیمەیڵەکەت پشتڕاست بکەرەوە",
      body: "بۆ پشتڕاستکردنەوەی ئیمەیڵەکەت کرتە لە دوگمەی خوارەوە بکە.",
      button: "پشتڕاستکردنەوەی ئیمەیڵ",
      expiry: "ئەم لینکە دوای ٢٤ کاتژمێر بەسەردەچێت.",
    };
  }
  return {
    subject: "Verify your email",
    body: "Click the button below to verify your email address.",
    button: "Verify email",
    expiry: "This link expires in 24 hours.",
  };
}

export async function sendVerificationEmail(input: {
  userId: number;
  email: string;
  locale?: string | null;
}): Promise<void> {
  if (isMockMapDataEnabled()) return;

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  const locale = input.locale || "en";

  await pool.execute("DELETE FROM email_verification_tokens WHERE user_id = ?", [
    input.userId,
  ]);
  await pool.execute(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [input.userId, tokenHash, expiresAt]
  );

  const verifyUrl = `${appBaseUrl()}/${locale}/verify-email?token=${token}`;
  const copy = copyForLocale(locale);
  const text = `${copy.body}\n\n${verifyUrl}\n\n${copy.expiry}`;
  const html = `<p>${copy.body}</p><p><a href="${verifyUrl}">${copy.button}</a></p><p>${copy.expiry}</p>`;

  if (!isSmtpConfigured()) {
    console.info(`[email] SMTP not configured. Verify URL for ${input.email}: ${verifyUrl}`);
    return;
  }

  await sendMail({
    to: input.email,
    subject: copy.subject,
    text,
    html,
  });
}

export async function consumeVerificationToken(
  token: string
): Promise<{ ok: true } | { ok: false; reason: "invalid" | "expired" }> {
  if (!token || isMockMapDataEnabled()) return { ok: false, reason: "invalid" };

  const tokenHash = hashToken(token);
  const [rows] = await pool.execute<TokenRow[]>(
    `SELECT t.user_id, t.expires_at, u.preferred_locale
     FROM email_verification_tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) return { ok: false, reason: "invalid" };

  await pool.execute("DELETE FROM email_verification_tokens WHERE user_id = ?", [
    row.user_id,
  ]);

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  await setEmailVerified(row.user_id);
  return { ok: true };
}

export async function resendVerificationEmail(email: string): Promise<void> {
  if (isMockMapDataEnabled()) return;

  const [rows] = await pool.execute<
    (RowDataPacket & {
      id: number;
      email: string;
      preferred_locale: string;
      email_verified_at: Date | null;
    })[]
  >(
    `SELECT id, email, preferred_locale, email_verified_at
     FROM users WHERE email = ? LIMIT 1`,
    [email.toLowerCase()]
  );
  const user = rows[0];
  if (!user || user.email_verified_at) return;

  await sendVerificationEmail({
    userId: user.id,
    email: user.email,
    locale: user.preferred_locale,
  });
}
