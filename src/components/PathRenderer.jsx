import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { getItemById } from "../DataService";
import { getRarityColor, computeStepData, computeRunningTotals } from "../utils/calcLogic";
import styles from "../assets/styles/PathRenderer.module.css";

const CIRCLED_NUMS = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

const PathRenderer = ({path, initialLMD, totalPaths, currentIndex, maxSteps, onPrevPath, onNextPath, isBonusReady, activeImageUrl,}) => {
  const [copied, setCopied] = useState(false);
  const stepListRef = useRef(null);
  const stepHeightRef = useRef(0);

  // 首次渲染后测量单步高度，用 maxSteps 预设 min-height
  useEffect(() => {
    const el = stepListRef.current;
    if (!el || !maxSteps) return;
    const cards = el.children;
    if (cards.length > 0 && stepHeightRef.current === 0) {
      stepHeightRef.current = cards[0].offsetHeight;
    }
    if (stepHeightRef.current > 0) {
      const gap = 4; // step-list gap
      el.style.minHeight = `${maxSteps * stepHeightRef.current + (maxSteps - 1) * gap}px`;
    }
  });
  const safePath = Array.isArray(path) ? path : [];

  if (safePath.length === 0) {
    return <div className={styles['path-renderer-error']}>没有找到合适的路径</div>;
  }

  const startLMD = Number.isInteger(initialLMD) ? initialLMD : 0;

  const { steps: stepData, totalSanity } = computeStepData(safePath, getItemById);
  const runningTotals = computeRunningTotals(stepData, startLMD);

  const formatPathText = () => {
    const endLMD = runningTotals[runningTotals.length - 1];
    const header = `【龙门币凑数计算器 ark-lmd.top】`;
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatPathText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard not available */ }
  };

  return (
    <div className={styles['path-renderer-container']}>
      <div className={styles['title-row']}>
        <div className={styles.title}>参考路径方案</div>
        {totalPaths > 1 && (
          <div className={styles['page-indicator']}>
            第 {currentIndex + 1}/{totalPaths} 个方案
          </div>
        )}
      </div>

      {/* 摘要栏 */}
      <div className={styles.summary}>
        <span>共 <strong>{safePath.length}</strong> 步</span>
        {totalSanity > 0 && <span>消耗理智 <strong>{totalSanity}</strong></span>}
        <span>
          龙门币 <strong>{startLMD}</strong> → <strong>{runningTotals[runningTotals.length - 1]}</strong>
        </span>
        <button
          className={copied ? styles['copy-btn-done'] : styles['copy-btn']}
          onClick={handleCopy}
        >
          {copied ? "已复制 ✓" : "复制当前方案"}
        </button>
      </div>

      {/* 移动端方案切换按钮 */}
      {totalPaths > 1 && (
        <div className={styles['mobile-nav-row']}>
          <button className={styles['mobile-nav-btn']} onClick={onPrevPath}>← 上一方案</button>
          <button className={styles['mobile-nav-btn']} onClick={onNextPath}>下一方案 →</button>
        </div>
      )}

      {/* 三栏布局：左按钮 | 内容 | 右按钮 */}
      <div className={totalPaths > 1 ? styles['path-body'] : undefined}>
        {totalPaths > 1 && (
          <button
            className={`${styles['side-nav']} ${styles['side-nav-prev']}`}
            onClick={onPrevPath}
          >
            {isBonusReady ? "🎁" : <><span className={styles['nav-arrow']}>←</span>{safePath.length > 1 && <span className={styles['nav-text']}>上一方案</span>}</>}
          </button>
        )}

        <div className={totalPaths > 1 ? styles['path-main-steps'] : undefined}>
          <div className={styles['step-list']} ref={stepListRef}>
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
        </div>

        {totalPaths > 1 && (
          <button
            className={`${styles['side-nav']} ${styles['side-nav-next']}`}
            onClick={onNextPath}
          >
            {isBonusReady ? "🎁" : <>{safePath.length > 1 && <span className={styles['nav-text']}>下一方案</span>}<span className={styles['nav-arrow']}>→</span></>}
          </button>
        )}
      </div>

      {/* 彩蛋图片 */}
      {activeImageUrl && (
        <div className={styles['romantic-image-container']}>
          <img src={activeImageUrl} alt="Surprise" className={styles['romantic-image']} />
        </div>
      )}
    </div>
  );
};

PathRenderer.propTypes = {
  path: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      count: PropTypes.number.isRequired,
    })
  ).isRequired,
  initialLMD: PropTypes.number.isRequired,
  totalPaths: PropTypes.number,
  currentIndex: PropTypes.number,
  maxSteps: PropTypes.number,
  onPrevPath: PropTypes.func,
  onNextPath: PropTypes.func,
  isBonusReady: PropTypes.bool,
  activeImageUrl: PropTypes.string,
};

export default PathRenderer;
