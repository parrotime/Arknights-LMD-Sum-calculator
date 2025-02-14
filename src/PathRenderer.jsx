import React from 'react';
import "./PathRender.css";

// 稀有度配色方案
const RARITY_COLORS = {
  1: '#006400',  // 基础级（深绿）
  2: '#00008B',  // 标准级（深蓝） 
  3: '#4B0082',  // 精英级（靛蓝）
  4: '#800080',  // 精一（紫色）
  5: '#FF8C00'   // 精二（橙红）
};

// 路径渲染核心组件
const PathRenderer = ({ paths, startValue }) => {
  if (!paths?.length) {
    return (
      <div className="path-error">
        ⚠️ 没有找到可行路径，请尝试以下方式：
        <ul>
          <li>调整输入数值范围(差值不超过5000)</li>
          <li>放宽资源类型过滤条件</li>
          <li>允许使用信用商店材料</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="path-container">
      {paths.map((path, pathIndex) => {
        let currentSum = startValue;
        
        return (
          <div key={`path-${pathIndex}`} className="path-card">
            <h3 className="path-title">
              路径方案 {pathIndex + 1}
              <span className="path-stats">
                ({path.length}步｜总差额：{Math.abs(path.reduce((sum, item) => sum + item.item_value, 0))})
              </span>
            </h3>

            <div className="step-list">
              {path.map((item, stepIndex) => {
                const isGain = item.item_value > 0;
                currentSum += item.item_value;

                return (
                  <div key={`step-${stepIndex}`} className="step-item">
                    <div className="step-header">
                      <span className="step-order">STEP {stepIndex + 1}</span>
                      <span 
                        className="item-rarity-tag"
                        style={{ backgroundColor: RARITY_COLORS[item.rarity] }}
                      >
                        {['基础', '标准', '精英', '精一', '精二'][item.rarity - 1]}
                      </span>
                    </div>
                    
                    <div className="step-content">
                      <span 
                        className="item-name"
                        style={{ color: RARITY_COLORS[item.rarity] }}
                      >
                        {item.item_name}
                      </span>
                      
                      <span className={`operation-type ${isGain ? 'gain' : 'cost'}`}>
                        {isGain ? '获得' : '消耗'}
                        <strong>{Math.abs(item.item_value)}</strong>
                        资源
                      </span>

                      <span className="current-sum">
                        当前总量：{currentSum.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PathRenderer;
