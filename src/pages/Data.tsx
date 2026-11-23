import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getLocalizedItemName } from "../i18n/gameItems";
import styles from "../assets/styles/Data.module.css";
import planStyles from "../assets/styles/DataPlans.module.css";
import tableStyles from "../assets/styles/DataTables.module.css";
import pathRendererStyles from "../assets/styles/PathRenderer.module.css";
import { classifyData } from "../DataService";
import type { ReactElement } from "react";
import type { SamplePlan } from "../utils/samplePlans";
import {
  acquireSamplePlans,
  consumeSamplePlans,
  renderSamplePathCards,
} from "../utils/samplePlans";

const SANITY_COSTS = [6, 9, 10, 12, 15, 18, 20, 21, 24, 25, 30, 36, 42, 48, 54, 60] as const;
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
  <span className={tableStyles['table-head-chip']}>
    <img
      src={icon}
      alt={alt}
      className={tableStyles['table-head-icon']}
      loading="lazy"
      decoding="async"
    />
    {text && <span className={tableStyles['table-count-chip']}>{text}</span>}
  </span>
);

function DataPage() {
  const { t, i18n } = useTranslation("data");
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
        name: t("eliteLevel", { elite: eliteNames[elite], level }),
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
    return { name: getLocalizedItemName(item, i18n.resolvedLanguage), value: v > 0 ? `+${v}` : String(v) };
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

  const sanityRows = SANITY_COSTS.map((value) => ({
    consume: t("sanityCost", { value }),
    level: t(`stages.${value}`),
  }));

  const getValueClass = (value: string | number) => {
    const numericValue = Number(String(value).replace(/[+,]/g, ""));
    if (Number.isNaN(numericValue) || numericValue === 0) return tableStyles['value-neutral'];
    return numericValue > 0 ? tableStyles['value-gain'] : tableStyles['value-cost'];
  };

  const generateStaticTable = (data: TwoColumnRow[]): ReactElement => (
    <table className={`${tableStyles['material-table']} ${tableStyles['table-a']}`}>
      <thead>
        <tr>
          <th>{t("level")}</th>
          <th><TableHeadChip icon={EXP_GREEN_ICON_URL} text="×1" alt={t("basic")} /></th>
          <th><TableHeadChip icon={EXP_BLUE_ICON_URL} text="×1" alt={t("beginner")} /></th>
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
    <table className={`${tableStyles['material-table']} ${tableStyles['table-b']}`}>
      <thead>
        <tr>
          <th>{t("method")}</th>
          <th><TableHeadChip icon={LMD_ICON_URL} alt={t("currency")} /></th>
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
      localized: true,
      pathRendererClassName: `${pathRendererStyles['path-renderer-container']} ${planStyles['sample-path-container']}`,
      planListClassName: pathRendererStyles['plan-list'],
      cardClassName: planStyles['sample-plan-card'],
      identityValueClassName: planStyles['sample-target-mark'],
      itemClassName: planStyles['sample-item-name'],
    });
  };

  const generateUpgradeTable4 = (data: UpgradeOnlyRow[], startNumber = 1): ReactElement => (
    <table className={`${tableStyles['material-table']} ${tableStyles['table-d']}`}>
      <thead>
        <tr>
          <th><TableHeadChip icon={EXP_GREEN_ICON_URL} alt={t("basicCount")} /></th>
          <th><TableHeadChip icon={LMD_ICON_URL} text={t("eliteLevel", { elite: eliteNames["0"], level: 1 })} alt={t("currency")} /></th>
          <th><TableHeadChip icon={LMD_ICON_URL} text={t("eliteLevel", { elite: eliteNames["1"], level: 1 })} alt={t("currency")} /></th>
          <th><TableHeadChip icon={LMD_ICON_URL} text={t("eliteLevel", { elite: eliteNames["2"], level: 1 })} alt={t("currency")} /></th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td><span className={tableStyles['table-count-chip']}>×{startNumber + i}</span></td>
            <td className={getValueClass(row.value1)}>{row.value1}</td>
            <td className={getValueClass(row.value2)}>{row.value2}</td>
            <td className={getValueClass(row.value3)}>{row.value3}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const generateSanityList = (data: SanityRow[]): ReactElement => {
    const rowsPerColumn = Math.ceil(data.length / 2);

    return (
      <div className={styles['sanity-list']}>
        {[data.slice(0, rowsPerColumn), data.slice(rowsPerColumn)].map((column, columnIndex) => (
          <div className={styles['sanity-column']} key={`sanity-column-${columnIndex}`}>
            {column.map((row, index) => {
              const rowIndex = columnIndex * rowsPerColumn + index;

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
  };

  return (
    <div className={styles['main-data-content']}>
      <main className={styles['data-page']}>
        <header className={styles['data-title-bar']}>
          <h1>// [04] {t("title")}</h1>
          <p>DATA ARCHIVE</p>
        </header>

        <nav className={styles['data-floating-index']} aria-label={t("index")}>
          <span className={styles['floating-index-label']}>INDEX</span>
          <button type="button" className={activeSection === "upgrade-expense" ? styles.active : ""} aria-current={activeSection === "upgrade-expense" ? "location" : undefined} onClick={() => scrollToSection("upgrade-expense")}>{t("upgrade")}</button>
          <button type="button" className={activeSection === "item-value" ? styles.active : ""} aria-current={activeSection === "item-value" ? "location" : undefined} onClick={() => scrollToSection("item-value")}>{t("items")}</button>
          <button type="button" className={activeSection === "sanity-index" ? styles.active : ""} aria-current={activeSection === "sanity-index" ? "location" : undefined} onClick={() => scrollToSection("sanity-index")}>{t("sanity")}</button>
          <button type="button" className={activeSection === "plan-sample" ? styles.active : ""} aria-current={activeSection === "plan-sample" ? "location" : undefined} onClick={() => scrollToSection("plan-sample")}>{t("samples")}</button>
        </nav>

        <section id="upgrade-expense" className={styles['data-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>TABLE 01</span>
            <div>
              <h2>{t("upgrade")}</h2>
              <p>OPERATOR EXPENSE</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                {t("upgradeIntro")}
                <br />
                {t("records")}
                <br />
                {t("levels")}
              </p>
            </div>

            <div className={`${tableStyles['tables-container']} ${tableStyles['desktop-table-container']}`}>
              {generateStaticTable(upgradeTable1)}

              {generateStaticTable(upgradeTable2)}
            </div>

            <div className={`${tableStyles['tables-container']} ${tableStyles['mobile-table-container']}`}>
              {generateStaticTable(upgradeRows)}
            </div>
          </div>
        </section>

        <section id="item-value" className={styles['data-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>TABLE 02</span>
            <div>
              <h2>{t("items")}</h2>
              <p>ITEM VALUE</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                {t("formula")}
                <br />
                {t("threeStars")}
                <br />
                {t("twoStars")}
                <br />
                {t("exceptions")}
                <br />
                {t("excluded")}
              </p>
            </div>

            <div className={`${tableStyles['tables-container']} ${tableStyles['desktop-table-container']}`}>
              {generateStaticTable2(itemTable1)}

              {generateStaticTable2(itemTable2)}
            </div>

            <div className={`${tableStyles['tables-container']} ${tableStyles['mobile-table-container']}`}>
              {generateStaticTable2([...itemTable1, ...itemTable2])}
            </div>

            <div className={`${tableStyles['tables-container']} ${tableStyles['desktop-table-container']}`}>
              {generateUpgradeTable4(upgradeData.slice(0, 15), 1)}
              {generateUpgradeTable4(upgradeData.slice(15, 30), 16)}
            </div>

            <div className={`${tableStyles['tables-container']} ${tableStyles['mobile-table-container']}`}>
              {generateUpgradeTable4(upgradeData)}
            </div>
          </div>
        </section>

        <section id="sanity-index" className={styles['data-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>TABLE 03</span>
            <div>
              <h2>{t("sanity")}</h2>
              <p>SANITY INDEX</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                {t("sanityIntro")}
                <br />
                {t("sanityExcluded")}
              </p>
              {generateSanityList(sanityRows)}
            </div>
          </div>
        </section>

        <section id="plan-sample" className={styles['data-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>PLAN 01</span>
            <div>
              <h2>{t("acquire")}</h2>
              <p>PLAN SAMPLE / ACQUIRE</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                {t("acquireIntro")}
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
              <h2>{t("consume")}</h2>
              <p>PLAN SAMPLE / CONSUME</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                {t("consumeIntro")}
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
