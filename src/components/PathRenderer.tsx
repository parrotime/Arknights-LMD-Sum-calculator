import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { getItemById } from "../DataService";
import { getLocalizedItemName } from "../i18n/gameItems";
import { getRarityColor, computeStepData, computeRunningTotals } from "../utils/calcLogic";
import PlanCard from "./PlanCard";
import type { PlanStepItem, PlanSummaryItem } from "./PlanCard";
import type { CalculationPath, StepData } from "../types/calculator";
import styles from "../assets/styles/PathRenderer.module.css";
import planStyles from "../assets/styles/PlanCard.module.css";

const CIRCLED_NUMS = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

const formatPlanNumber = (index: number): string => String(index + 1).padStart(2, "0");
const getStepCountUnit = (translate: TFunction<"results">, itemType?: string): string => (
  translate(itemType?.startsWith("upgrade_only_") ? "people" : "times")
);

interface ResultLocale {
  t: TFunction<"results">;
  language?: string;
}

interface BuildPathTextParams extends ResultLocale {
  safePath: CalculationPath;
  stepData: Array<StepData | null>;
  runningTotals: number[];
  startLMD: number;
  totalSanity: number;
  planIndex: number;
  compact?: boolean;
}

const buildPathText = ({
  safePath,
  stepData,
  runningTotals,
  startLMD,
  totalSanity,
  planIndex,
  compact = false,
  t: translate,
  language,
}: BuildPathTextParams): string => {
  const endLMD = runningTotals[runningTotals.length - 1] ?? startLMD;
  const heading = translate("copyPlanHeading", { number: formatPlanNumber(planIndex) });
  const header = compact
    ? `【${heading}】`
    : `【${translate("site")} ark-lmd.top | ${heading}】`;
  const sanityPart = totalSanity > 0 ? ` | ${translate("copySanity", { sanity: totalSanity })}` : "";
  const stepCount = translate("copyStepCount", { count: safePath.length });
  const summaryLine = compact
    ? `${stepCount}${sanityPart}`
    : `${translate("copyBalance", { start: startLMD, end: endLMD })} | ${stepCount}${sanityPart}`;

  const lines = safePath.map((step, i) => {
    const sd = stepData[i];
    if (!sd) return `${i + 1}. ${translate("unknown")}`;
    const { item, stepValue } = sd;
    const num = i < CIRCLED_NUMS.length ? CIRCLED_NUMS[i] : `${i + 1}.`;
    const action = translate(stepValue > 0 ? "gain" : "spend");
    const label = translate(i === safePath.length - 1 ? "final" : "current");
    const breakdown = step.count > 1 ? `(${Math.abs(item.item_value)}×${step.count}=)` : "";
    const line = translate("copyAction", {
      name: getLocalizedItemName(item, language),
      count: step.count,
      unit: getStepCountUnit(translate, item.type),
      action,
      breakdown,
      amount: Math.abs(stepValue),
      label,
      balance: runningTotals[i],
    });
    return `${num} ${line}`;
  });

  return `${header}\n${summaryLine}\n${lines.join("\n")}`;
};

interface BuildPathCopyTextParams extends ResultLocale {
  path: CalculationPath;
  initialLMD: number;
  planIndex: number;
  compact?: boolean;
}

const buildPathCopyText = ({
  path,
  initialLMD,
  planIndex,
  compact = false,
  t: translate,
  language,
}: BuildPathCopyTextParams): string => {
  const safePath = Array.isArray(path) ? path : [];
  const startLMD = Number.isInteger(initialLMD) ? initialLMD : 0;
  const { steps: stepData, totalSanity } = computeStepData(safePath, getItemById);
  const runningTotals = computeRunningTotals(stepData, startLMD);

  return buildPathText({
    safePath,
    stepData,
    runningTotals,
    startLMD,
    totalSanity,
    planIndex,
    compact,
    t: translate,
    language,
  });
};

interface BuildAllPathsCopyTextParams extends ResultLocale {
  paths: CalculationPath[];
  initialLMD: number;
}

export const buildAllPathsCopyText = ({
  paths,
  initialLMD,
  t: translate,
  language,
}: BuildAllPathsCopyTextParams): string => {
  const safePaths = Array.isArray(paths) ? paths : [];
  if (safePaths.length === 0) return "";

  const firstPath = safePaths[0] ?? [];
  const startLMD = Number.isInteger(initialLMD) ? initialLMD : 0;
  const { steps: firstStepData } = computeStepData(firstPath, getItemById);
  const firstRunningTotals = computeRunningTotals(firstStepData, startLMD);
  const endLMD = firstRunningTotals[firstRunningTotals.length - 1] ?? startLMD;
  const heading = `【${translate("site")} ark-lmd.top | ${translate("copyAllHeading")}】`;
  const planCount = translate("copyPlanCount", { count: safePaths.length });
  const balance = translate("copyBalance", { start: startLMD, end: endLMD });
  const header = `${heading}\n${planCount} ${balance}`;
  const divider = "\n==============================\n";
  const planTexts = safePaths.map((path, index) => (
    buildPathCopyText({ path, initialLMD, planIndex: index, compact: true, t: translate, language })
  ));

  return `${header}${divider}${planTexts.join(divider)}`;
};

interface PathPlanCardProps {
  path: CalculationPath;
  initialLMD: number;
  planIndex: number;
}

const PathPlanCard = ({ path, initialLMD, planIndex }: PathPlanCardProps) => {
  const { t: translate, i18n } = useTranslation("results");
  const language = i18n.resolvedLanguage;
  const safePath = Array.isArray(path) ? path : [];

  if (safePath.length === 0) {
    return <div className={styles['path-renderer-error']}>{translate("noPath")}</div>;
  }

  const startLMD = Number.isInteger(initialLMD) ? initialLMD : 0;
  const { steps: stepData, totalSanity } = computeStepData(safePath, getItemById);
  const runningTotals = computeRunningTotals(stepData, startLMD);
  const summaryItems: PlanSummaryItem[] = [
    {
      label: translate("steps"),
      values: [{ text: safePath.length }],
      suffix: translate("stepUnit"),
    },
    ...(totalSanity > 0
      ? [{
          label: translate("sanity"),
          values: [{ text: totalSanity }],
        }]
      : []),
  ];

  const steps: PlanStepItem[] = safePath.map((step, i) => {
    const sd = stepData[i];
    const isFinal = i === safePath.length - 1;
    const totalLabel = translate(isFinal ? "final" : "current");

    if (!sd) {
      return {
        key: `unknown-${i}`,
        itemName: translate("unknownId", { id: step.id }),
        count: step.count,
        countUnit: getStepCountUnit(translate),
        totalLabel,
        runningTotal: runningTotals[i] ?? startLMD,
        isFinal,
      };
    }

    const { item, stepValue } = sd;
    const isGain = stepValue > 0;

    return {
      key: `${step.id}-${i}`,
      itemName: getLocalizedItemName(item, language),
      itemStyle: { color: getRarityColor(item.rarity) },
      count: step.count,
      countUnit: getStepCountUnit(translate, item.type),
      deltaText: `${isGain ? "+" : "-"}${step.count > 1 ? `(${Math.abs(item.item_value)}×${step.count}=)` : ""}${Math.abs(stepValue)} ${translate("currency")}`,
      deltaType: isGain ? "gain" as const : "spend" as const,
      totalLabel,
      runningTotal: runningTotals[i] ?? startLMD,
      isFinal,
    };
  });

  return (
    <PlanCard
      className={planStyles['recommended-plan']}
      identityValue={`PLAN-${formatPlanNumber(planIndex)}`}
      ariaLabel={translate("plan", { number: planIndex + 1 })}
      summaryItems={summaryItems}
      steps={steps}
      copyText={buildPathText({ safePath, stepData, runningTotals, startLMD, totalSanity, planIndex, t: translate, language })}
      copyLabel={translate("copy")}
      copiedLabel={translate("copied")}
      copyButtonText={translate("copyPlanButton")}
      copiedButtonText={translate("copiedPlanButton")}
    />
  );
};

interface PathRendererProps {
  paths: CalculationPath[];
  initialLMD: number;
}

const PathRenderer = ({ paths, initialLMD }: PathRendererProps) => {
  const { t: translate } = useTranslation("results");
  const safePaths = Array.isArray(paths) ? paths : [];

  if (safePaths.length === 0) {
    return <div className={styles['path-renderer-error']}>{translate("noPath")}</div>;
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
