import { formatPerMl, formatWhole, sanitizeDecimal } from "../lib/format.js";

export default function PriceRow({
  row,
  index,
  perMl,
  isBest,
  overPct,
  overAmount,
  showCompare,
  onChange,
  onRemove,
  onAdd,
}) {
  const badge = showCompare
    ? isBest
      ? { tone: "green", text: "Termurah" }
      : overPct !== null
        ? { tone: "red", text: `+${overPct}%` }
        : null
    : null;

  return (
    <li className={`row-card${isBest ? " is-best" : ""}`}>
      <div className="row-top">
        <span className="row-index">{index + 1}</span>
        {badge ? (
          <span className={`badge badge-${badge.tone}`}>{badge.text}</span>
        ) : null}
        <button
          type="button"
          className="icon-btn"
          onClick={onRemove}
          aria-label={`Hapus item ${index + 1}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="row-grid">
        <label className="field field-price">
          <span className="field-label">Harga</span>
          <span className="input-shell">
            <span className="affix affix-start">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="10.000"
              value={row.price}
              onChange={(event) => onChange("price", formatWhole(event.target.value))}
            />
          </span>
        </label>

        <span className="op op-divide" aria-hidden="true">
          &divide;
        </span>

        <label className="field field-ml">
          <span className="field-label">Ukuran</span>
          <span className="input-shell">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="100"
              value={row.ml}
              onChange={(event) => onChange("ml", sanitizeDecimal(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAdd();
                }
              }}
            />
            <span className="affix affix-end">ml</span>
          </span>
        </label>

        <span className="op op-equals" aria-hidden="true">
          =
        </span>

        <p className="result" aria-live="polite">
          <span className="result-value">
            {perMl === null ? "—" : `Rp ${formatPerMl(perMl)}`}
          </span>
          <span className="result-unit">/ml</span>
        </p>
      </div>

      <p className="row-hint">
        {perMl === null
          ? "Isi harga dan ukuran untuk melihat hasilnya"
          : isBest
            ? "Termurah di antara yang lain"
            : overAmount !== null
              ? `Rp ${formatPerMl(overAmount)} lebih mahal per ml dari termurah`
              : "Harga per mililiter"}
      </p>
    </li>
  );
}
