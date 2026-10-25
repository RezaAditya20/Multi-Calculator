import { useEffect, useMemo, useState } from "react";
import PriceRow from "./components/PriceRow.jsx";
import { formatPerMl, pricePerMl, sanitizeDecimal } from "./lib/format.js";

const STORAGE_KEY = "multi-calculator.tabs.v1";
const LEGACY_KEYS = [
  "multi-calculator.prices.v1",
  "multi-calculator.soap.v1",
];
const THEME_KEY = "multi-calculator.theme";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeRow(price = "", ml = "") {
  return { id: uid(), price, ml };
}

function sanitizeRows(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row) =>
      row &&
      typeof row.id === "string" &&
      typeof row.price === "string" &&
      typeof row.ml === "string",
  );
}

function makeTab(name, rows) {
  return { id: uid(), name, rows: rows.length ? rows : [makeRow()] };
}

function readState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tabs)) {
        const tabs = parsed.tabs
          .filter((tab) => tab && typeof tab.id === "string")
          .map((tab) =>
            makeTab(
              typeof tab.name === "string" && tab.name.trim()
                ? tab.name.trim()
                : "Daftar",
              sanitizeRows(tab.rows),
            ),
          );
        if (tabs.length) {
          const activeTabId = tabs.some((tab) => tab.id === parsed.activeTabId)
            ? parsed.activeTabId
            : tabs[0].id;
          return { tabs, activeTabId };
        }
      }
    }

    // Migrate data saved by earlier versions (plain row arrays).
    for (const key of LEGACY_KEYS) {
      const legacy = window.localStorage.getItem(key);
      if (!legacy) continue;
      const rows = sanitizeRows(JSON.parse(legacy));
      if (rows.length) {
        const tab = makeTab("Daftar 1", rows);
        return { tabs: [tab], activeTabId: tab.id };
      }
    }
  } catch (error) {
    console.warn("Could not read saved data:", error);
  }

  const tab = makeTab("Daftar 1", [makeRow("10000", "100"), makeRow()]);
  return { tabs: [tab], activeTabId: tab.id };
}

function setMeta(selector, content) {
  const meta = document.querySelector(selector);
  if (meta) meta.setAttribute("content", content);
}

export default function App() {
  const [{ tabs, activeTabId }, setState] = useState(readState);
  const [editingTabId, setEditingTabId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [quickSize, setQuickSize] = useState("");
  const [theme, setTheme] = useState(() => {
    try {
      return window.localStorage.getItem(THEME_KEY) || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeTabId }));
    } catch (error) {
      console.warn("Could not save data:", error);
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    const isDark = theme === "dark";
    setMeta('meta[name="theme-color"]', isDark ? "#000000" : "#f1f5f9");
    setMeta(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
      isDark ? "black-translucent" : "default",
    );
  }, [theme]);

  // TEMP DIAGNOSTIC: report the dock geometry actually used on device so the
  // bottom gap can be compared against the reference app. Remove after debugging.
  const [dockProbe, setDockProbe] = useState(null);

  useEffect(() => {
    const measure = () => {
      try {
        const probe = document.createElement("div");
        probe.style.cssText =
          "position:absolute;top:0;left:0;height:env(safe-area-inset-bottom);visibility:hidden";
        document.body.appendChild(probe);
        const envBottom = Math.round(probe.getBoundingClientRect().height);
        probe.remove();

        const dock = document.querySelector(".mobile-dock");
        if (!dock) return;
        const pill = document.querySelector(".mobile-dock-search");
        const dockRect = dock.getBoundingClientRect();
        setDockProbe({
          mode: window.matchMedia("(display-mode: standalone)").matches
            ? "standalone"
            : "browser",
          env: envBottom,
          pad: Math.round(parseFloat(getComputedStyle(dock).paddingBottom) || 0),
          dockBottom: Math.round(dockRect.bottom),
          pillBottom: pill ? Math.round(pill.getBoundingClientRect().bottom) : 0,
          inner: Math.round(window.innerHeight),
          vv: window.visualViewport ? Math.round(window.visualViewport.height) : 0,
          dpr: window.devicePixelRatio,
        });
      } catch (error) {
        console.warn("probe failed:", error);
      }
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const rows = activeTab ? activeTab.rows : [];

  const items = useMemo(
    () => rows.map((row) => ({ ...row, perMl: pricePerMl(row.price, row.ml) })),
    [rows],
  );

  const validItems = useMemo(
    () => items.filter((item) => item.perMl !== null),
    [items],
  );

  const best = useMemo(
    () =>
      validItems.reduce(
        (current, item) =>
          current === null || item.perMl < current.perMl ? item : current,
        null,
      ),
    [validItems],
  );

  const worst = useMemo(
    () =>
      validItems.reduce(
        (current, item) =>
          current === null || item.perMl > current.perMl ? item : current,
        null,
      ),
    [validItems],
  );

  /* ── Tabs ── */
  const patchTab = (tabId, patch) => {
    setState((current) => ({
      ...current,
      tabs: current.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, ...patch } : tab,
      ),
    }));
  };

  const switchTab = (tabId) => {
    setEditingTabId(null);
    setState((current) => ({ ...current, activeTabId: tabId }));
  };

  const addTab = () => {
    const tab = makeTab(`Daftar ${tabs.length + 1}`, [makeRow()]);
    setState((current) => ({
      tabs: [...current.tabs, tab],
      activeTabId: tab.id,
    }));
    setDraftName("");
    setEditingTabId(tab.id);
  };

  const startRename = (tab) => {
    setDraftName(tab.id === activeTabId ? tab.name : activeTab.name);
    setEditingTabId(tab.id);
  };

  const commitRename = () => {
    if (!editingTabId) return;
    const name = draftName.trim();
    if (name) patchTab(editingTabId, { name });
    setEditingTabId(null);
  };

  const cancelRename = () => setEditingTabId(null);

  const deleteActiveTab = () => {
    if (tabs.length <= 1 || !activeTab) return;
    const hasData = activeTab.rows.some(
      (row) => pricePerMl(row.price, row.ml) !== null,
    );
    const message = `Hapus daftar "${activeTab.name}" beserta isinya?`;
    if (hasData && !window.confirm(message)) return;

    const remaining = tabs.filter((tab) => tab.id !== activeTab.id);
    setState({ tabs: remaining, activeTabId: remaining[0].id });
    setEditingTabId(null);
  };

  /* ── Rows ── */
  const updateRow = (rowId, field, value) => {
    if (!activeTab) return;
    patchTab(activeTab.id, {
      rows: activeTab.rows.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row,
      ),
    });
  };

  const addRow = (ml = "") => {
    if (!activeTab) return;
    const size = ml ? sanitizeDecimal(String(ml)) : "";
    patchTab(activeTab.id, {
      rows: [...activeTab.rows, makeRow("", size)],
    });
  };

  const addRowFromSizeInput = (event) => {
    if (event) event.preventDefault();
    addRow(quickSize);
    setQuickSize("");
  };

  const removeRow = (rowId) => {
    if (!activeTab) return;
    const next = activeTab.rows.filter((row) => row.id !== rowId);
    patchTab(activeTab.id, { rows: next.length ? next : [makeRow()] });
  };

  const resetRows = () => {
    if (!activeTab) return;
    patchTab(activeTab.id, { rows: [makeRow()] });
  };

  const comparedCount = validItems.length;
  const bestNo = best ? items.findIndex((item) => item.id === best.id) + 1 : 0;
  const worstNo = worst ? items.findIndex((item) => item.id === worst.id) + 1 : 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          {/* Pil kaca mengambang di pojok kiri atas (persis .menu-toggle di Notes) */}
          <a
            className="brand"
            href="./"
            onClick={(event) => event.preventDefault()}
            aria-label="Beranda"
            title="UnitPrices"
          >
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3.2c0 0 6.4 6.1 6.4 10.4A6.4 6.4 0 0 1 12 20a6.4 6.4 0 0 1-6.4-6.4C5.6 9.3 12 3.2 12 3.2Z" />
                <path d="M9.6 13.6h4.8M10.9 11.9l-.7 1.7m3.6-1.7.7 1.7" />
              </svg>
            </span>
          </a>

          <div className="topbar-title-wrap">
            <span className="brand-text">
              <span className="brand-name">
                <span className="brand-accent">U</span>nit
                <span className="brand-accent">P</span>rices
              </span>
              <span className="brand-tag">Bandingkan harga satuan</span>
            </span>
          </div>

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
        <div className="tabs">
          <div className="tabs-scroll no-scrollbar" role="tablist" aria-label="Daftar perbandingan">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab.id;
              const filled = tab.rows.filter(
                (row) => pricePerMl(row.price, row.ml) !== null,
              ).length;
              const isEditing = editingTabId === tab.id;

              return isEditing ? (
                <span key={tab.id} className="tab tab-editing">
                  <input
                    className="tab-input"
                    value={draftName}
                    placeholder="Nama daftar"
                    autoFocus
                    style={{ width: `${Math.max(draftName.length, 6) + 4}ch` }}
                    onChange={(event) => setDraftName(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitRename();
                      if (event.key === "Escape") cancelRename();
                    }}
                  />
                </span>
              ) : (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`tab${isActive ? " is-active" : ""}`}
                  onClick={() => switchTab(tab.id)}
                  onDoubleClick={() => startRename(tab)}
                >
                  <span className="tab-name">{tab.name}</span>
                  {filled > 0 ? <span className="tab-count">{filled}</span> : null}
                </button>
              );
            })}

            <button
              type="button"
              className="tab tab-add"
              onClick={addTab}
              aria-label="Tambah daftar"
            >
              + Tambah
            </button>
          </div>

          <div className="tabs-actions">
            <button
              type="button"
              className="tab-action"
              onClick={() => startRename(activeTab)}
              aria-label="Ganti nama daftar aktif"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z" />
                <path d="M13.5 6.5l4 4" />
              </svg>
            </button>
            {tabs.length > 1 ? (
              <button
                type="button"
                className="tab-action"
                onClick={deleteActiveTab}
                aria-label="Hapus daftar aktif"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        <section className="hero">
          <h1>
            Cek harga <span className="hero-accent">per satuan</span>
          </h1>
          <p className="hero-desc">
            Masukkan harga dan jumlah kemasannya (ml, gram, pcs), langsung
            terlihat mana yang paling hemat.
          </p>
        </section>

        <form className="quick-add" onSubmit={addRowFromSizeInput}>
          <span className="quick-label">Tambah ukuran</span>
          <span className="input-shell quick-field">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="100"
              aria-label="Ukuran baru dalam ml"
              value={quickSize}
              onChange={(event) => setQuickSize(sanitizeDecimal(event.target.value))}
            />
            <span className="affix affix-end">ml</span>
          </span>
          <button type="submit" className="quick-btn">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah
          </button>
        </form>

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

        <div className="add-dock">
          <button
            type="button"
            className="primary-btn add-btn"
            onClick={() => addRow()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah item
          </button>
        </div>

        {comparedCount > 1 && best && worst ? (
          <section className="summary" aria-label="Ringkasan perbandingan">
            <div className="summary-card is-best">
              <span className="summary-label">Termurah</span>
              <strong className="summary-value">
                Rp {formatPerMl(best.perMl)}
                <span className="summary-unit">/ml</span>
              </strong>
              <span className="summary-hint">
                #{bestNo} &middot; Rp {best.price} untuk {best.ml} ml
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Termahal</span>
              <strong className="summary-value">
                Rp {formatPerMl(worst.perMl)}
                <span className="summary-unit">/ml</span>
              </strong>
              <span className="summary-hint">
                #{worstNo} &middot; Rp {worst.price} untuk {worst.ml} ml
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
                lebih mahal dari yang termurah
              </span>
            </div>
          </section>
        ) : null}

        <p className="foot-note">
          Data tersimpan di perangkat ini, jadi bisa dicek lagi kapan saja.
        </p>

        {dockProbe ? (
          <p className="foot-note foot-debug">
            DEBUG mode:{dockProbe.mode} env:{dockProbe.env} pad:{dockProbe.pad} pillBottom:
            {dockProbe.pillBottom} dockBottom:{dockProbe.dockBottom} innerH:{dockProbe.inner} vv:
            {dockProbe.vv} dpr:{dockProbe.dpr}
          </p>
        ) : null}
      </main>

      {/* Dock bawah mobile: input ukuran + tombol bulat (persis Notes) */}
      <div className="mobile-dock">
        <form className="mobile-dock-search" onSubmit={addRowFromSizeInput}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.2c0 0 6.4 6.1 6.4 10.4A6.4 6.4 0 0 1 12 20a6.4 6.4 0 0 1-6.4-6.4C5.6 9.3 12 3.2 12 3.2Z" />
          </svg>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ukuran (ml)"
            aria-label="Ukuran baru dalam ml"
            value={quickSize}
            onChange={(event) => setQuickSize(sanitizeDecimal(event.target.value))}
          />
        </form>
        <button
          type="button"
          className="mobile-dock-add"
          onClick={() => addRowFromSizeInput()}
          aria-label="Tambah item"
          title="Tambah item"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
