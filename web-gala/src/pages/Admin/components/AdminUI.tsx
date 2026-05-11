import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";

export const INPUT_CLS =
  "rounded-lg border border-white/15 bg-[#1c1c1e] px-3 py-2 text-sm text-white placeholder:text-white/30 caret-white outline-none transition focus:border-light-gold/50";

export function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/40">
        {label}
      </p>
      {children}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={INPUT_CLS}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min = 0,
}: {
  readonly value: number;
  readonly onChange: (v: number) => void;
  readonly min?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={INPUT_CLS}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className={`${INPUT_CLS} resize-none`}
    />
  );
}

export function DateTimeInput({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
}) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${INPUT_CLS} w-full [color-scheme:dark]`}
    />
  );
}

export function Toggle({
  enabled,
  onChange,
  label,
}: {
  readonly enabled: boolean;
  readonly onChange: (v: boolean) => void;
  readonly label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-white/60">{label}</span>
    </label>
  );
}

export function Section({
  title,
  children,
  defaultOpen = false,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-white/8 bg-white/3 rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-gala text-sm font-semibold text-white/80">
          {title}
        </span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={[
            "text-xs text-white/30 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>
      {open && (
        <div className="border-white/6 flex flex-col gap-4 border-t px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

type Row = { id: string; value: string };

let rowCounter = 0;
const newRow = (value = ""): Row => ({ id: `row-${rowCounter++}`, value });
const toRows = (values: string[]): Row[] => values.map((v) => newRow(v));

export function StringListEditor({
  items,
  onChange,
  placeholder,
}: {
  readonly items: string[];
  readonly onChange: (v: string[]) => void;
  readonly placeholder?: string;
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(items));
  const prevItems = useRef(items);

  useEffect(() => {
    if (prevItems.current === items) return;
    prevItems.current = items;
    const current = rows.map((r) => r.value);
    const differs =
      current.length !== items.length || current.some((v, i) => v !== items[i]);
    if (differs) setRows(toRows(items));
  }, [items, rows]);

  const update = (next: Row[]) => {
    setRows(next);
    onChange(next.map((r) => r.value));
  };

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={row.id} className="flex gap-2">
          <input
            type="text"
            value={row.value}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, value: e.target.value };
              update(next);
            }}
            placeholder={placeholder}
            className={`flex-1 ${INPUT_CLS}`}
          />
          <button
            type="button"
            onClick={() => update(rows.filter((_, idx) => idx !== i))}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-red-400/50 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => update([...rows, newRow()])}
        className="flex items-center gap-2 self-start rounded-full border border-dashed border-dark-gold/40 px-3 py-1.5 text-xs text-dark-gold/70 transition hover:border-dark-gold hover:text-dark-gold"
      >
        <FontAwesomeIcon icon={faPlus} /> Adicionar
      </button>
    </div>
  );
}
