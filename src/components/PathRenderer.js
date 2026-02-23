import React from "react";
import PropTypes from "prop-types";
import { getItemById } from "../DataService";
import "../assets/styles/PathRenderer.css";

// 路径渲染器
const PathRenderer = ({path, initialLMD, totalPaths, currentIndex, onPrevPath, onNextPath, isBonusReady, activeImageUrl,}) => {
  const safePath = Array.isArray(path) ? path : [];
  
  // 路径为空
  if (safePath.length === 0) {
    return <div className="path-renderer-error">没有找到合适的路径</div>;
  }

  // 初始龙门币数量
  let currentLMD = Number.isInteger(initialLMD) ? initialLMD : 0;

  return (
    <div className="path-renderer-container">
      <div className="path-renderer-path-group">
        <div className="title">参考路径方案</div>
        {totalPaths > 1 && (
          <div className="path-renderer-pagination">
            <button
              className="path-renderer-nav-button path-renderer-prev-button"
              onClick={onPrevPath}
            >
              {/* [修改] 根据 isBonusReady 状态显示不同文本 */}
              {isBonusReady ? "🎁点击一下" : "← 上一路径"}
            </button>
            <div className="path-renderer-dot-container">
              {Array.from({ length: totalPaths }).map((_, index) => (
                <span
                  key={index}
                  className={`path-renderer-dot ${
                    index === currentIndex ? "active" : ""
                  }`}
                />
              ))}
            </div>
            <button
              className="path-renderer-nav-button path-renderer-next-button"
              onClick={onNextPath}
            >
              {isBonusReady ? "🎁点击一下" : "下一路径 →"}
            </button>
          </div>
        )}

        {safePath.map((step, stepIndex) => {
          if (!step || typeof step !== "object") {
            return (
              <div key={`step-${stepIndex}`} className="path-renderer-error">
                无效步骤数据
              </div>
            );
          }

          const item = getItemById(Number(step.id));
          if (!item) {
            return (
              <div key={`step-${stepIndex}`} className="path-renderer-error">
                未知物品ID: {step.id}
              </div>
            );
          }

          const itemValue = item.item_value;
          const itemName = item.item_name;
          const rarity = item.rarity;
          const stepValue = itemValue * step.count;
          currentLMD += stepValue;

          return (
            <div key={`step-${stepIndex}`} className="path-renderer-step-item">
              <span style={{ fontWeight: "bold" }}>步骤 {stepIndex + 1}：</span>
              通过【{step.count}】次【
              <span style={{ color: getRarityColor(rarity) }}>{itemName}</span>
              】， 【{itemValue > 0 ? "获得" : "花费"}】 【{Math.abs(stepValue)}
              】个龙门币， 当前龙门币数量为【{currentLMD}】个。
            </div>
          );
        })}
      </div>

      
      {/* [修改] 条件渲染彩蛋图片，现在它能显示任何激活的图片 */}
      {activeImageUrl && (
          <div className="romantic-image-container">
            <img
              src={activeImageUrl}
              alt="Surprise"
              className="romantic-image"
            />
          </div>
        )
      }
    </div>
  );
};

// 字符串颜色标记
const getRarityColor = (rarity) => {
  const colorMap = { 1: "darkgreen", 2: "darkblue", 3: "purple", 5: "orange" };
  return colorMap[rarity] || "black";
};

// Check
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
  isBonusReady: PropTypes.bool, // 新增
  activeImageUrl: PropTypes.string, // 新增
};

export default PathRenderer;
