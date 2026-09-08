export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidUsername(value: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 7 || trimmed.length > 30) return false;
  if (!/^[+]?[\d\s().-]+$/.test(trimmed)) return false;
  return trimmed.replace(/\D/g, "").length >= 7;
}

/** Build a wa.me chat URL. UK numbers starting with 0 become 44… */
export function toWhatsAppHref(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}`;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidIntegerString(value: string): boolean {
  return /^-?\d+$/.test(value.trim());
}

export function hasFieldErrors(
  errors: Record<string, string | undefined>
): boolean {
  return Object.values(errors).some(Boolean);
}

export function clearFieldError<T extends Record<string, string | undefined>>(
  prev: T,
  key: keyof T
): T {
  if (!prev[key]) return prev;
  const next = { ...prev };
  delete next[key];
  return next;
}

export function focusFirstInvalidField() {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>("[aria-invalid='true']");
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 0);
}
