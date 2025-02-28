import React from "react";
import PropTypes from "prop-types";
import { getItemById } from "../DataService";
import "./PathRenderer.css";

const PathRenderer = ({
  path,
  initialLMD,
  totalPaths,
  currentIndex,
  onPrevPath,
  onNextPath,
}) => {
  const safePath = Array.isArray(path) ? path : [];
  if (!Array.isArray(path)) {
    return <div></div>;
  }

  if (path.length === 0) {
    return <div className="path-error">没有找到合适的路径</div>;
  }

  let currentLMD = Number.isInteger(initialLMD) ? initialLMD : 0;

  return (
    <div className="path-container">
      <div className="path-group">
        <h3>路径方案</h3>
        {safePath.map((step, stepIndex) => {
          const item = getItemById(Number(step.id));
          if (!step || typeof step !== "object") {
            return (
              <div key={`step-${stepIndex}`} className="error">
                无效步骤数据
              </div>
            );
          }
          if (!item) {
            return (
              <div key={`step-${stepIndex}`} className="error">
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
            <div key={`step-${stepIndex}`} className="step_item">
              <span style={{ fontWeight: "bold" }}>步骤 {stepIndex + 1}：</span>
              通过【{step.count}】次使用【
              <span style={{ color: getRarityColor(rarity) }}>{itemName}</span>
              】，【{itemValue > 0 ? "获得" : "花费"}】 【{Math.abs(stepValue)}
              】个龙门币， 当前龙门币数量为【{currentLMD}】
            </div>
          );
        })}
      </div>
      {totalPaths > 1 && (
        <div className="pagination">
          <button className="nav-button prev-button" onClick={onPrevPath}>
            ← 上一路径
          </button>
          {Array.from({ length: totalPaths }).map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentIndex ? "active" : ""}`}
            ></span>
          ))}
          <button className="nav-button next-button" onClick={onNextPath}>
            下一路径 →
          </button>
        </div>
      )}
    </div>
  );
};

const getRarityColor = (rarity) => {
  const colorMap = { 1: "darkgreen", 2: "darkblue", 5: "orange" };
  return colorMap[rarity] || "black";
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
};

export default PathRenderer;
