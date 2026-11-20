import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChangeEvent } from "react";
import type { CalculatorState, LimitInputField } from "../types/calculator";
import SectionHeader from "./SectionHeader";
import styles from "../assets/styles/LimitControlSection.module.css";

type LimitGroupLayout = "sanity" | "elite" | "trade";
type LimitGroupRow = "top" | "bottom";

interface LimitItem {
  labelEn: string;
  field: LimitInputField;
  max: number;
  icon: string;
}

interface LimitGroup {
  code: string;
  row: LimitGroupRow;
  layout: LimitGroupLayout;
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
    code: "SANITY USAGE",
    row: "top",
    layout: "sanity",
    items: [
      {
        labelEn: "PERMITTED SANITY",
        field: "sanityCount",
        max: 210,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/san.webp",
      },
    ],
  },
  {
    code: "ALLOWED OPERATOR PROMOTION COUNT",
    row: "top",
    layout: "elite",
    items: [
      {
        labelEn: "ELITE-0",
        field: "upgrade0Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/elite_0.webp",
      },
      {
        labelEn: "ELITE-I",
        field: "upgrade1Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/elite_1.webp",
      },
      {
        labelEn: "ELITE-II",
        field: "upgrade2Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/elite_2.webp",
      },
    ],
  },
  {
    code: "TRADING POST PURE GOLD ORDERS",
    row: "bottom",
    layout: "trade",
    items: [
      {
        labelEn: "ORDER-2",
        field: "trade2Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_flow_gs.webp",
      },
      {
        labelEn: "ORDER-3",
        field: "trade3Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_wtcost1.webp",
      },
      {
        labelEn: "ORDER-4",
        field: "trade4Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_wtcost2.webp",
      },
      {
        labelEn: "ORDER-5",
        field: "trade5Count",
        max: 10,
        icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/Bskill_tra_against2.webp",
      },
    ],
  },
];

const LimitControlSection = ({ state, handleUpgradeCountChange }: LimitControlSectionProps) => {
  const { t } = useTranslation("calculator");
  const [limitResetAnimating, setLimitResetAnimating] = useState<LimitGroupLayout | null>(null);

  const handleLimitGroupReset = (group: LimitGroup) => {
    setLimitResetAnimating(group.layout);
    group.items.forEach(({ field, max }) => {
      handleUpgradeCountChange({ target: { value: "" } }, field, 0, max);
    });
  };

  const renderLimitInput = ({ field, max }: Pick<LimitItem, "field" | "max">) => (
    <input
      type="text"
      className={styles.input}
      min="0"
      max={max}
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder={t("limits.placeholder")}
      aria-label={t("limits.accessibleLabel", { label: t(`limits.fields.${field}`) })}
      value={state[field] ?? ""}
      onChange={(event) => handleUpgradeCountChange(event, field, 0, max, t(`limits.fields.${field}`))}
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
          title={t(`limits.groups.${group.layout}.reset`)}
          aria-label={t(`limits.groups.${group.layout}.reset`)}
        >
          <img
            className={styles.resetIcon}
            src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/clean.webp"
            alt=""
            aria-hidden="true"
            decoding="async"
          />
        </button>
        <span className={styles.categoryTitle}>{t(`limits.groups.${group.layout}.title`)}</span>
        <span className={styles.categoryCode}>{group.code}</span>
      </div>
      <div className={`${styles.cardGrid} ${styles[`cardGrid-${group.layout}`]}`}>
        {group.items.map(({ labelEn, field, max, icon }) => (
          <label className={styles.card} key={field}>
            <img
              className={styles.cardIcon}
              src={icon}
              alt=""
              aria-hidden="true"
              decoding="async"
            />
            <span className={styles.cardText}>
              <span className={styles.cardLabelCn}>{t(`limits.fields.${field}`)}</span>
              <span className={styles.cardLabelEn}>{labelEn}</span>
            </span>
            <span className={styles.inputField}>
              {renderLimitInput({ field, max })}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.section}>
      <SectionHeader title={t("limits.title")} note={t("limits.note")} code="LIMIT CONTROL" />
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
