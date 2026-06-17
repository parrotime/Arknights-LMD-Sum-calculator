import React, { useState } from "react";
import type { ChangeEvent } from "react";
import type { CalculatorState, LimitInputField } from "../types/calculator";
import SectionHeader from "./SectionHeader";
import styles from "../assets/styles/LimitControlSection.module.css";

type LimitGroupLayout = "sanity" | "elite" | "trade";
type LimitGroupRow = "top" | "bottom";

interface LimitItem {
  labelCn: string;
  labelEn: string;
  field: LimitInputField;
  max: number;
  icon: string;
}

interface LimitGroup {
  title: string;
  code: string;
  row: LimitGroupRow;
  layout: LimitGroupLayout;
  resetLabel: string;
  items: LimitItem[];
}

interface LimitControlSectionProps {
  state: CalculatorState;
  handleUpgradeCountChange: (
    event: ChangeEvent<HTMLInputElement> | { target: { value: string } },
    field: LimitInputField,
    min: number,
    max: number,
    label?: string,
  ) => void;
}

const LIMIT_GROUPS: LimitGroup[] = [
  {
    title: "理智类",
    code: "SANITY USAGE",
    row: "top",
    layout: "sanity",
    resetLabel: "清空理智限制",
    items: [
      {
        labelCn: "允许使用理智数量",
        labelEn: "PERMITTED SANITY",
        field: "sanityCount",
        max: 210,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/san.webp",
      },
    ],
  },
  {
    title: "允许升级的干员人数",
    code: "ALLOWED OPERATOR PROMOTION COUNT",
    row: "top",
    layout: "elite",
    resetLabel: "清空干员人数限制",
    items: [
      {
        labelCn: "精零人数",
        labelEn: "ELITE-0",
        field: "upgrade0Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/elite_0.webp",
      },
      {
        labelCn: "精一人数",
        labelEn: "ELITE-I",
        field: "upgrade1Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/elite_1.webp",
      },
      {
        labelCn: "精二人数",
        labelEn: "ELITE-II",
        field: "upgrade2Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/elite_2.webp",
      },
    ],
  },
  {
    title: "贸易站赤金订单数",
    code: "TRADING POST PURE GOLD ORDERS",
    row: "bottom",
    layout: "trade",
    resetLabel: "清空订单限制",
    items: [
      {
        labelCn: "2赤金订单",
        labelEn: "ORDER-2",
        field: "trade2Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_flow_gs.webp",
      },
      {
        labelCn: "3赤金订单",
        labelEn: "ORDER-3",
        field: "trade3Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_wtcost1.webp",
      },
      {
        labelCn: "4赤金订单",
        labelEn: "ORDER-4",
        field: "trade4Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_wtcost2.webp",
      },
      {
        labelCn: "5赤金订单",
        labelEn: "ORDER-5",
        field: "trade5Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_against2.webp",
      },
    ],
  },
];

const LimitControlSection = ({ state, handleUpgradeCountChange }: LimitControlSectionProps) => {
  const [limitResetAnimating, setLimitResetAnimating] = useState<LimitGroupLayout | null>(null);

  const handleLimitGroupReset = (group: LimitGroup) => {
    setLimitResetAnimating(group.layout);
    group.items.forEach(({ field, max }) => {
      handleUpgradeCountChange({ target: { value: "" } }, field, 0, max);
    });
  };

  const renderLimitInput = ({ labelCn, field, max }: Pick<LimitItem, "labelCn" | "field" | "max">) => (
    <input
      type="text"
      className={styles.input}
      min="0"
      max={max}
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder="不限"
      aria-label={`${labelCn}数量限制`}
      value={state[field] ?? ""}
      onChange={(event) => handleUpgradeCountChange(event, field, 0, max, labelCn)}
    />
  );

  const renderGroup = (group: LimitGroup) => (
    <div className={`${styles.category} ${styles[`category-${group.layout}`]}`} key={group.code}>
      <div className={styles.categoryHeader}>
        <button
          type="button"
          className={`${styles.resetButton} ${limitResetAnimating === group.layout ? styles.resetButtonActive : ""}`}
          onClick={() => handleLimitGroupReset(group)}
          onAnimationEnd={() => setLimitResetAnimating(null)}
          title={group.resetLabel}
          aria-label={group.resetLabel}
        >
          <img
            className={styles.resetIcon}
            src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/clean.webp"
            alt=""
            aria-hidden="true"
            decoding="async"
          />
        </button>
        <span className={styles.categoryTitle}>{group.title}</span>
        <span className={styles.categoryCode}>{group.code}</span>
      </div>
      <div className={`${styles.cardGrid} ${styles[`cardGrid-${group.layout}`]}`}>
        {group.items.map(({ labelCn, labelEn, field, max, icon }) => (
          <label className={styles.card} key={field}>
            <img
              className={styles.cardIcon}
              src={icon}
              alt=""
              aria-hidden="true"
              decoding="async"
            />
            <span className={styles.cardText}>
              <span className={styles.cardLabelCn}>{labelCn}</span>
              <span className={styles.cardLabelEn}>{labelEn}</span>
            </span>
            <span className={styles.inputField}>
              {renderLimitInput({ labelCn, field, max })}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.section}>
      <SectionHeader title="数量限制" note="未输入时采用默认上限" code="LIMIT CONTROL" />
      <div className={styles.categoryList}>
        <div className={styles.categoryRow}>
          {LIMIT_GROUPS.filter((group) => group.row === "top").map(renderGroup)}
        </div>
        {LIMIT_GROUPS.filter((group) => group.row === "bottom").map(renderGroup)}
      </div>
    </div>
  );
};

export default LimitControlSection;
