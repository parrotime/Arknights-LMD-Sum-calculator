import React from "react";
import PlanCard from "../components/PlanCard";

const CIRCLED_NUMS = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

export const acquireSamplePlans = [
  {
    num: "+1",
    way: "步骤 1：通过【1】次使用【贸易站售卖2条赤金】，【获得】 【1000】个龙门币， 当前龙门币数量为【1000】。步骤 2：通过【3】次使用【对1名精零1级干员使用5次基础作战记录】，【花费】 【999】个龙门币， 当前龙门币数量为【1】",
  },
  {
    num: "",
    way: "步骤 1：通过【1】次使用【三星通关21理智关卡】，【获得】 【252】个龙门币， 当前龙门币数量为【252】。步骤 2：通过【1】次使用【对1名精一1级干员使用3次基础作战记录】，【花费】 【251】个龙门币， 当前龙门币数量为【1】。",
  },
  {
    num: "+2",
    way: "步骤 1：通过【2】次使用【三星通关30理智关卡】，【获得】 【720】个龙门币， 当前龙门币数量为【720】。步骤 2：通过【1】次使用【对1名精零1级干员使用10次基础作战记录】，【花费】 【718】个龙门币， 当前龙门币数量为【2】",
  },
  {
    num: "",
    way: "步骤 1：通过【1】次使用【三星通关21理智关卡】，【获得】 【252】个龙门币， 当前龙门币数量为【252】。步骤 2：通过【2】次使用【对1名精零1级干员使用2次基础作战记录】，【花费】 【250】个龙门币， 当前龙门币数量为【2】",
  },
  {
    num: "+5",
    way: "步骤 1：通过【1】次使用【三星通关36理智关卡】，【获得】 【432】个龙门币， 当前龙门币数量为【432】。步骤 2：通过【1】次使用【对1名精一1级干员使用5次基础作战记录】，【花费】 【427】个龙门币， 当前龙门币数量为【5】",
  },
  {
    num: "",
    way: "步骤 1：通过【1】次使用【贸易站售卖2条赤金】，【获得】 【1000】个龙门币， 当前龙门币数量为【1000】。步骤 2：通过【1】次使用【对1名精零1级干员使用15次基础作战记录】，【花费】 【1139】个龙门币， 当前龙门币数量为【-139】。步骤 3：通过【1】次使用【三星通关12理智关卡(等效2次1-7)】，【获得】 【144】个龙门币， 当前龙门币数量为【5】",
  },
  {
    num: "+10",
    way: "步骤 1：通过【2】次使用【三星通关36理智关卡】，【获得】 【864】个龙门币， 当前龙门币数量为【864】。步骤 2：通过【2】次使用【对1名精一1级干员使用5次基础作战记录】，【花费】 【854】个龙门币， 当前龙门币数量为【10】",
  },
  {
    num: "",
    way: "步骤 1：通过【1】次使用【二星通关21理智关卡】，【获得】 【210】个龙门币， 当前龙门币数量为【210】。步骤 2：通过【1】次使用【基建加工站合成蓝色材料】，【花费】 【200】个龙门币， 当前龙门币数量为【10】",
  },
  {
    num: "+50",
    way: "步骤 1：通过【1】次使用【二星通关15理智关卡】，【获得】 【150】个龙门币， 当前龙门币数量为【150】。步骤 2：通过【1】次使用【基建加工站合成绿色材料】，【花费】 【100】个龙门币， 当前龙门币数量为【50】",
  },
  {
    num: "",
    way: "步骤 1：通过【2】次使用【三星通关36理智关卡】，【获得】 【864】个龙门币， 当前龙门币数量为【864】。步骤 2：通过【2】次使用【对1名精零1级干员使用6次基础作战记录】，【花费】 【814】个龙门币， 当前龙门币数量为【50】",
  },
  {
    num: "+100",
    way: "步骤 1：通过【1】次使用【二星通关10理智关卡】，【获得】 【100】个龙门币， 当前龙门币数量为【100】",
  },
  {
    num: "",
    way: "步骤 1：通过【5】次使用【活动商店使用1代币换取20龙门币】，【获得】 【100】个龙门币， 当前龙门币数量为【100】",
  },
];

export const consumeSamplePlans = [
  {
    num: "-1",
    way: "步骤 1：通过【1】次使用【精零1级基础作战记录】，【花费】 【61】个龙门币， 当前龙门币数量为【-60】。步骤 2：通过【1】次使用【二星通关6理智关卡】，【获得】 【60】个龙门币， 当前龙门币数量为【0】",
  },
  {
    num: "",
    way: "步骤 1：通过【1】次使用【基建加工站合成紫色材料】，【花费】 【300】个龙门币， 当前龙门币数量为【-299】。步骤 2：通过【1】次使用【三星通关30理智关卡】，【获得】 【360】个龙门币， 当前龙门币数量为【61】。步骤 3：通过【1】次使用【对1名精零1级干员使用1次基础作战记录】，【花费】 【61】个龙门币， 当前龙门币数量为【0】",
  },
  {
    num: "-2",
    way: "步骤 1：通过【2】次使用【三星通关20理智关卡】，【获得】 【480】个龙门币， 当前龙门币数量为【482】。步骤 2：通过【1】次使用【对1名精零1级干员使用7次基础作战记录】，【花费】 【482】个龙门币， 当前龙门币数量为【0】",
  },
  {
    num: "",
    way: "步骤 1：通过【2】次使用【对1名精零1级干员使用1次基础作战记录】，【花费】 【122】个龙门币， 当前龙门币数量为【-120】。步骤 2：通过【1】次使用【二星通关12理智关卡】，【获得】 【120】个龙门币， 当前龙门币数量为【0】",
  },
  {
    num: "-5",
    way: "步骤 1：通过【1】次使用【三星通关10理智关卡】，【获得】 【120】个龙门币， 当前龙门币数量为【125】。步骤 2：通过【1】次使用【对1名精零1级干员使用2次基础作战记录】，【花费】 【125】个龙门币， 当前龙门币数量为【0】",
  },
  {
    num: "",
    way: "步骤 1：通过【1】次使用【对1名精零1级干员使用2次基础作战记录】，【花费】 【125】个龙门币， 当前龙门币数量为【-120】。步骤 2：通过【1】次使用【二星通关12理智关卡】，【获得】 【120】个龙门币， 当前龙门币数量为【0】",
  },
  {
    num: "-10",
    way: "步骤 1：通过【1】次使用【三星通关21理智关卡】，【获得】 【252】个龙门币， 当前龙门币数量为【262】。步骤 2：通过【1】次使用【对1名精零1级干员使用4次基础作战记录】，【花费】 【262】个龙门币， 当前龙门币数量为【0】",
  },
  {
    num: "",
    way: "步骤 1：通过【1】次使用【二星通关9理智关卡】，【获得】 【90】个龙门币， 当前龙门币数量为【100】。步骤 2：通过【1】次使用【基建加工站合成绿色材料】，【花费】 【100】个龙门币， 当前龙门币数量为【0】",
  },
  {
    num: "-50",
    way: "步骤 1：通过【1】次使用【三星通关36理智关卡】，【获得】 【432】个龙门币， 当前龙门币数量为【482】。步骤 2：通过【1】次使用【对1名精零1级干员使用7次基础作战记录】，【花费】 【482】个龙门币， 当前龙门币数量为【0】",
  },
  {
    num: "",
    way: "步骤 1：通过【1】次使用【二星通关15理智关卡】，【获得】 【150】个龙门币， 当前龙门币数量为【200】。步骤 2：通过【1】次使用【基建加工站合成蓝色材料】，【花费】 【200】个龙门币， 当前龙门币数量为【0】",
  },
  {
    num: "-100",
    way: "通过【1】次使用【基建加工站合成绿色材料】，【花费】 【100】个龙门币",
  },
  {
    num: "",
    way: "步骤 1：通过【1】次使用【二星通关10理智关卡】，【获得】 【100】个龙门币， 当前龙门币数量为【200】。步骤 2：通过【1】次使用【基建加工站合成蓝色材料】，【花费】 【200】个龙门币， 当前龙门币数量为【0】",
  },
];

const parseSampleSteps = (way) =>
  way.split("。").map(s => s.trim()).filter(Boolean);

const parseSampleStepParts = (step, previousValue) => {
  const usage = step.match(/通过【(\d+)】次使用【([^】]+)】/);
  const action = step.match(/【(获得|花费)】\s*【?(-?\d+)】?/);
  const current = step.match(/当前龙门币数量为【(-?\d+)】/);
  const stepValue = action
    ? (action[1] === "获得" ? 1 : -1) * Math.abs(Number(action[2]))
    : 0;

  return {
    count: usage?.[1] || "1",
    itemName: usage?.[2] || step,
    actionType: action?.[1] || "",
    actionValue: action ? Math.abs(Number(action[2])) : 0,
    runningTotal: current ? Number(current[1]) : previousValue + stepValue,
    stepValue,
    text: step,
  };
};

const getSampleBounds = (target) => {
  const targetValue = Number(String(target).replace("+", ""));
  if (Number.isNaN(targetValue)) {
    return { start: 0, end: 0 };
  }
  return targetValue >= 0
    ? { start: 0, end: targetValue }
    : { start: Math.abs(targetValue), end: 0 };
};

const formatPlanNumber = (index) => String(index + 1).padStart(2, "0");

const formatSampleTargetLabel = (target) => {
  const value = Math.abs(Number(String(target).replace("+", "")));
  return Number.isNaN(value)
    ? target
    : `${Number(String(target).replace("+", "")) >= 0 ? "获取" : "消耗"}${value}龙门币`;
};

const buildSamplePathText = ({ target, way, planIndex }) => {
  const steps = parseSampleSteps(way);
  const { start, end } = getSampleBounds(target);
  const header = `【龙门币凑数计算器 ark-lmd.top | DATA SAMPLE PLAN ${formatPlanNumber(planIndex)}】`;
  const summary = `目标差值 ${target} | 龙门币 ${start} -> ${end} | 共 ${steps.length} 步`;

  return `${header}\n${summary}\n\n${steps.join("\n")}`;
};

export const SamplePathCard = ({
  target,
  way,
  planIndex,
  variant,
  className = "",
  identityValueClassName = "",
  itemClassName = "",
}) => {
  const steps = parseSampleSteps(way);
  const { start, end } = getSampleBounds(target);
  let previousValue = start;

  const summaryItems = [
    {
      label: "目标差值",
      values: [{ text: target }],
    },
    {
      label: "步骤共",
      values: [{ text: steps.length }],
      suffix: "步",
    },
    {
      label: "龙门币变化",
      values: [
        { text: start },
        { text: "->", type: "separator" },
        { text: end },
      ],
    },
  ];

  const planSteps = steps.map((step, i) => {
    const part = parseSampleStepParts(step, previousValue);
    previousValue = part.runningTotal;
    const isGain = part.actionType === "获得";

    return {
      key: `${planIndex}-${i}`,
      title: part.text,
      itemName: part.itemName,
      itemClassName,
      count: part.count,
      deltaText: part.actionValue > 0 ? `${isGain ? "+" : "-"}${Math.abs(part.stepValue)} 龙门币` : "",
      deltaType: isGain ? "gain" : "spend",
      totalLabel: i === steps.length - 1 ? "结果" : "当前",
      runningTotal: part.runningTotal,
      isFinal: i === steps.length - 1,
    };
  });

  return (
    <PlanCard
      className={className}
      identityLabel={
        <span className="sample-identity-label">
          <span>{start < end ? "ACQUIRE" : "CONSUME"}</span>
          <strong>SAMPLE {variant}</strong>
        </span>
      }
      identityValue={formatSampleTargetLabel(target)}
      identityValueClassName={identityValueClassName}
      ariaLabel={`样例方案 ${planIndex + 1}`}
      summaryItems={summaryItems}
      steps={planSteps}
      copyText={buildSamplePathText({ target, way, planIndex })}
      copyLabel="复制当前样例方案"
      copiedLabel="已复制当前样例方案"
    />
  );
};

export const renderSamplePathCards = ({
  data,
  pathRendererClassName = "",
  planListClassName = "",
  cardClassName = "",
  identityValueClassName = "",
  itemClassName = "",
}) => {
  let activeTarget = "";
  const targetCounts = {};

  return (
    <div className={pathRendererClassName}>
      <div className={planListClassName}>
        {data.map((row, index) => {
          if (row.num) activeTarget = row.num;
          const target = row.num || activeTarget;
          targetCounts[target] = (targetCounts[target] || 0) + 1;
          const variant = String.fromCharCode(64 + targetCounts[target]);

          return (
            <SamplePathCard
              key={`${target}-${variant}-${index}`}
              target={target}
              way={row.way}
              planIndex={index}
              variant={variant}
              className={cardClassName}
              identityValueClassName={identityValueClassName}
              itemClassName={itemClassName}
            />
          );
        })}
      </div>
    </div>
  );
};

export const formatSampleCopyIndex = (index) =>
  index < CIRCLED_NUMS.length ? CIRCLED_NUMS[index] : `${index + 1}.`;
