import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "../assets/styles/PlanCard.module.css";

const COPY_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/duplication.webp";
const COPIED_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/bq10.webp";

export interface PlanSummaryValue {
  text: ReactNode;
  type?: "value" | "separator";
}

export interface PlanSummaryItem {
  label: string;
  values: PlanSummaryValue[];
  suffix?: string;
}

export interface PlanStepItem {
  key?: string | number;
  title?: string;
  itemName: ReactNode;
  itemClassName?: string;
  itemStyle?: CSSProperties;
  count: string | number;
  deltaText?: ReactNode;
  deltaType?: "gain" | "spend";
  totalLabel: string;
  runningTotal: string | number;
  isFinal?: boolean;
}

interface PlanCardProps {
  className?: string;
  identityLabel: ReactNode;
  identityValue: ReactNode;
  identityValueClassName?: string;
  ariaLabel: string;
  summaryItems: PlanSummaryItem[];
  steps: PlanStepItem[];
  copyText: string;
  copyLabel?: string;
  copiedLabel?: string;
}

const PlanCard = ({
  className = "",
  identityLabel,
  identityValue,
  identityValueClassName = "",
  ariaLabel,
  summaryItems,
  steps,
  copyText,
  copyLabel = "复制当前方案",
  copiedLabel = "已复制当前方案",
}: PlanCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyText) return;

    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <article className={`${styles['plan-card']} ${className}`}>
      <div className={styles['plan-card-header']}>
        <div className={styles['plan-identity']} aria-label={ariaLabel}>
          <span className={styles['plan-mark-label']}>{identityLabel}</span>
          <span className={`${styles['plan-mark-number']} ${identityValueClassName}`}>{identityValue}</span>
        </div>

        <div className={styles.summary}>
          {summaryItems.map((item, index) => (
            <span key={`${item.label}-${index}`}>
              <b>{item.label}</b>
              {item.values.map((value, valueIndex) => (
                value.type === "separator"
                  ? <em key={`${item.label}-separator-${valueIndex}`}>{value.text}</em>
                  : <strong key={`${item.label}-value-${valueIndex}`}>{value.text}</strong>
              ))}
              {item.suffix && <b>{item.suffix}</b>}
            </span>
          ))}
        </div>

        <button
          type="button"
          className={copied ? styles['copy-btn-done'] : styles['copy-btn']}
          onClick={handleCopy}
          aria-label={copied ? copiedLabel : copyLabel}
          aria-live="polite"
        >
          <img
            src={copied ? COPIED_ICON_URL : COPY_ICON_URL}
            alt=""
            className={`${styles['copy-icon']} ${copied ? styles['copy-icon-done'] : styles['copy-icon-copy']}`}
            loading="lazy"
            decoding="async"
          />
          <span>{copied ? "COPIED" : "COPY"}</span>
        </button>
      </div>

      <div className={styles['step-list']}>
        {steps.map((step, index) => (
          <div key={step.key || index} className={styles['step-card']}>
            <span className={styles['step-index']}>
              <span>STEP</span>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
            </span>
            <span className={styles['step-desc']} title={step.title}>
              <span
                className={`${styles['item-name']} ${step.itemClassName || ""}`}
                style={step.itemStyle}
              >
                {step.itemName}
              </span>
              <span className={styles['count-tag']}>×{step.count}次</span>
            </span>
            <span className={styles['step-right']}>
              {step.deltaText && (
                <span className={step.deltaType === "gain" ? styles.gain : styles.spend}>
                  {step.deltaText}
                </span>
              )}
              <span className={step.isFinal ? styles['running-total-final'] : styles['running-total']}>
                <b>{step.totalLabel}</b><strong>{step.runningTotal}</strong>
              </span>
            </span>
          </div>
        ))}
      </div>
    </article>
  );
};

export default PlanCard;
