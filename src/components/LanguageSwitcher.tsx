import { useEffect, useId, useRef, useState } from "react";

const languages = [
  { code: "zh-CN", label: "简体中文", available: true },
  { code: "zh-TW", label: "繁體中文", available: false },
  { code: "ja", label: "日本語", available: false },
  { code: "en", label: "English", available: false },
  { code: "ko", label: "한국어", available: false },
];

const LanguageSwitcher = () => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentLanguageRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    currentLanguageRef.current?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      className="nav-language"
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="nav-language-toggle"
        ref={triggerRef}
        aria-label="选择语言 / Language"
        title="选择语言 / Language"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <svg className="nav-language-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <path d="M3 12h18M5 6.5h14M5 17.5h14" />
        </svg>
      </button>
      {open && (
        <div className="nav-language-panel" id={panelId} role="group" aria-label="选择语言">
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              className="nav-language-option"
              ref={language.available ? currentLanguageRef : undefined}
              disabled={!language.available}
              aria-current={language.available ? "true" : undefined}
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span lang={language.code}>{language.label}</span>
              <span className="nav-language-status">{language.available ? "当前使用" : "筹备中"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
