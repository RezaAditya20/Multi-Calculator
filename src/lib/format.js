const intFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Keep only digits, so the field always holds a valid whole number string. */
export function sanitizeWhole(value) {
  return value.replace(/\D/g, "").slice(0, 15);
}

/** Format a whole number string with thousand separators ("10000" -> "10.000"). */
export function formatWhole(value) {
  const digits = sanitizeWhole(value);
  if (!digits) return "";
  return intFormatter.format(Number(digits));
}

/** Allow digits plus a single decimal separator, normalized to comma ("10,5"). */
export function sanitizeDecimal(value) {
  const cleaned = value.replace(/[^\d.,]/g, "");
  const [first = "", ...rest] = cleaned.split(/[.,]/);
  const tail = rest.join("");
  if (!tail) return first;
  return `${first},${tail.slice(0, 3)}`;
}

/** Parse a price string ("10.000" / "10.000,50") into a number, or null. */
export function parsePrice(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

/** Parse a size string ("100" / "10,5") into a number, or null. */
export function parseMl(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function formatPerMl(amount) {
  return decimalFormatter.format(amount);
}

/** Price per millilitre, or null when inputs are incomplete/invalid. */
export function pricePerMl(price, ml) {
  const priceValue = parsePrice(price);
  const mlValue = parseMl(ml);
  if (priceValue === null || mlValue === null) return null;
  if (!(priceValue > 0) || !(mlValue > 0)) return null;
  return priceValue / mlValue;
}
