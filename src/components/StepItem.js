import React from 'react';

const StepItem = ({ step, item, count, delta, currentLMD }) => {
  // 根据稀有度选择颜色
  const colorMap = {
    1: 'darkgreen', // 稀有度为 1，设置为 darkgreen
    2: 'darkblue',  // 稀有度为 2，设置为 darkblue
    5: 'orange',    // 稀有度为 5，设置为 orange
  };

  return (
    <div className="step">
      步骤{step}，通过【{count}】次使用
      <span style={{ color: colorMap[item.item_rarity] || 'black' }}>
        {item.item_name}
      </span>
      ，【{item.item_value > 0 ? '获得' : '花费'}】【{delta}】个龙门币，
      当前龙门币数量为【{currentLMD}】。
    </div>
  );
};

export default StepItem;





