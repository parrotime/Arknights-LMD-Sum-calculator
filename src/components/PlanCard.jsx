import { useState } from "react";
import PropTypes from "prop-types";
import styles from "../assets/styles/PlanCard.module.css";

const COPY_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/duplication.webp";
const COPIED_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/bq10.webp";

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
}) => {
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

PlanCard.propTypes = {
  className: PropTypes.string,
  identityLabel: PropTypes.node.isRequired,
  identityValue: PropTypes.node.isRequired,
  identityValueClassName: PropTypes.string,
  ariaLabel: PropTypes.string.isRequired,
  summaryItems: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      values: PropTypes.arrayOf(
        PropTypes.shape({
          text: PropTypes.node.isRequired,
          type: PropTypes.oneOf(["value", "separator"]),
        })
      ).isRequired,
      suffix: PropTypes.string,
    })
  ).isRequired,
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string,
      itemName: PropTypes.node.isRequired,
      itemClassName: PropTypes.string,
      itemStyle: PropTypes.object,
      count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      deltaText: PropTypes.node,
      deltaType: PropTypes.oneOf(["gain", "spend"]),
      totalLabel: PropTypes.string.isRequired,
      runningTotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      isFinal: PropTypes.bool,
    })
  ).isRequired,
  copyText: PropTypes.string.isRequired,
  copyLabel: PropTypes.string,
  copiedLabel: PropTypes.string,
};

export default PlanCard;
