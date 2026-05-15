import PropTypes from "prop-types";
import { getItemById } from "../DataService";
import { getRarityColor, computeStepData, computeRunningTotals } from "../utils/calcLogic";
import PlanCard from "./PlanCard";
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
  const safePath = Array.isArray(path) ? path : [];

  if (safePath.length === 0) {
    return <div className={styles['path-renderer-error']}>没有找到合适的路径</div>;
  }

  const startLMD = Number.isInteger(initialLMD) ? initialLMD : 0;
  const { steps: stepData, totalSanity } = computeStepData(safePath, getItemById);
  const runningTotals = computeRunningTotals(stepData, startLMD);
  const endLMD = runningTotals[runningTotals.length - 1];

  const summaryItems = [
    {
      label: "步骤共",
      values: [{ text: safePath.length }],
      suffix: "步",
    },
    ...(totalSanity > 0
      ? [{
          label: "理智消耗",
          values: [{ text: totalSanity }],
        }]
      : []),
    {
      label: "龙门币变化",
      values: [
        { text: startLMD },
        { text: "->", type: "separator" },
        { text: endLMD },
      ],
    },
  ];

  const steps = safePath.map((step, i) => {
    const sd = stepData[i];

    if (!sd) {
      return {
        key: `unknown-${i}`,
        itemName: `未知物品ID: ${step.id}`,
        count: step.count,
        totalLabel: i === safePath.length - 1 ? "结果" : "当前",
        runningTotal: runningTotals[i] ?? startLMD,
        isFinal: i === safePath.length - 1,
      };
    }

    const { item, stepValue } = sd;
    const isGain = stepValue > 0;

    return {
      key: `${step.id}-${i}`,
      itemName: item.item_name,
      itemStyle: { color: getRarityColor(item.rarity) },
      count: step.count,
      deltaText: `${isGain ? "+" : "-"}${step.count > 1 ? `(${Math.abs(item.item_value)}×${step.count}=)` : ""}${Math.abs(stepValue)} 龙门币`,
      deltaType: isGain ? "gain" : "spend",
      totalLabel: i === safePath.length - 1 ? "结果" : "当前",
      runningTotal: runningTotals[i],
      isFinal: i === safePath.length - 1,
    };
  });

  return (
    <PlanCard
      identityLabel="RECOMMENDED PLAN"
      identityValue={`PLAN-${formatPlanNumber(planIndex)}`}
      ariaLabel={`方案 ${planIndex + 1}`}
      summaryItems={summaryItems}
      steps={steps}
      copyText={buildPathText({ safePath, stepData, runningTotals, startLMD, totalSanity, planIndex })}
    />
  );
};

const PathRenderer = ({ paths, initialLMD }) => {
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
};

export default PathRenderer;
