import PropTypes from "prop-types";
import { getItemById } from "../DataService";
import { getRarityColor, computeStepData, computeRunningTotals } from "../utils/calcLogic";
import styles from "../assets/styles/PathRenderer.module.css";

const PathRenderer = ({path, initialLMD, totalPaths, currentIndex, onPrevPath, onNextPath, isBonusReady, activeImageUrl,}) => {
  const safePath = Array.isArray(path) ? path : [];

  if (safePath.length === 0) {
    return <div className={styles['path-renderer-error']}>没有找到合适的路径</div>;
  }

  const startLMD = Number.isInteger(initialLMD) ? initialLMD : 0;

  const { steps: stepData, totalSanity } = computeStepData(safePath, getItemById);
  const runningTotals = computeRunningTotals(stepData, startLMD);

  return (
    <div className={styles['path-renderer-container']}>
      <div className={styles.title}>参考路径方案</div>

      {/* 摘要栏 */}
      <div className={styles.summary}>
        <span>共 <strong>{safePath.length}</strong> 步</span>
        {totalSanity > 0 && <span>消耗理智 <strong>{totalSanity}</strong></span>}
        <span>
          龙门币 <strong>{startLMD}</strong> → <strong>{runningTotals[runningTotals.length - 1]}</strong>
        </span>
      </div>

      {/* 三栏布局：左按钮 | 内容 | 右按钮 */}
      <div className={totalPaths > 1 ? styles['path-body'] : undefined}>
        {totalPaths > 1 && (
          <button
            className={`${styles['side-nav']} ${styles['side-nav-prev']}`}
            onClick={onPrevPath}
          >
            {isBonusReady ? "🎁" : "←"}
          </button>
        )}

        {totalPaths > 1 && (
          <div className={styles['page-indicator']}>
            第 {currentIndex + 1}/{totalPaths} 条
          </div>
        )}

        <div className={totalPaths > 1 ? styles['path-main-steps'] : undefined}>
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
                  {isGain ? "获得" : "消耗"} {Math.abs(stepValue)} 龙门币
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
            {isBonusReady ? "🎁" : "→"}
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
  onPrevPath: PropTypes.func,
  onNextPath: PropTypes.func,
  isBonusReady: PropTypes.bool,
  activeImageUrl: PropTypes.string,
};

export default PathRenderer;
