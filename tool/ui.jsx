/* ===== OncoNourish Tool — shared UI primitives + icons ===== */
const { useState, useEffect, useRef, useMemo } = React;

/* ---- icon set ---- */
const ICONS = {
  shield: <path d="M12 3 4 6v5c0 4.5 3.2 7.8 8 10 4.8-2.2 8-5.5 8-10V6l-8-3Z" />,
  shieldCheck: <g><path d="M12 3 4 6v5c0 4.5 3.2 7.8 8 10 4.8-2.2 8-5.5 8-10V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></g>,
  alert: <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
  check: <path d="m5 12 4 4 10-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  arrowR: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowL: <path d="M19 12H5M11 18l-6-6 6-6" />,
  info: <g><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></g>,
  bulb: <path d="M9.5 16.5h5M10 19.5h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2h5c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />,
  lock: <g><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></g>,
  pencil: <path d="M11 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M20.4 4.6a1.8 1.8 0 0 0-2.6 0L9 13.4 8 17l3.6-1L20.4 7.2a1.8 1.8 0 0 0 0-2.6Z" />,
  printer: <path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z" />,
  download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />,
  leaf: <g><path d="M12 21c4.5-3 7-6.5 7-10.5C19 6.4 16.6 4 13.8 4 12.9 4 12 4.4 12 4.4S11.1 4 10.2 4C7.4 4 5 6.4 5 10.5 5 14.5 7.5 18 12 21Z" /><path d="M12 21V8" /></g>,
  user: <g><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></g>,
  sparkles: <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />,
  clipboard: <g><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM8 11h8M8 15h5" /></g>,
  utensils: <path d="M4 3v7a2 2 0 0 0 2 2h0v9M8 3v9M6 3v4M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v9" />,
  droplet: <path d="M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3Z" />,
  pill: <g><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)" /><path d="M9 9l6 6" /></g>,
  heart: <path d="M12 20s-7-4.3-9.3-9.2C1 7.5 3 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3 0 5 3 3.3 6.3C19 15.7 12 20 12 20Z" />,
  scale: <path d="M3 12h4l2 5 4-12 2 7h6" />,
  ruler: <path d="M4 19h16M7 19V9m5 10V5m5 14v-6" />,
  search: <g><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></g>,
  chevron: <path d="m9 6 6 6-6 6" />,
  doc: <path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M8 3v3h8V3M8 12h8M8 16h5" />,
  list: <path d="M4 5h16M4 12h16M4 19h10M7 5v14" />,
  send: <path d="M22 3 11 14M22 3l-7 18-4-8-8-4 19-6Z" />
};
function Ico({ name, size = 18, sw = 1.7, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {ICONS[name]}
    </svg>
  );
}

/* ---- field wrapper ---- */
function Field({ label, optional, help, warn, children }) {
  return (
    <div className="field">
      {label && <div className="label">{label}{optional && <span className="opt">Optional</span>}</div>}
      {children}
      {help && <div className={"help" + (warn ? " warn" : "")}>{help}</div>}
    </div>
  );
}

/* ---- segmented ---- */
function Seg({ options, value, onChange, sm }) {
  return (
    <div className={"seg" + (sm ? " sm" : "")}>
      {options.map(o => {
        const val = typeof o === "string" ? o : o.id;
        const lab = typeof o === "string" ? o : o.label;
        return <button key={val} className={value === val ? "on" : ""} onClick={() => onChange(val)}>{lab}</button>;
      })}
    </div>
  );
}

/* ---- check chip (multi) ---- */
function Chk({ label, on, onClick, ico }) {
  return (
    <button className={"chk" + (on ? " on" : "")} onClick={onClick} type="button">
      <span className="box"><Ico name="check" size={12} sw={3} /></span>
      {ico && <Ico name={ico} size={17} />}
      {label}
    </button>
  );
}

/* ---- toggle row ---- */
function ToggleRow({ title, sub, on, onClick }) {
  return (
    <div className={"toggle-row" + (on ? " on" : "")} onClick={onClick}>
      <div className="t-main"><b>{title}</b>{sub && <span>{sub}</span>}</div>
      <button className={"switch" + (on ? " on" : "")} type="button" aria-pressed={on}></button>
    </div>
  );
}

/* ---- number stepper ---- */
function Stepper({ value, onChange, min = 0, max = 130, step = 1, unit }) {
  const set = v => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div className="stepper">
        <button type="button" onClick={() => set((+value || 0) - step)}>−</button>
        <input type="number" value={value} onChange={e => onChange(e.target.value === "" ? "" : +e.target.value)} />
        <button type="button" onClick={() => set((+value || 0) + step)}>+</button>
      </div>
      {unit && <span className="mono" style={{ color: "var(--muted)", fontSize: 13 }}>{unit}</span>}
    </div>
  );
}

/* ---- tag / chip input ---- */
function TagInput({ tags, onChange, placeholder }) {
  const [draft, setDraft] = useState("");
  const add = () => { const v = draft.trim(); if (v) { onChange([...tags, v]); setDraft(""); } };
  return (
    <div className="tagbox" onClick={e => e.currentTarget.querySelector("input").focus()}>
      {tags.map((t, i) => (
        <span className="tag" key={i}>{t}<button type="button" onClick={() => onChange(tags.filter((_, j) => j !== i))}>×</button></span>
      ))}
      <input value={draft} placeholder={tags.length ? "" : placeholder} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1)); }}
        onBlur={add} />
    </div>
  );
}

Object.assign(window, { useState, useEffect, useRef, useMemo, Ico, Field, Seg, Chk, ToggleRow, Stepper, TagInput });
