import { useEffect, useMemo, useState } from "react";
import PriceRow from "./components/PriceRow.jsx";
import { formatPerMl, pricePerMl } from "./lib/format.js";

const STORAGE_KEY = "multi-calculator.prices.v1";
const LEGACY_STORAGE_KEY = "multi-calculator.soap.v1";
const THEME_KEY = "multi-calculator.theme";
const SIZE_PRESETS = [50, 100, 250, 500, 800, 1000];

function makeRow(price = "", ml = "") {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    price,
    ml,
  };
}

function readRows() {
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migrate data saved under the previous key.
      raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    }
    if (!raw) {
      // Example row on first visit, so the format is obvious right away.
      return [makeRow("10000", "100"), makeRow()];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const rows = parsed.filter(
        (row) =>
          row &&
          typeof row.id === "string" &&
          typeof row.price === "string" &&
          typeof row.ml === "string",
      );
      if (rows.length) return rows;
    }
  } catch (error) {
    console.warn("Could not read saved rows:", error);
  }
  return [makeRow()];
}

function setMeta(selector, content) {
  const meta = document.querySelector(selector);
  if (meta) meta.setAttribute("content", content);
}

export default function App() {
  const [rows, setRows] = useState(readRows);
  const [theme, setTheme] = useState(() => {
    try {
      return window.localStorage.getItem(THEME_KEY) || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch (error) {
      console.warn("Could not save rows:", error);
    }
  }, [rows]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    const isDark = theme === "dark";
    setMeta('meta[name="theme-color"]', isDark ? "#0f172a" : "#f1f5f9");
    setMeta(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
      isDark ? "black-translucent" : "default",
    );
  }, [theme]);

  const items = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        perMl: pricePerMl(row.price, row.ml),
      })),
    [rows],
  );

  const validItems = useMemo(
    () => items.filter((item) => item.perMl !== null),
    [items],
  );

  const best = useMemo(
    () =>
      validItems.reduce(
        (current, item) => (current === null || item.perMl < current.perMl ? item : current),
        null,
      ),
    [validItems],
  );

  const worst = useMemo(
    () =>
      validItems.reduce(
        (current, item) => (current === null || item.perMl > current.perMl ? item : current),
        null,
      ),
    [validItems],
  );

  const updateRow = (id, field, value) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = (ml = "") => {
    setRows((current) => [...current, makeRow("", ml ? String(ml) : "")]);
  };

  const removeRow = (id) => {
    setRows((current) => {
      const next = current.filter((row) => row.id !== id);
      return next.length ? next : [makeRow()];
    });
  };

  const resetRows = () => {
    setRows([makeRow()]);
  };

  const comparedCount = validItems.length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <a
            className="brand"
            href="/"
            onClick={(event) => event.preventDefault()}
            aria-label="Beranda"
          >
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3.2c0 0 6.4 6.1 6.4 10.4A6.4 6.4 0 0 1 12 20a6.4 6.4 0 0 1-6.4-6.4C5.6 9.3 12 3.2 12 3.2Z" />
                <path d="M9.6 13.6h4.8M10.9 11.9l-.7 1.7m3.6-1.7.7 1.7" />
              </svg>
            </span>
            <span className="brand-text">
              <span className="brand-name">unitprices</span>
              <span className="brand-tag">Bandingkan harga satuan</span>
            </span>
          </a>

          <div className="topbar-actions">
            <span className="count-pill">{items.length} item</span>
            <button
              type="button"
              className="topbar-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Ganti tema terang/gelap"
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>
            {items.length > 1 ? (
              <button type="button" className="ghost-btn" onClick={resetRows}>
                Bersihkan
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="page">
        <section className="hero">
          <h1>
            Cek harga <span className="hero-accent">per satuan</span>
          </h1>
          <p className="hero-desc">
            Masukkan harga dan jumlah kemasannya (ml, gram, pcs), langsung
            terlihat mana yang paling hemat.
          </p>
          <p className="hero-meta">
            Gratis <span className="dot">•</span> Tanpa akun
            <span className="dot">•</span> Tersimpan otomatis
          </p>
        </section>

        <div className="stripe" role="group" aria-label="Tambah ukuran cepat">
          <span className="stripe-label">Tambah ukuran</span>
          <div className="stripe-scroll no-scrollbar">
            {SIZE_PRESETS.map((size) => (
              <button
                key={size}
                type="button"
                className="chip"
                onClick={() => addRow(size)}
              >
                + {size} ml
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="empty">
            <p>Belum ada item. Tambahkan lewat tombol di bawah.</p>
          </div>
        ) : (
          <ul className="rows">
            {items.map((item, index) => {
              const isBest =
                comparedCount > 1 && best !== null && item.perMl === best.perMl;
              const overPct =
                !isBest && comparedCount > 1 && best && item.perMl !== null
                  ? ((item.perMl - best.perMl) / best.perMl) * 100
                  : null;
              const overAmount =
                !isBest && comparedCount > 1 && best && item.perMl !== null
                  ? item.perMl - best.perMl
                  : null;

              return (
                <PriceRow
                  key={item.id}
                  row={item}
                  index={index}
                  perMl={item.perMl}
                  isBest={isBest}
                  overPct={overPct === null ? null : Math.round(overPct)}
                  overAmount={overAmount}
                  showCompare={comparedCount > 1}
                  onChange={(field, value) => updateRow(item.id, field, value)}
                  onRemove={() => removeRow(item.id)}
                  onAdd={() => addRow()}
                />
              );
            })}
          </ul>
        )}

        <button type="button" className="primary-btn add-btn" onClick={() => addRow()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Tambah item
        </button>

        {comparedCount > 1 && best && worst ? (
          <section className="summary" aria-label="Ringkasan perbandingan">
            <div className="summary-card is-best">
              <span className="summary-label">Termurah</span>
              <strong className="summary-value">
                Rp {formatPerMl(best.perMl)}
                <span className="summary-unit">/ml</span>
              </strong>
              <span className="summary-hint">Paling hemat</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Termahal</span>
              <strong className="summary-value">
                Rp {formatPerMl(worst.perMl)}
                <span className="summary-unit">/ml</span>
              </strong>
              <span className="summary-hint">
                {comparedCount} harga dibandingkan
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Selisih</span>
              <strong className="summary-value">
                Rp {formatPerMl(worst.perMl - best.perMl)}
                <span className="summary-unit">/ml</span>
              </strong>
              <span className="summary-hint">
                {Math.round(((worst.perMl - best.perMl) / best.perMl) * 100)}%
                lebih mahal
              </span>
            </div>
          </section>
        ) : null}

        <p className="foot-note">
          Data tersimpan di perangkat ini, jadi bisa dicek lagi kapan saja.
        </p>
      </main>
    </div>
  );
}
