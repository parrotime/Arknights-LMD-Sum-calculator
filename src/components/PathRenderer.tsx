import { getItemById } from "../DataService";
import { getRarityColor, computeStepData, computeRunningTotals } from "../utils/calcLogic";
import PlanCard from "./PlanCard";
import type { PlanStepItem, PlanSummaryItem } from "./PlanCard";
import type { CalculationPath, StepData } from "../types/calculator";
import styles from "../assets/styles/PathRenderer.module.css";

const CIRCLED_NUMS = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

const formatPlanNumber = (index: number): string => String(index + 1).padStart(2, "0");

interface BuildPathTextParams {
  safePath: CalculationPath;
  stepData: Array<StepData | null>;
  runningTotals: number[];
  startLMD: number;
  totalSanity: number;
  planIndex: number;
}

const buildPathText = ({
  safePath,
  stepData,
  runningTotals,
  startLMD,
  totalSanity,
  planIndex,
}: BuildPathTextParams): string => {
  const endLMD = runningTotals[runningTotals.length - 1] ?? startLMD;
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

interface PathPlanCardProps {
  path: CalculationPath;
  initialLMD: number;
  planIndex: number;
}

const PathPlanCard = ({ path, initialLMD, planIndex }: PathPlanCardProps) => {
  const safePath = Array.isArray(path) ? path : [];

  if (safePath.length === 0) {
    return <div className={styles['path-renderer-error']}>没有找到合适的路径</div>;
  }

  const startLMD = Number.isInteger(initialLMD) ? initialLMD : 0;
  const { steps: stepData, totalSanity } = computeStepData(safePath, getItemById);
  const runningTotals = computeRunningTotals(stepData, startLMD);
  const endLMD = runningTotals[runningTotals.length - 1] ?? startLMD;

  const summaryItems: PlanSummaryItem[] = [
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

  const steps: PlanStepItem[] = safePath.map((step, i) => {
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
      deltaType: isGain ? "gain" as const : "spend" as const,
      totalLabel: i === safePath.length - 1 ? "结果" : "当前",
      runningTotal: runningTotals[i] ?? startLMD,
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

interface PathRendererProps {
  paths: CalculationPath[];
  initialLMD: number;
}

const PathRenderer = ({ paths, initialLMD }: PathRendererProps) => {
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

export default PathRenderer;
