import { useState } from "react";
import PropTypes from "prop-types";
import { getItemById } from "../DataService";
import { getRarityColor, computeStepData, computeRunningTotals } from "../utils/calcLogic";
import styles from "../assets/styles/PathRenderer.module.css";

const CIRCLED_NUMS = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

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
        <div className={styles['plan-mark']} aria-label={`方案 ${planIndex + 1}`}>
          <span className={styles['plan-mark-label']}>PLAN</span>
          <span className={styles['plan-mark-number']}>{formatPlanNumber(planIndex)}</span>
        </div>

        <div className={styles.summary}>
          <span>共 <strong>{safePath.length}</strong> 步</span>
          {totalSanity > 0 && <span>消耗理智 <strong>{totalSanity}</strong></span>}
          <span>
            龙门币 <strong>{startLMD}</strong> → <strong>{endLMD}</strong>
          </span>
        </div>

        <button
          className={copied ? styles['copy-btn-done'] : styles['copy-btn']}
          onClick={handleCopy}
        >
          {copied ? "已复制 ✓" : "复制当前方案"}
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

          return (
            <div key={i} className={styles['step-card']}>
              <span className={styles['step-index']}>{i + 1}</span>
              <span className={styles['step-desc']}>
                <span style={{ color: getRarityColor(item.rarity), fontWeight: 600 }}>
                  {item.item_name}
                </span>
                <span className={styles['count-tag']}>×{step.count}次</span>
              </span>
              <span className={styles['step-right']}>
                <span className={isGain ? styles.gain : styles.spend}>
                  {isGain ? "获得" : "消耗"} {step.count > 1 && `(${Math.abs(item.item_value)}×${step.count}=)`}{Math.abs(stepValue)} 龙门币
                </span>
                <span className={i === safePath.length - 1 ? styles['running-total-final'] : styles['running-total']}>
                  {i === safePath.length - 1 ? "结果" : "当前余额"} {runningTotals[i]}
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
