import React, { useEffect, useMemo, useState } from "react";
import styles from "../assets/styles/Data.module.css";
import pathRendererStyles from "../assets/styles/PathRenderer.module.css";
import { classifyData } from "../DataService";
import type { ReactElement } from "react";
import type { SamplePlan } from "../utils/samplePlans";
import {
  acquireSamplePlans,
  consumeSamplePlans,
  renderSamplePathCards,
} from "../utils/samplePlans";

const DATA_SECTION_IDS = ["upgrade-expense", "item-value", "sanity-index", "plan-sample"];
const EXP_GREEN_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/exp_green.webp";
const EXP_BLUE_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/exp_blue.webp";
const LMD_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/lmd_logo.webp";
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

interface TableHeadChipProps {
  icon: string;
  text?: string;
  alt?: string;
}

interface TwoColumnRow {
  name: string;
  value1: string;
  value2: string;
}

interface ItemValueRow {
  name: string;
  value: string;
}

interface UpgradeOnlyRow {
  value1: string;
  value2: string;
  value3: string;
}

interface SanityRow {
  consume: string;
  level: string;
}

const TableHeadChip = ({ icon, text, alt = "" }: TableHeadChipProps) => (
  <span className={styles['table-head-chip']}>
    <img
      src={icon}
      alt={alt}
      className={styles['table-head-icon']}
      loading="lazy"
      decoding="async"
    />
    {text && <span className={styles['table-count-chip']}>{text}</span>}
  </span>
);

function DataPage() {
  const [activeSection, setActiveSection] = useState("upgrade-expense");

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    let ticking = false;

    const updateActiveSection = () => {
      const anchorLine = window.innerHeight * 0.36;
      const sectionPositions = DATA_SECTION_IDS
        .map((id) => {
          const target = document.getElementById(id);
          if (!target) return null;
          return { id, top: target.getBoundingClientRect().top };
        })
        .filter((section): section is { id: string; top: number } => section !== null);

      const currentSection = sectionPositions.reduce((current, section) => {
        if (section.top <= anchorLine) return section;
        return current;
      }, sectionPositions[0]);

      if (currentSection?.id) {
        setActiveSection(currentSection.id);
      }

      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // 从 classifyData 动态生成升级表格数据（Table A）
  const eliteNames: Record<string, string> = { "0": "精零", "1": "精一", "2": "精二" };
  const upgradeRows = classifyData
    .filter(item => item.type === "upgrade" && item.item_id.endsWith("-1"))
    .map(item => {
      const [, elite, level] = item.item_id.split("-");
      const pair = classifyData.find(i => i.item_id === `1-${elite}-${level}-2`);
      return {
        name: `${eliteNames[elite]}${level}级`,
        value1: String(item.item_value),
        value2: pair ? String(pair.item_value) : "",
        eliteOrder: Number(elite),
        levelOrder: Number(level),
      };
    })
    .sort((a, b) => a.eliteOrder - b.eliteOrder || a.levelOrder - b.levelOrder)
    .map((row) => ({
      name: row.name,
      value1: row.value1,
      value2: row.value2,
    }));
  const upgradeTable1 = upgradeRows.slice(0, 22);
  const upgradeTable2 = upgradeRows.slice(22);

  // 从 classifyData 动态生成物品价值表格数据（Table B）
  const fmt = (id: number): ItemValueRow => {
    const item = classifyData.find(i => i.id === id);
    if (!item) return { name: "", value: "" };
    const v = item.item_value;
    return { name: item.item_name, value: v > 0 ? `+${v}` : String(v) };
  };
  const itemTable1 = [87,88,89,210,90,91,107,92,108,106,109,110,93,94,95,211,96,97,111,98,112,113,114].map(fmt);
  const itemTable2 = [100,101,102,103,105,104,99,213,212,117,118,119,219,218,217,216,215,214,220,221].map(fmt);

  // 从 classifyData 动态生成累计升级表格数据（Table D）
  const upgradeData = Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    const v = (type: string, prefix: string) => {
      const item = classifyData.find(it => it.type === type && it.item_id === `${prefix}-${n}`);
      return item ? String(item.item_value) : "";
    };
    return { value1: v("upgrade_only_0","1-0"), value2: v("upgrade_only_1","1-1"), value3: v("upgrade_only_2","1-2") };
  });

  const sanityRows = useMemo(() => [
    { consume: "6理智", level: "1-7" },
    { consume: "9理智", level: "活动前三分之一关" },
    { consume: "10理智", level: "作战记录LS-1，技巧概要CA-1，" },
    { consume: "12理智", level: "活动中间三分之一关，2次1-7" },
    { consume: "15理智", level: "作战记录LS-2，技巧概要CA-2，" },
    { consume: "18理智", level: "3次1-7，芯片本1，" },
    { consume: "20理智", level: "作战记录LS-3，技巧概要CA-3，" },
    { consume: "21理智", level: "活动关后三分之一关" },
    { consume: "25理智", level: "作战记录LS-4，技巧概要CA-4，" },
    { consume: "30理智", level: "5次1-7，作战记录LS-5，技巧概要CA-5，" },
    { consume: "36理智", level: "6次1-7，作战记录LS-6，芯片本2，" },
  ], []);

  const getValueClass = (value: string | number) => {
    const numericValue = Number(String(value).replace(/[+,]/g, ""));
    if (Number.isNaN(numericValue) || numericValue === 0) return styles['value-neutral'];
    return numericValue > 0 ? styles['value-gain'] : styles['value-cost'];
  };

  const generateStaticTable = (data: TwoColumnRow[]): ReactElement => (
    <table className={`${styles['material-table']} ${styles['table-a']}`}>
      <thead>
        <tr>
          <th>等级</th>
          <th><TableHeadChip icon={EXP_GREEN_ICON_URL} text="×1" alt="基础作战记录" /></th>
          <th><TableHeadChip icon={EXP_BLUE_ICON_URL} text="×1" alt="初级作战记录" /></th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td>{row.name}</td>
            <td className={getValueClass(row.value1)}>{row.value1}</td>
            <td className={getValueClass(row.value2)}>{row.value2}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const generateStaticTable2 = (data: ItemValueRow[]): ReactElement => (
    <table className={`${styles['material-table']} ${styles['table-b']}`}>
      <thead>
        <tr>
          <th>使用方式</th>
          <th><TableHeadChip icon={LMD_ICON_URL} alt="龙门币" /></th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td>{row.name}</td>
            <td className={getValueClass(row.value)}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const generatePathCards = (data: SamplePlan[]) => {
    return renderSamplePathCards({
      data,
      pathRendererClassName: `${pathRendererStyles['path-renderer-container']} ${styles['sample-path-container']}`,
      planListClassName: pathRendererStyles['plan-list'],
      cardClassName: styles['sample-plan-card'],
      identityValueClassName: styles['sample-target-mark'],
      itemClassName: styles['sample-item-name'],
    });
  };

  const generateUpgradeTable4 = (data: UpgradeOnlyRow[], startNumber = 1): ReactElement => (
    <table className={`${styles['material-table']} ${styles['table-d']} ${styles['table-d1']}`}>
      <thead>
        <tr>
          <th><TableHeadChip icon={EXP_GREEN_ICON_URL} alt="基础作战记录数量" /></th>
          <th><TableHeadChip icon={LMD_ICON_URL} text="精零1级" alt="龙门币" /></th>
          <th><TableHeadChip icon={LMD_ICON_URL} text="精一1级" alt="龙门币" /></th>
          <th><TableHeadChip icon={LMD_ICON_URL} text="精二1级" alt="龙门币" /></th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td><span className={styles['table-count-chip']}>×{startNumber + i}</span></td>
            <td className={getValueClass(row.value1)}>{row.value1}</td>
            <td className={getValueClass(row.value2)}>{row.value2}</td>
            <td className={getValueClass(row.value3)}>{row.value3}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const generateSanityList = (data: SanityRow[]): ReactElement => (
    <div className={styles['sanity-list']}>
      {[data.slice(0, 6), data.slice(6)].map((column, columnIndex) => (
        <div className={styles['sanity-column']} key={`sanity-column-${columnIndex}`}>
          {column.map((row, i) => {
            const rowIndex = columnIndex === 0 ? i : i + 6;

            return (
              <div className={styles['sanity-row']} key={`${row.consume}-${rowIndex}`}>
                <span className={styles['sanity-code']}>{String(rowIndex + 1).padStart(2, "0")}</span>
                <strong>{row.consume}</strong>
                <span>{row.level}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles['main-data-content']}>
      <main className={styles['data-page']}>
        <header className={styles['data-title-bar']}>
          <h1>// [04] 数据档案</h1>
          <p>DATA ARCHIVE</p>
        </header>

        <nav className={styles['data-floating-index']} aria-label="数据档案索引">
          <span className={styles['floating-index-label']}>INDEX</span>
          <button type="button" className={activeSection === "upgrade-expense" ? styles.active : ""} aria-current={activeSection === "upgrade-expense" ? "location" : undefined} onClick={() => scrollToSection("upgrade-expense")}>升级消耗</button>
          <button type="button" className={activeSection === "item-value" ? styles.active : ""} aria-current={activeSection === "item-value" ? "location" : undefined} onClick={() => scrollToSection("item-value")}>物品价值</button>
          <button type="button" className={activeSection === "sanity-index" ? styles.active : ""} aria-current={activeSection === "sanity-index" ? "location" : undefined} onClick={() => scrollToSection("sanity-index")}>理智速查</button>
          <button type="button" className={activeSection === "plan-sample" ? styles.active : ""} aria-current={activeSection === "plan-sample" ? "location" : undefined} onClick={() => scrollToSection("plan-sample")}>方案样例</button>
        </nav>

        <section id="upgrade-expense" className={styles['data-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>TABLE 01</span>
            <div>
              <h2>升级消耗</h2>
              <p>OPERATOR EXPENSE</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                下面是计算过程中使用到的数据，负数表示使用龙门币，正数表示获得龙门币。
                <br />
                基础作战记录和初级作战记录相对而言更容易获得，且对应消耗的龙门币较少，易于计算，因此本网页的计算过程只使用到这两种作战记录。
                <br />
                为减少计算量，相关数据只使用到常见等级对应的数据（例如5的倍数，10的倍数）。
              </p>
            </div>

            <div className={`${styles['tables-container']} ${styles['desktop-table-container']}`}>
              {generateStaticTable(upgradeTable1)}

              {generateStaticTable(upgradeTable2)}
            </div>

            <div className={`${styles['tables-container']} ${styles['mobile-table-container']}`}>
              {generateStaticTable(upgradeRows)}
            </div>
          </div>
        </section>

        <section id="item-value" className={styles['data-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>TABLE 02</span>
            <div>
              <h2>物品价值</h2>
              <p>ITEM VALUE</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                普通关卡获得龙门币数量计算公式：
                <br />
                *三星通关获得龙门币数量 = 使用理智数量 × 12
                <br />
                *二星通关获得龙门币数量 = 使用理智数量 × 10
                <br />
                “龙门币副本CE系列关卡”以及“剿灭系列关卡”不适用上述公式。
                <br />
                由于每日信用商店刷新龙门币数量具有随机性，每日任务/每周任务获取龙门币具有时效性，比较复杂，因此在计算中不考虑此部分。
              </p>
            </div>

            <div className={`${styles['tables-container']} ${styles['desktop-table-container']}`}>
              {generateStaticTable2(itemTable1)}

              {generateStaticTable2(itemTable2)}
            </div>

            <div className={`${styles['tables-container']} ${styles['mobile-table-container']}`}>
              {generateStaticTable2([...itemTable1, ...itemTable2])}
            </div>

            <div className={`${styles['tables-container']} ${styles['desktop-table-container']}`}>
              {generateUpgradeTable4(upgradeData.slice(0, 15), 1)}
              {generateUpgradeTable4(upgradeData.slice(15, 30), 16)}
            </div>

            <div className={`${styles['tables-container']} ${styles['mobile-table-container']}`}>
              {generateUpgradeTable4(upgradeData)}
            </div>
          </div>
        </section>

        <section id="sanity-index" className={styles['data-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>TABLE 03</span>
            <div>
              <h2>理智速查</h2>
              <p>SANITY INDEX</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                此部分为理智消耗与对应关卡速查表。
                <br />
                这里不包含“龙门币副本CE系列关卡”以及“剿灭系列关卡”的相关数据，因为此类关卡的龙门币掉落数量是特定的，与理智消耗数量无关。
              </p>
              {generateSanityList(sanityRows)}
            </div>
          </div>
        </section>

        <section id="plan-sample" className={styles['data-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>PLAN 01</span>
            <div>
              <h2>方案样例：需要获取龙门币</h2>
              <p>PLAN SAMPLE / ACQUIRE</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                以下方案用于快速查阅，不一定是最适合、最简单的方案，仅供参考。（默认初始龙门币为0，目标龙门币为对应值）
              </p>
            </div>
            <div>
              {generatePathCards(acquireSamplePlans)}
            </div>
          </div>
        </section>

        <section className={styles['data-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>PLAN 02</span>
            <div>
              <h2>方案样例：需要消耗龙门币</h2>
              <p>PLAN SAMPLE / CONSUME</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                以下方案用于快速查阅，不一定是最适合、最简单的方案，仅供参考。（默认初始龙门币为对应值，目标龙门币为0）
              </p>
            </div>
            <div>
              {generatePathCards(consumeSamplePlans)}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DataPage;
