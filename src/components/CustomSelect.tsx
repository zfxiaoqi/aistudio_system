import React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  icon?: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
}

export default function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  icon,
  className = "",
  buttonClassName = "",
  menuClassName = "",
}: CustomSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({});
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  const updatePosition = React.useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = Math.min(options.length * 52 + 12, 300);
    const openAbove = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
    setMenuStyle({
      position: "fixed",
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      top: openAbove ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
      width: rect.width,
      zIndex: 1000,
    });
  }, [options.length]);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !(target as Element).closest?.("[data-custom-select-menu]")) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnViewportChange = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [open, updatePosition]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          updatePosition();
          setOpen((current) => !current);
        }}
        className={`flex w-full items-center gap-2 text-left transition ${open ? "border-blue-300 bg-white ring-4 ring-blue-500/10" : "hover:border-blue-200 hover:bg-blue-50/40"} ${buttonClassName}`}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-blue-600" : "text-slate-400"}`} />
      </button>

      {open && createPortal(
        <div
          data-custom-select-menu
          role="listbox"
          aria-label={ariaLabel}
          style={menuStyle}
          className={`max-h-[300px] overflow-y-auto rounded-2xl border border-blue-100 bg-white p-1.5 shadow-[0_18px_55px_-18px_rgba(15,23,42,0.35)] animate-fade-in ${menuClassName}`}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{option.label}</span>
                  {option.description && (
                    <span className={`mt-0.5 block truncate text-[10px] ${active ? "text-blue-100" : "text-slate-400 group-hover:text-blue-500"}`}>
                      {option.description}
                    </span>
                  )}
                </span>
                {active && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
