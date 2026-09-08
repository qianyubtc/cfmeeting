import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { hueOf, writeClipboardText } from '../lib/device';
import { Icon, type IconName } from './Icons';

/* =====================================================================
   iOS-flavoured primitives: filled / tinted / gray buttons, inset grouped
   lists, segmented control, switch, sheets, toasts.
   ===================================================================== */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  block?: boolean;
  icon?: IconName;
  iconRight?: IconName;
};

export function Button({ variant = 'filled', size = 'md', loading, block, icon, iconRight, className = '', children, disabled, ...rest }: ButtonProps) {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
  return (
    <button className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <span className="spinner spinner-sm" aria-hidden="true" /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children ? <span>{children}</span> : null}
      {iconRight && !loading ? <Icon name={iconRight} size={iconSize} /> : null}
    </button>
  );
}

export function IconButton({ icon, label, active, tone = 'gray', size = 36, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; active?: boolean; tone?: 'gray' | 'glass' | 'plain'; size?: number }) {
  return (
    <button className={`icon-btn icon-btn-${tone} ${active ? 'is-active' : ''} ${className}`} title={label} aria-label={label} style={{ width: size, height: size }} {...rest}>
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </button>
  );
}

/* ---------- inset grouped list ---------- */

export function Group({ title, footer, children, className = '' }: { title?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`group ${className}`}>
      {title ? <div className="group-title">{title}</div> : null}
      <div className="group-card">{children}</div>
      {footer ? <div className="group-footer">{footer}</div> : null}
    </section>
  );
}

export function Row({ icon, iconTone = 'blue', label, detail, value, chevron, onClick, children, danger, className = '' }: { icon?: IconName; iconTone?: 'blue' | 'green' | 'red' | 'orange' | 'indigo' | 'teal' | 'gray'; label: ReactNode; detail?: ReactNode; value?: ReactNode; chevron?: boolean; onClick?: () => void; children?: ReactNode; danger?: boolean; className?: string }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`row ${onClick ? 'row-tap' : ''} ${danger ? 'row-danger' : ''} ${className}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      {icon ? (
        <span className={`row-icon tone-${iconTone}`}>
          <Icon name={icon} size={16} />
        </span>
      ) : null}
      <span className="row-main">
        <span className="row-label">{label}</span>
        {detail ? <span className="row-detail">{detail}</span> : null}
      </span>
      {value !== undefined ? <span className="row-value">{value}</span> : null}
      {children}
      {chevron ? <Icon name="chevron-right" size={16} className="row-chevron" /> : null}
    </Tag>
  );
}

export function InputRow({ icon, iconTone, label, trailing, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: IconName; iconTone?: 'blue' | 'green' | 'red' | 'orange' | 'indigo' | 'teal' | 'gray'; label?: ReactNode; trailing?: ReactNode }) {
  return (
    <label className={`row row-input ${className}`}>
      {icon ? (
        <span className={`row-icon tone-${iconTone ?? 'gray'}`}>
          <Icon name={icon} size={16} />
        </span>
      ) : null}
      {label ? <span className="row-label row-label-fixed">{label}</span> : null}
      <input className="row-field" {...rest} />
      {trailing ? <span className="row-trailing">{trailing}</span> : null}
    </label>
  );
}

export function SelectRow({ label, icon, iconTone, value, onChange, options, placeholder }: { label: ReactNode; icon?: IconName; iconTone?: 'blue' | 'green' | 'red' | 'orange' | 'indigo' | 'teal' | 'gray'; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <label className="row row-select">
      {icon ? (
        <span className={`row-icon tone-${iconTone ?? 'gray'}`}>
          <Icon name={icon} size={16} />
        </span>
      ) : null}
      <span className="row-label row-label-fixed">{label}</span>
      <span className="row-select-wrap">
        <select className="row-select-el" value={value} onChange={(e) => onChange(e.target.value)} disabled={options.length === 0}>
          {options.length === 0 ? <option value="">{placeholder ?? '—'}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={14} className="row-select-chev" />
      </span>
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className = '' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; icon?: IconName }[]; className?: string }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={`segmented ${className}`} role="tablist" style={{ ['--seg-count' as string]: options.length, ['--seg-index' as string]: index }}>
      <span className="segmented-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={`segmented-item ${o.value === value ? 'active' : ''}`} onClick={() => onChange(o.value)}>
          {o.icon ? <Icon name={o.icon} size={15} /> : null}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, detail, icon, iconTone }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; detail?: ReactNode; icon?: IconName; iconTone?: 'blue' | 'green' | 'red' | 'orange' | 'indigo' | 'teal' | 'gray' }) {
  return (
    <label className="row row-switch">
      {icon ? (
        <span className={`row-icon tone-${iconTone ?? 'gray'}`}>
          <Icon name={icon} size={16} />
        </span>
      ) : null}
      <span className="row-main">
        <span className="row-label">{label}</span>
        {detail ? <span className="row-detail">{detail}</span> : null}
      </span>
      <span className={`switch ${checked ? 'on' : ''}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch-knob" />
      </span>
    </label>
  );
}

/* ---------- misc ---------- */

export function Spinner({ label, size = 'md', light }: { label?: string; size?: 'md' | 'lg'; light?: boolean }) {
  return (
    <div className={`spinner-wrap ${light ? 'spinner-light' : ''}`} role="status">
      <span className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} aria-hidden="true" />
      {label ? <span className="spinner-label">{label}</span> : null}
    </div>
  );
}

export function Badge({ children, tone = 'blue', icon }: { children: ReactNode; tone?: 'blue' | 'gray' | 'green' | 'orange' | 'red'; icon?: IconName }) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

export function Avatar({ name, size = 44, square }: { name: string; size?: number; square?: boolean }) {
  const hue = hueOf(name || '?');
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <span className={`avatar ${square ? 'avatar-square' : ''}`} style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(160deg, hsl(${hue} 70% 62%), hsl(${(hue + 40) % 360} 70% 50%))` }}>
      {initial}
    </span>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="cfm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b9dff" />
          <stop offset="1" stopColor="#0a63e6" />
        </linearGradient>
        <linearGradient id="cfm-s" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#cfm-g)" />
      <rect x="4" y="4" width="56" height="28" rx="16" fill="url(#cfm-s)" />
      <rect x="14" y="21" width="26" height="22" rx="7" fill="#fff" />
      <path d="M42 28.5 52 22v20l-10-6.5z" fill="#fff" />
    </svg>
  );
}

/* ---------- Sheet / Dialog (nav-bar style header; bottom sheet on phones) ---------- */

export function Sheet({ open, onClose, title, subtitle, children, wide, leading, trailing, className = '' }: { open: boolean; onClose: () => void; title?: ReactNode; subtitle?: ReactNode; children: ReactNode; wide?: boolean; leading?: ReactNode; trailing?: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ${wide ? 'sheet-wide' : ''} ${className}`} role="dialog" aria-modal="true">
        <span className="sheet-grabber" aria-hidden="true" />
        <div className="sheet-nav">
          <div className="sheet-nav-side">
            {leading ?? (
              <button className="nav-text-btn" onClick={onClose} type="button">
                <Icon name="x" size={18} />
              </button>
            )}
          </div>
          <div className="sheet-nav-title">
            <span>{title}</span>
            {subtitle ? <small>{subtitle}</small> : null}
          </div>
          <div className="sheet-nav-side sheet-nav-right">{trailing}</div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */

interface ToastItem {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
}

const ToastContext = createContext<{ toast: (message: string, kind?: ToastItem['kind']) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const toast = useCallback((message: string, kind: ToastItem['kind'] = 'info') => {
    const id = ++counter.current;
    setItems((list) => [...list.slice(-2), { id, message, kind }]);
    window.setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 2800);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <Icon name={t.kind === 'error' ? 'alert' : t.kind === 'success' ? 'circle-check' : 'info'} size={16} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx.toast;
}

/* ---------- Copy row ---------- */

export function CopyRow({ label, value, big, copyLabel, copiedLabel, onCopied, icon }: { label: ReactNode; value: string; big?: boolean; copyLabel: string; copiedLabel: string; onCopied?: () => void; icon?: IconName }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const ok = await writeClipboardText(value);
    if (ok) {
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 1600);
    }
  };
  return (
    <div className={`row row-copy ${big ? 'row-copy-big' : ''}`}>
      {icon ? (
        <span className="row-icon tone-blue">
          <Icon name={icon} size={16} />
        </span>
      ) : null}
      <span className="row-main">
        <span className="row-detail">{label}</span>
        <span className="row-copy-value" title={value}>
          {value}
        </span>
      </span>
      <Button variant={copied ? 'success' : 'tinted'} size="sm" icon={copied ? 'check' : 'copy'} onClick={copy}>
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}
