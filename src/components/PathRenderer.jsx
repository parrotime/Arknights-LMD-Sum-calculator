import { useState } from "react";
import PropTypes from "prop-types";
import { getItemById } from "../DataService";
import { getRarityColor, computeStepData, computeRunningTotals } from "../utils/calcLogic";
import styles from "../assets/styles/PathRenderer.module.css";

const CIRCLED_NUMS = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
const COPY_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/duplication.webp";
const COPIED_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/bq04.webp";

const formatPlanNumber = (index) => String(index + 1).padStart(2, "0");

const buildPathText = ({ safePath, stepData, runningTotals, startLMD, totalSanity, planIndex }) => {
  const endLMD = runningTotals[runningTotals.length - 1];
  const header = `【龙门币凑数计算器 ark-lmd.top | PLAN ${formatPlanNumber(planIndex)}】`;
  const sanityPart = totalSanity > 0 ? ` | 消耗理智 ${totalSanity}` : "";
  const summaryLine = `龙门币 ${startLMD} → ${endLMD} | 共 ${safePath.length} 步${sanityPart}`;

  const lines = safePath.map((step, i) => {
    const sd = stepData[i];
    if (!sd) return `${i + 1}. 未知物品`;
    const { item, stepValue } = sd;
    const num = i < CIRCLED_NUMS.length ? CIRCLED_NUMS[i] : `${i + 1}.`;
    const action = stepValue > 0 ? "获得" : "消耗";
    const label = i === safePath.length - 1 ? "结果" : "当前";
    const breakdown = step.count > 1 ? `(${Math.abs(item.item_value)}×${step.count}=)` : "";
    return `${num} ${item.item_name} ×${step.count}次 → ${action} ${breakdown}${Math.abs(stepValue)} 龙门币（${label} ${runningTotals[i]}）`;
  });

  return `${header}\n${summaryLine}\n\n${lines.join("\n")}`;
};

const PathPlanCard = ({ path, initialLMD, planIndex }) => {
  const [copied, setCopied] = useState(false);
  const safePath = Array.isArray(path) ? path : [];

  if (safePath.length === 0) {
    return <div className={styles['path-renderer-error']}>没有找到合适的路径</div>;
  }

  const startLMD = Number.isInteger(initialLMD) ? initialLMD : 0;
  const { steps: stepData, totalSanity } = computeStepData(safePath, getItemById);
  const runningTotals = computeRunningTotals(stepData, startLMD);
  const endLMD = runningTotals[runningTotals.length - 1];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        buildPathText({ safePath, stepData, runningTotals, startLMD, totalSanity, planIndex })
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <article className={styles['plan-card']}>
      <div className={styles['plan-card-header']}>
        <div className={styles['plan-identity']} aria-label={`方案 ${planIndex + 1}`}>
          <span className={styles['plan-mark-label']}>RECOMMENDED PLAN</span>
          <span className={styles['plan-mark-number']}>PLAN-{formatPlanNumber(planIndex)}</span>
        </div>

        <div className={styles.summary}>
          <span><b>步骤共</b><strong>{safePath.length}</strong><b>步</b></span>
          {totalSanity > 0 && <span><b>理智消耗</b><strong>{totalSanity}</strong></span>}
          <span>
            <b>龙门币变化</b><strong>{startLMD}</strong><em>-&gt;</em><strong>{endLMD}</strong>
          </span>
        </div>

        <button
          className={copied ? styles['copy-btn-done'] : styles['copy-btn']}
          onClick={handleCopy}
          aria-label={copied ? "已复制当前方案" : "复制当前方案"}
        >
          <img
            src={copied ? COPIED_ICON_URL : COPY_ICON_URL}
            alt=""
            className={`${styles['copy-icon']} ${copied ? styles['copy-icon-done'] : styles['copy-icon-copy']}`}
          />
          <span>{copied ? "COPIED" : "COPY"}</span>
        </button>
      </div>

      <div className={styles['step-list']}>
        {safePath.map((step, i) => {
          const sd = stepData[i];
          if (!sd) {
            return (
              <div key={i} className={styles['path-renderer-error']}>
                未知物品ID: {step.id}
              </div>
            );
          }

          const { item, stepValue } = sd;
          const isGain = stepValue > 0;
          const stepTotalLabel = i === safePath.length - 1 ? "结果" : "当前";

          return (
            <div key={i} className={styles['step-card']}>
              <span className={styles['step-index']}>
                <span>STEP</span>
                <strong>{String(i + 1).padStart(2, "0")}</strong>
              </span>
              <span className={styles['step-desc']}>
                <span className={styles['item-name']} style={{ color: getRarityColor(item.rarity) }}>
                  {item.item_name}
                </span>
                <span className={styles['count-tag']}>×{step.count}次</span>
              </span>
              <span className={styles['step-right']}>
                <span className={isGain ? styles.gain : styles.spend}>
                  {isGain ? "+" : "-"}{step.count > 1 && `(${Math.abs(item.item_value)}×${step.count}=)`}{Math.abs(stepValue)} 龙门币
                </span>
                <span className={i === safePath.length - 1 ? styles['running-total-final'] : styles['running-total']}>
                  <b>{stepTotalLabel}</b><strong>{runningTotals[i]}</strong>
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
};

const PathRenderer = ({ paths, initialLMD, activeImageUrl }) => {
  const safePaths = Array.isArray(paths) ? paths : [];

  if (safePaths.length === 0) {
    return <div className={styles['path-renderer-error']}>没有找到合适的路径</div>;
  }

  return (
    <div className={styles['path-renderer-container']}>
      <div className={styles['plan-list']}>
        {safePaths.map((path, index) => (
          <PathPlanCard
            key={`${index}-${path.length}`}
            path={path}
            initialLMD={initialLMD}
            planIndex={index}
          />
        ))}
      </div>

      {activeImageUrl && (
        <div className={styles['romantic-image-container']}>
          <img src={activeImageUrl} alt="Surprise" className={styles['romantic-image']} />
        </div>
      )}
    </div>
  );
};

const pathPropType = PropTypes.arrayOf(
  PropTypes.shape({
    id: PropTypes.number.isRequired,
    count: PropTypes.number.isRequired,
  })
);

PathPlanCard.propTypes = {
  path: pathPropType.isRequired,
  initialLMD: PropTypes.number.isRequired,
  planIndex: PropTypes.number.isRequired,
};

PathRenderer.propTypes = {
  paths: PropTypes.arrayOf(pathPropType).isRequired,
  initialLMD: PropTypes.number.isRequired,
  activeImageUrl: PropTypes.string,
};

export default PathRenderer;
