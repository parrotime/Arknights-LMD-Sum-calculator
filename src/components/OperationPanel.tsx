import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { computeDiff } from "../utils/calcLogic";
import type { CalcMode, CalculatorState } from "../types/calculator";
import SectionHeader from "./SectionHeader";
import styles from "../assets/styles/OperationPanel.module.css";

const CALC_MODES = {
  fast: {
    label: "快速模式",
    code: "Flash",
    desc: "快速响应",
    badgeIcon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/bq04.webp",
    badgeLabel: "推荐",
  },
  strong: {
    label: "加强模式",
    code: "Pro",
    desc: "深度搜索",
    badgeIcon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/bq09.webp",
    badgeLabel: "深度",
  },
} satisfies Record<CalcMode, {
  label: string;
  code: string;
  desc: string;
  badgeIcon: string;
  badgeLabel: string;
}>;

const MODE_TOGGLE_ICON = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/reset.webp";

interface RollingNumberProps {
  value: number;
}

interface RollingDigitStyle extends CSSProperties {
  "--rolling-digit": number;
  "--rolling-delay": string;
}

interface OperationPanelProps {
  state: CalculatorState;
  selectedCalcMode: CalcMode;
  onSelectedCalcModeChange: (mode: CalcMode) => void;
  handleCalculate: (event?: MouseEvent<HTMLElement> | KeyboardEvent<HTMLInputElement>, calcMode?: CalcMode) => void;
  onModeWarning?: (message: string) => void;
}

const RollingNumber = ({ value }: RollingNumberProps) => {
  const text = Math.abs(value).toLocaleString("zh-CN");

  return (
    <span className={styles.rollingNumber} aria-label={text}>
      {Array.from(text).map((char, index) => {
        if (!/\d/.test(char)) {
          return (
            <span className={styles.rollingSeparator} key={`${index}-${char}`}>
              {char}
            </span>
          );
        }

        return (
          <span className={styles.rollingDigitWindow} key={`${index}-${char}`}>
            <span
              className={styles.rollingDigitStrip}
              style={{
                "--rolling-digit": Number(char),
                "--rolling-delay": `${Math.max(0, text.length - index - 1) * 18}ms`,
              } as RollingDigitStyle}
            >
              {"0123456789".split("").map((digit) => (
                <span className={styles.rollingDigit} key={digit}>
                  {digit}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};

const OperationPanel = ({
  state,
  selectedCalcMode,
  onSelectedCalcModeChange,
  handleCalculate,
  onModeWarning,
}: OperationPanelProps) => {
  const [pressedCalculate, setPressedCalculate] = useState<CalcMode | null>(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [hasWarnedStrongMode, setHasWarnedStrongMode] = useState(false);
  const modeSelectRef = useRef<HTMLDivElement | null>(null);

  const diffInfo = useMemo(() => computeDiff(state.num1, state.num2), [state.num1, state.num2]);
  const hasInputError = !!(state.error1 || state.error2);
  const isDiffOutOfRange = hasInputError || diffInfo?.outOfRange;
  const diffDisplay = hasInputError || diffInfo?.outOfRange
    ? { prefix: "", label: "超出范围", amount: null }
    : diffInfo
      ? diffInfo.value > 0
        ? { prefix: "需", label: "获取", amount: Math.abs(diffInfo.value) }
        : diffInfo.value < 0
          ? { prefix: "需", label: "消耗", amount: Math.abs(diffInfo.value) }
          : { prefix: "", label: "无需变化", amount: null }
      : { prefix: "", label: "—", amount: null };
  const isDiffPlaceholder = !hasInputError && !diffInfo;
  const selectedMode = CALC_MODES[selectedCalcMode];

  useEffect(() => {
    if (!modeMenuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!modeSelectRef.current?.contains(event.target as Node)) {
        setModeMenuOpen(false);
      }
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setModeMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [modeMenuOpen]);

  const handleCalculateClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const originX = event.clientX
      ? `${event.clientX - rect.left}px`
      : "50%";

    event.currentTarget.style.setProperty("--confirm-origin-x", originX);
    setPressedCalculate(null);
    requestAnimationFrame(() => setPressedCalculate(selectedCalcMode));
    handleCalculate(event, selectedCalcMode);
  };

  const handleModeSelect = (mode: CalcMode) => {
    onSelectedCalcModeChange(mode);
    setModeMenuOpen(false);

    if (mode === "strong" && !hasWarnedStrongMode) {
      onModeWarning?.("Pro 模式会消耗更多计算资源，建议在 Flash 结果不满足时使用");
      setHasWarnedStrongMode(true);
    }
  };

  return (
    <div className={styles.section}>
      <SectionHeader title="操作区域" code="OPERATION AREA" className={styles.sectionHeader} />
      <div className={styles.operationRow}>
        <div
          className={`${styles.diffSection} ${isDiffOutOfRange ? styles.diffOutOfRange : ""}`}
          aria-live="polite"
        >
          <span className={styles.diffValue}>
            {diffDisplay.prefix && (
              <span className={styles.diffPrefix}>{diffDisplay.prefix}</span>
            )}
            {isDiffPlaceholder ? (
              <span className={styles.diffPlaceholder}>{diffDisplay.label}</span>
            ) : (
              <span className={styles.diffStatusChip}>
                <span className={styles.diffStatusText} key={diffDisplay.label}>
                  {diffDisplay.label}
                </span>
              </span>
            )}
            {diffDisplay.amount !== null && (
              <>
                <RollingNumber value={diffDisplay.amount} />
                <span className={styles.diffUnit}>龙门币</span>
              </>
            )}
          </span>
        </div>

        <div className={styles.actionButtons}>
          <div className={styles.modeSelect} ref={modeSelectRef}>
            <button
              type="button"
              className={`${styles.modeSelectTrigger} ${modeMenuOpen ? styles.modeSelectTriggerOpen : ""}`}
              onClick={() => setModeMenuOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={modeMenuOpen}
              disabled={state.isCalculating}
            >
              <span className={styles.modeSelectCode}>
                <span className={styles.modeSelectFlip} key={`code-${selectedCalcMode}`}>
                  {selectedMode.code}
                </span>
              </span>
              <span className={styles.modeSelectLabel}>
                <span className={styles.modeSelectFlip} key={`label-${selectedCalcMode}`}>
                  {selectedMode.label}
                </span>
              </span>
              <span className={styles.modeSelectIconWrap} aria-hidden="true">
                <img
                  className={styles.modeSelectIcon}
                  src={MODE_TOGGLE_ICON}
                  alt=""
                  draggable="false"
                  decoding="async"
                />
              </span>
            </button>
            {modeMenuOpen && (
              <div className={styles.modeMenu} role="listbox" aria-label="计算模式">
                {(Object.entries(CALC_MODES) as Array<[CalcMode, typeof CALC_MODES[CalcMode]]>).map(([mode, item]) => (
                  <button
                    type="button"
                    className={`${styles.modeMenuItem} ${selectedCalcMode === mode ? styles.modeMenuItemActive : ""}`}
                    role="option"
                    aria-selected={selectedCalcMode === mode}
                    onClick={() => handleModeSelect(mode)}
                    key={mode}
                  >
                    <span className={styles.modeMenuTitle}>
                      <img
                        className={styles.modeMenuBadgeIcon}
                        src={item.badgeIcon}
                        alt={item.badgeLabel}
                        draggable="false"
                        loading="lazy"
                        decoding="async"
                      />
                      <span>{item.label}</span>
                    </span>
                    <span className={styles.modeMenuMeta}>
                      <span className={styles.modeMenuCode}>{item.code}</span>
                      <span className={styles.modeMenuDesc}>{item.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className={`${styles.calculateButton} ${pressedCalculate ? styles.calculateButtonConfirming : ""}`}
            onClick={handleCalculateClick}
            onAnimationEnd={() => setPressedCalculate(null)}
            disabled={state.isCalculating}
          >
            {state.isCalculating ? "计算中..." : "立即计算"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationPanel;
