import React from 'react';
import PropTypes from 'prop-types';
import { getItemById } from '../DataService'; // 只导入实际存在的函数


let renderCount = 0;
const PathRenderer = ({ path, initialLMD }) => {
  // 增加空值检查
  const safePath = Array.isArray(path) ? path : [];
  // 数据校验保持不变
  if (!Array.isArray(path)) {
    return <div className="path-error"></div>;
  }

  if (path.length === 0) {
    return <div className="path-error">没有找到合适的路径</div>;
  }

  let currentLMD = Number.isInteger(initialLMD) ? initialLMD : 0;

/*console.log(`safePath:`, safePath);
console.log(`path:`, path);
console.log(`initialLMD:`, initialLMD);*/

  return (
    <div className="path-container">
      <div className="path-group">
        <h3>路径方案</h3>
        {safePath.map((step, stepIndex) => {
          // 添加步骤数据校验
          renderCount++;
          console.log(`第${renderCount}次渲染`);
          //console.log(`正在渲染步骤 ${stepIndex}`, step);
          //console.log(`step is :`, step);
          // WRONG!!! console.log(`item is :`, item);
          console.log('stepindex is :',stepIndex);

          console.log(`okkkkkkkkkkkkkkkkkkk`);

          const item = getItemById(Number(step.id));

          /*console.log(`item is :`, item);
          console.log(`step.id is :`, step.id);
          console.log(`2222222222222222`);*/

          /*console.log(`[调试A] 步骤${stepIndex}物品详情:`, {
            Id: item.id,
            itemName: item.item_name,
            itemValue: item.item_value,
            rarity: item.rarity,
            stepCount: step.count,
          });*/



          if (!step || typeof step !== "object") {
            return (
              <div key={`step-${stepIndex}`} className="error">
                无效步骤数据
              </div>
            );
          }


          // 新增调试日志
          /*console.log(`[调试B] 步骤${stepIndex}数据:`, {
            stepData: step,
            itemId: step.item_id,
            Id: step.id,
            itemExists: !!item,

          });*/

          if (!item) {
            return (
              <div key={`step-${stepIndex}`} className="error">
                未知物品ID: {step.id}
              </div>
            );
          }

          // 从物品对象中直接获取所需属性
          const itemValue = item.item_value; // 假设数据服务返回的对象包含value字段
          const itemName = item.item_name; // 假设包含name字段
          const rarity = item.rarity; // 假设包含rarity字段

          const stepValue = itemValue * step.count;
          currentLMD += stepValue;

          // 打印关键字段值
          /*console.log(`[调试C] 步骤${stepIndex}物品详情:`, {
            Id: item.id,
            itemName: item.item_name,
            itemValue: item.item_value,
            rarity: item.rarity,
            stepCount: step.count,
          });

          console.log(`33333333333333333`);
          console.log(`[调试D] 步骤${stepIndex}物品详情:`, {
            stepIndex: stepIndex,
            step_count: step.count,
            itemValue: itemValue,
            step_name: itemName,
            stepValue: stepValue,
            currentLMD: currentLMD,
          });*/

          return (
            <div key={`step-${stepIndex}`} className="step_item">
              步骤 {stepIndex + 1}：通过【{step.count}】次使用【
              <span style={{ color: getRarityColor(rarity) }}>{itemName}</span>
              】，【{itemValue > 0 ? "获得" : "花费"}】 【{Math.abs(stepValue)}
              】个龙门币， 当前龙门币数量为【{currentLMD}】
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 保持颜色映射函数不变
const getRarityColor = (rarity) => {
  const colorMap = {
    1: "darkgreen",
    2: "darkblue",
    5: "orange",
  };
  return colorMap[rarity] || "black";
};

// 保持PropTypes不变
PathRenderer.propTypes = {
  path: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      count: PropTypes.number.isRequired,
    })
  ).isRequired,
  initialLMD: PropTypes.number.isRequired,
};

export default PathRenderer;
