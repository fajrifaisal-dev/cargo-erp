import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function calculateVolumetricKg(p: number, l: number, t: number): number {
  if (!p || !l || !t) return 0;
  return Number(((p * l * t) / 4000).toFixed(2));
}

export function calculateCBM(p: number, l: number, t: number): number {
  if (!p || !l || !t) return 0;
  return Number(((p * l * t) / 1000000).toFixed(4));
}

export function getContrastTextColor(hexColor: string | null | undefined): string {
  if (!hexColor || !/^#([0-9A-Fa-f]{6})$/.test(hexColor)) return "#FFFFFF";
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#FFFFFF";
}

export function formatSupabaseError(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const e = err as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    const parts = [e.message, e.code ? `code=${e.code}` : "", e.details, e.hint].filter(Boolean);
    if (parts.length > 0) return parts.join(" | ");
  }
  return "Database request failed";
}

/**
 * Logs full technical error details only on the server and returns a safe,
 * generic Indonesian message for the browser without exposing env, SQL, or stack info.
 */
export function safeActionErrorMessage(
  context: string,
  err: unknown,
  fallbackMessage: string
): string {
  console.error(`[${context}]`, formatSupabaseError(err));

  if (err && typeof err === "object") {
    const e = err as { code?: string; message?: string };
    const code = e.code || "";
    const msg = (e.message || "").toLowerCase();

    if (code === "23505" || msg.includes("already been registered") || msg.includes("already exists")) {
      return "Data duplikat: nilai unik (nomor/email/username/kode) sudah terdaftar.";
    }
    if (code === "23503") {
      return "Data sedang digunakan oleh transaksi lain dan tidak dapat dihapus.";
    }
    if (code === "42501" || msg.includes("row-level security")) {
      return "Akses ditolak: Anda tidak memiliki izin untuk operasi ini.";
    }
  }

  return fallbackMessage;
}

export const DEFAULT_COMPANY_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

export function getTenantPrefix(
  company?: { slug?: string | null; name?: string | null } | null
): string {
  const slugParts = (company?.slug || "")
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  if (slugParts.length >= 2) {
    return slugParts
      .slice(0, 3)
      .map((p) => p[0].toUpperCase())
      .join("");
  }
  if (slugParts.length === 1 && slugParts[0].length >= 2) {
    return slugParts[0].slice(0, 3).toUpperCase();
  }

  const nameWords = (company?.name || "")
    .replace(/\b(PT|CV|UD|PD|TBK)\.?\b/gi, "")
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  if (nameWords.length >= 2) {
    return nameWords
      .slice(0, 3)
      .map((w) => w[0].toUpperCase())
      .join("");
  }
  if (nameWords.length === 1 && nameWords[0].length >= 2) {
    return nameWords[0].slice(0, 3).toUpperCase();
  }
  return "GT";
}

export function formatDateDDMMYYYY(dateStr?: string | null): string {
  const base =
    dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)
      ? dateStr.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const [yyyy, mm, dd] = base.split("-");
  return `${dd}-${mm}-${yyyy}`;
}
