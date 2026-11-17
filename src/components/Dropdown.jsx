import { useEffect, useId, useMemo, useRef, useState } from 'react';

// game-style dropdown (replaces a native <select>): chunky trigger with an
// icon + round chevron button, and a pop-up panel with optional search, the
// matching part of each option highlighted, and a ✓ badge on the chosen one.
// Keyboard: ↑/↓ move, Enter picks, Esc closes. Opens upward when there isn't
// room below.
//
// options: array of strings, or { value, label } objects
// onChange(value) is called with the picked option's value

// Thai vowel/tone marks that combine with the previous letter — a highlight
// must never end right before one, or the mark gets split off its letter
const THAI_MARK = /[ัิ-ฺ็-๎]/;

function Highlight({ text, query }) {
  const q = query.trim();
  const at = q ? text.indexOf(q) : -1;
  if (at < 0) return text;
  let end = at + q.length;
  while (end < text.length && THAI_MARK.test(text[end])) end++;
  return <>{text.slice(0, at)}<mark>{text.slice(at, end)}</mark>{text.slice(end)}</>;
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.6" /><path d="M15.5 15.5 L20.5 20.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" /></svg>
);

export default function Dropdown({
  value, onChange, options, icon, placeholder = 'เลือก...', searchable = false,
  searchPlaceholder = 'ค้นหา...', emptyText = 'ไม่พบรายการ', ariaLabel, className = '',
}) {
  const opts = useMemo(() => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)), [options]);
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const listId = useId();

  const items = useMemo(() => {
    const q = query.trim();
    return q ? opts.filter((o) => o.label.includes(q)) : opts;
  }, [opts, query]);
  const selected = opts.find((o) => o.value === value);

  function openPanel() {
    const r = triggerRef.current.getBoundingClientRect();
    setUp(window.innerHeight - r.bottom < 330 && r.top > window.innerHeight - r.bottom);
    setQuery('');
    setActive(Math.max(0, opts.findIndex((o) => o.value === value)));
    setOpen(true);
  }
  function close(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }
  function pick(o) {
    onChange(o.value);
    close();
  }

  // focus the search box on desktop only — on phones it would pop the
  // keyboard over the list before the player decides to type
  useEffect(() => {
    if (!open) return undefined;
    if (searchable && window.matchMedia('(pointer: fine)').matches) searchRef.current?.focus();
    else listRef.current?.focus();
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) close(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, searchable]);

  // keep the highlighted option visible by scrolling only the list (not the
  // page): centred when the panel opens, minimal nudges while arrowing
  const justOpenedRef = useRef(false);
  useEffect(() => { if (open) justOpenedRef.current = true; }, [open]);
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector(`[data-idx="${active}"]`);
    if (!open || !el) return;
    if (justOpenedRef.current) {
      justOpenedRef.current = false;
      list.scrollTop = el.offsetTop - (list.clientHeight - el.offsetHeight) / 2;
    } else if (el.offsetTop < list.scrollTop) {
      list.scrollTop = el.offsetTop;
    } else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
    }
  }, [open, active]);

  function onKeyDown(e) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openPanel(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') close(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && items[active]) { e.preventDefault(); pick(items[active]); }
  }

  return (
    <div ref={rootRef} className={`dd ${open ? 'open' : ''} ${up ? 'up' : ''} ${selected ? 'chosen' : ''} ${className}`} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className="dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openPanel())}
      >
        {icon && <span className="dd-icon">{icon}</span>}
        <span className="dd-value">{selected ? selected.label : placeholder}</span>
        <span className="dd-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9.5 L12 15.5 L18 9.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
      </button>

      {open && (
        <div className="dd-panel">
          {searchable && (
            <label className="dd-search">
              <SearchIcon />
              <input
                ref={searchRef}
                type="text"
                value={query}
                placeholder={searchPlaceholder}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                aria-controls={listId}
                aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
              />
              {query && <button type="button" className="dd-clear" aria-label="ล้างคำค้นหา" onClick={() => { setQuery(''); setActive(0); searchRef.current?.focus(); }}>✕</button>}
            </label>
          )}
          <ul ref={listRef} id={listId} className="dd-list" role="listbox" tabIndex={-1} aria-label={ariaLabel}>
            {items.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                data-idx={i}
                role="option"
                aria-selected={o.value === value}
                className={`dd-option ${i === active ? 'active' : ''} ${o.value === value ? 'selected' : ''}`}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(o)}
              >
                <span className="dd-dot" aria-hidden="true" />
                <span className="dd-label"><Highlight text={o.label} query={query} /></span>
                {o.value === value && <span className="dd-check" aria-hidden="true">✓</span>}
              </li>
            ))}
            {items.length === 0 && <li className="dd-empty">{emptyText}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
