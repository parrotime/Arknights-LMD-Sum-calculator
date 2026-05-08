import React, { useEffect, useMemo, useState } from "react";
import styles from "../assets/styles/Data.module.css";
import pathStyles from "../assets/styles/PathRenderer.module.css";
import { classifyData } from "../DataService";

const COPY_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/duplication.webp";
const COPIED_ICON_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/bq04.webp";

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

const buildSamplePathText = ({ target, way, planIndex }) => {
  const steps = parseSampleSteps(way);
  const { start, end } = getSampleBounds(target);
  const header = `【龙门币凑数计算器 ark-lmd.top | DATA SAMPLE PLAN ${formatPlanNumber(planIndex)}】`;
  const summary = `目标差值 ${target} | 龙门币 ${start} -> ${end} | 共 ${steps.length} 步`;

  return `${header}\n${summary}\n\n${steps.join("\n")}`;
};

const SamplePathCard = ({ target, way, planIndex, variant }) => {
  const [copied, setCopied] = useState(false);
  const steps = parseSampleSteps(way);
  const { start, end } = getSampleBounds(target);
  let previousValue = start;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildSamplePathText({ target, way, planIndex }));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <article className={pathStyles['plan-card']}>
      <div className={pathStyles['plan-card-header']}>
        <div className={pathStyles['plan-identity']} aria-label={`样例方案 ${planIndex + 1}`}>
          <span className={pathStyles['plan-mark-label']}>SAMPLE {variant}</span>
          <span className={`${pathStyles['plan-mark-number']} ${styles['sample-target-mark']}`}>{target}</span>
        </div>

        <div className={pathStyles.summary}>
          <span><b>目标差值</b><strong>{target}</strong></span>
          <span><b>步骤共</b><strong>{steps.length}</strong><b>步</b></span>
          <span>
            <b>龙门币变化</b><strong>{start}</strong><em>-&gt;</em><strong>{end}</strong>
          </span>
        </div>

        <button
          type="button"
          className={copied ? pathStyles['copy-btn-done'] : pathStyles['copy-btn']}
          onClick={handleCopy}
          aria-label={copied ? "已复制当前样例方案" : "复制当前样例方案"}
        >
          <img
            src={copied ? COPIED_ICON_URL : COPY_ICON_URL}
            alt=""
            className={`${pathStyles['copy-icon']} ${copied ? pathStyles['copy-icon-done'] : pathStyles['copy-icon-copy']}`}
          />
          <span>{copied ? "COPIED" : "COPY"}</span>
        </button>
      </div>

      <div className={pathStyles['step-list']}>
        {steps.map((step, i) => {
          const part = parseSampleStepParts(step, previousValue);
          previousValue = part.runningTotal;
          const isGain = part.actionType === "获得";
          const stepTotalLabel = i === steps.length - 1 ? "结果" : "当前";

          return (
            <div key={`${planIndex}-${i}`} className={pathStyles['step-card']}>
              <span className={pathStyles['step-index']}>
                <span>STEP</span>
                <strong>{String(i + 1).padStart(2, "0")}</strong>
              </span>
              <span className={pathStyles['step-desc']} title={part.text}>
                <span className={`${pathStyles['item-name']} ${styles['sample-item-name']}`}>
                  {part.itemName}
                </span>
                <span className={pathStyles['count-tag']}>×{part.count}次</span>
              </span>
              <span className={pathStyles['step-right']}>
                {part.actionValue > 0 && (
                  <span className={isGain ? pathStyles.gain : pathStyles.spend}>
                    {isGain ? "+" : "-"}{Math.abs(part.stepValue)} 龙门币
                  </span>
                )}
                <span className={i === steps.length - 1 ? pathStyles['running-total-final'] : pathStyles['running-total']}>
                  <b>{stepTotalLabel}</b><strong>{part.runningTotal}</strong>
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
};

function DataPage() {
  const [activeSection, setActiveSection] = useState("upgrade-expense");

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const sectionIds = ["upgrade-expense", "item-value", "sanity-index", "plan-sample"];
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target?.id) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      {
        root: null,
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0.08, 0.2, 0.4],
      }
    );

    sectionIds.forEach((id) => {
      const target = document.getElementById(id);
      if (target) observer.observe(target);
    });

    return () => observer.disconnect();
  }, []);

  // 从 classifyData 动态生成升级表格数据（Table A）
  const eliteNames = { "0": "精零", "1": "精一", "2": "精二" };
  const upgradeRows = classifyData
    .filter(item => item.type === "upgrade" && item.item_id.endsWith("-1"))
    .map(item => {
      const [, elite, level] = item.item_id.split("-");
      const pair = classifyData.find(i => i.item_id === `1-${elite}-${level}-2`);
      return {
        name: `${eliteNames[elite]}${level}级`,
        value1: String(item.item_value),
        value2: pair ? String(pair.item_value) : "",
      };
    });
  const upgradeTable1 = upgradeRows.slice(0, 22);
  const upgradeTable2 = upgradeRows.slice(22);

  // 从 classifyData 动态生成物品价值表格数据（Table B）
  const fmt = (id) => {
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
    const v = (type, prefix) => {
      const item = classifyData.find(it => it.type === type && it.item_id === `${prefix}-${n}`);
      return item ? String(item.item_value) : "";
    };
    return { value1: v("upgrade_only_0","1-0"), value2: v("upgrade_only_1","1-1"), value3: v("upgrade_only_2","1-2") };
  });

  const sanityRows = useMemo(() => [
    { consume: "6理智", level: "1-7" },
    { consume: "9理智", level: "活动关前三分之一关" },
    { consume: "10理智", level: "作战记录LS-1，技巧概要CA-1，" },
    { consume: "12理智", level: "活动关中间三分之一关" },
    { consume: "15理智", level: "作战记录LS-2，技巧概要CA-2，" },
    { consume: "18理智", level: "3次1-7，芯片本1，" },
    { consume: "20理智", level: "作战记录LS-3，技巧概要CA-3，" },
    { consume: "21理智", level: "活动关后三分之一关" },
    { consume: "25理智", level: "作战记录LS-4，技巧概要CA-4，" },
    { consume: "30理智", level: "5次1-7，作战记录LS-5，技巧概要CA-5，" },
    { consume: "36理智", level: "6次1-7，作战记录LS-6，芯片本2，" },
  ], []);

  const getValueClass = (value) => {
    const numericValue = Number(String(value).replace(/[+,]/g, ""));
    if (Number.isNaN(numericValue) || numericValue === 0) return styles['value-neutral'];
    return numericValue > 0 ? styles['value-gain'] : styles['value-cost'];
  };

  const generateStaticTable = (data) => (
    <table className={`${styles['material-table']} ${styles['table-a']}`}>
      <thead>
        <tr>
          <th>等级</th>
          <th>使用1个基础作战记录</th>
          <th>使用1个初级作战记录</th>
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

  const generateStaticTable2 = (data) => (
    <table className={`${styles['material-table']} ${styles['table-b']}`}>
      <thead>
        <tr>
          <th>使用方式</th>
          <th>对应的龙门币</th>
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

  const generatePathCards = (data) => {
    let activeTarget = "";
    const targetCounts = {};

    return (
      <div className={`${pathStyles['path-renderer-container']} ${styles['sample-path-container']}`}>
        <div className={pathStyles['plan-list']}>
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
              />
            );
          })}
        </div>
      </div>
    );
  };

  const generateUpgradeTable4a = (data) => (
    <table className={`${styles['material-table']} ${styles['table-d']} ${styles['table-d1']}`}>
      <thead>
        <tr>
          <th>使用基础作战记录数量</th>
          <th>精零1级对应龙门币</th>
          <th>精一1级对应龙门币</th>
          <th>精二1级对应龙门币</th>
        </tr>
      </thead>
      <tbody>
        {data.slice(0, 15).map((row, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td className={getValueClass(row.value1)}>{row.value1}</td>
            <td className={getValueClass(row.value2)}>{row.value2}</td>
            <td className={getValueClass(row.value3)}>{row.value3}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const generateUpgradeTable4b = (data) => (
    <table className={`${styles['material-table']} ${styles['table-d']} ${styles['table-d2']}`}>
      <thead>
        <tr>
          <th>使用基础作战记录数量</th>
          <th>精零1级对应龙门币</th>
          <th>精一1级对应龙门币</th>
          <th>精二1级对应龙门币</th>
        </tr>
      </thead>
      <tbody>
        {data.slice(15, 30).map((row, i) => (
          <tr key={i}>
            <td>{i + 16}</td> 
            <td className={getValueClass(row.value1)}>{row.value1}</td>
            <td className={getValueClass(row.value2)}>{row.value2}</td>
            <td className={getValueClass(row.value3)}>{row.value3}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const generateSanityList = (data) => (
    <div className={styles['sanity-list']}>
      {data.map((row, i) => (
        <div className={styles['sanity-row']} key={`${row.consume}-${i}`}>
          <span className={styles['sanity-code']}>{String(i + 1).padStart(2, "0")}</span>
          <strong>{row.consume}</strong>
          <span>{row.level}</span>
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

        <nav className={styles['data-index']} aria-label="数据档案索引">
          <button type="button" className={activeSection === "upgrade-expense" ? styles.active : ""} onClick={() => scrollToSection("upgrade-expense")}>升级消耗</button>
          <button type="button" className={activeSection === "item-value" ? styles.active : ""} onClick={() => scrollToSection("item-value")}>物品价值</button>
          <button type="button" className={activeSection === "sanity-index" ? styles.active : ""} onClick={() => scrollToSection("sanity-index")}>理智速查</button>
          <button type="button" className={activeSection === "plan-sample" ? styles.active : ""} onClick={() => scrollToSection("plan-sample")}>路径样例</button>
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
                下面是计算过程中使用到的数据，负数表示使用龙门币，正数表示获得龙门币，数据仅供参考
                <br />
                基础作战记录和初级作战记录相对而言更容易获得，并且对应消耗的龙门币较少，易于计算，因此只用到这两种作战记录
                <br />
                为了减少计算量，只使用了相对常见等级对应的数据（例如5的倍数，10的倍数）
              </p>
            </div>

            <div className={styles['tables-container']}>
              {generateStaticTable(upgradeTable1)}

              {generateStaticTable(upgradeTable2)}
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
                三星通关获得龙门币数量 = 使用理智数量 * 12
                <br />
                二星通关获得龙门币数量 = 使用理智数量 * 10
                <br />
                请在使用前检查并区分当期活动是故事集类型还是sidestory类型，
                此外最好还要检查当期活动商店对应的兑换龙门币数量，本网页使用到的数据是活动商店最后一档的龙门币兑换
                <br />
                由于每日信用商店刷新龙门币数量具有随机性，所以在计算中不考虑这个部分
              </p>
            </div>

            <div className={styles['tables-container']}>
              {generateStaticTable2(itemTable1)}

              {generateStaticTable2(itemTable2)}
            </div>

            <div className={styles['tables-container']}>
              {generateUpgradeTable4a(upgradeData)}
              {generateUpgradeTable4b(upgradeData)}
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
                理智消耗与对应关卡速查表，这里仅为推荐关卡
                <br />
                这里不包含龙门币副本CE系列相关数据，因为CE系列关卡掉落数量是特定的
              </p>
              {generateSanityList(sanityRows)}
            </div>
          </div>
        </section>

        <section id="plan-sample" className={styles['data-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>PLAN 01</span>
            <div>
              <h2>路径样例：目标龙门币 - 现有龙门币 &gt; 0</h2>
              <p>PLAN SAMPLE / ACQUIRE</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                以下路径用于快速查找，不一定是最适合、最简单的路径方案，仅供参考。（默认初始龙门币为0，目标龙门币为对应值）
              </p>
            </div>
            <div>
              {generatePathCards([
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
              ])}
            </div>
          </div>
        </section>

        <section className={styles['data-section']}>
          <div className={styles['section-header']}>
            <span className={styles['section-code']}>PLAN 02</span>
            <div>
              <h2>路径样例：目标龙门币 - 现有龙门币 &lt; 0</h2>
              <p>PLAN SAMPLE / CONSUME</p>
            </div>
          </div>
          <div className={styles['section-content']}>
            <div className={styles['explain-text']}>
              <p>
                以下路径用于快速查找，不一定是最适合的、最简单的路径方案，仅供参考。（默认初始龙门币为对应值，目标龙门币为0）
              </p>
            </div>
            <div>
              {generatePathCards([
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
              ])}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DataPage;
