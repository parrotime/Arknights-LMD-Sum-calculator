import React, { useState } from "react";
import styles from "../assets/styles/Data.module.css";
// eslint-disable-next-line no-unused-vars
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import { classifyData } from "../DataService";

const Sidebar = () => (
  <div className="sidebar">
    <div className="sidebar-title">凑数计算器</div>
    {[
      { to: "/", text: "计算主页" },
      { to: "/note", text: "注意事项" },
      { to: "/data", text: "数据部分" },
      { to: "/about", text: "关于" },
    ].map(({ to, text }) => (
      <div className="sidebar-box" key={to}>
        <Link to={to}>{text}</Link>
      </div>
    ))}
  </div>
);

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

function DataPage() {
  const [activePanels, setActivePanels] = useState([]);
  const [clickedPanel, setClickedPanel] = useState(null); 

  const togglePanel = (index) => {
    setClickedPanel(index);
    setActivePanels((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
    setTimeout(() => setClickedPanel(null), 300);
  };

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
  const itemTable1 = [87,88,89,210,90,91,107,92,108,106,109,110,93,94,95,211,96,97,111,98].map(fmt);
  const itemTable2 = [112,113,114,100,101,102,103,105,104,99,213,212,117,118,119,219,218,217,216,215,214].map(fmt);

  // 从 classifyData 动态生成累计升级表格数据（Table D）
  const upgradeData = Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    const v = (type, prefix) => {
      const item = classifyData.find(it => it.type === type && it.item_id === `${prefix}-${n}`);
      return item ? String(item.item_value) : "";
    };
    return { value1: v("upgrade_only_0","1-0"), value2: v("upgrade_only_1","1-1"), value3: v("upgrade_only_2","1-2") };
  });

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
            <td>{row.value1}</td>
            <td>{row.value2}</td>
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
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const generateStaticTable3 = (data) => (
    <table className={`${styles['material-table']} ${styles['table-c']}`}>
      <thead>
        <tr>
          <th>两数之差范围</th>
          <th>推荐路径</th>
        </tr>
      </thead>
      <tbody>
        {data.reduce((acc, row, index, array) => {
          if (index % 2 === 0) {
            const nextRow = array[index + 1];
            const formatWay = (way) =>
              way.includes("。")
                ? way.split("。").map((part, i) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < way.split("。").length - 1 && <br />}
                    </React.Fragment>
                  ))
                : way;

            acc.push(
              <tr key={index}>
                <td rowSpan="2">{`${row.num} ${
                  nextRow ? nextRow.num : row.num
                }`}</td>
                <td>{formatWay(row.way)}</td>
              </tr>,
              nextRow && (
                <tr key={index + 1}>
                  <td>{formatWay(nextRow.way)}</td>
                </tr>
              )
            );
          }
          return acc;
        }, [])}
      </tbody>
    </table>
  );

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
            <td>{row.value1}</td>
            <td>{row.value2}</td>
            <td>{row.value3}</td>
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
            <td>{row.value1}</td>
            <td>{row.value2}</td>
            <td>{row.value3}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const generateStaticTable5 = (data) => (
    <table className={`${styles['material-table']} ${styles['table-c']}`}>
      <thead>
        <tr>
          <th>消耗理智数量</th>
          <th>对应关卡</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td>{row.consume}</td>
            <td>{row.level}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="app-container">
      <Sidebar />
      <button className="back-to-top" onClick={scrollToTop}>
        ↑ 返回顶部
      </button>

      <div className={styles['main-data-content']}>
        <div
          className={`${styles['accordion-panel']} ${
            !activePanels.includes(0) ? styles.collapsed : ""
          }`}
        >
          <div
            className={`${styles['panel-header']} ${clickedPanel === 0 ? styles.active : ""}`}
            onClick={() => togglePanel(0)}
          >
            <h3>参考数据</h3>
          </div>
          <div
            className={`${styles['panel-content']} ${clickedPanel === 0 ? styles.active : ""}`}
          >
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

            <div className={styles['explain-text']}>
              <p>
                三星通关获得龙门币数量 = 使用理智数量 * 12
                <br />
                二星通关获得龙门币数量 = 使用理智数量 * 10
                <br />
                故事集活动商店是指类似于"我们明日见"的活动商店，请在使用前检查并区分当期活动是故事集类型还是sidestory类型，
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
        </div>

        <div
          className={`${styles['accordion-panel']} ${
            !activePanels.includes(1) ? styles.collapsed : ""
          }`}
        >
          <div
            className={`${styles['panel-header']} ${clickedPanel === 1 ? styles.active : ""}`}
            onClick={() => togglePanel(1)}
          >
            <h3>理智消耗与对应关卡速查表</h3>
          </div>
          <div
            className={`${styles['panel-content']} ${clickedPanel === 1 ? styles.active : ""}`}
          >
            <div className={styles['explain-text']}>
              <p>
                理智消耗与对应关卡速查表，这里仅为推荐关卡
                <br />
                这里不包含龙门币副本CE系列相关数据，因为CE系列关卡掉落数量是特定的
              </p>
              {generateStaticTable5([
                { consume: "6理智", level: "1-7" },
                { consume: "9理智", level: "活动关前三分之一关" },
                { consume: "10理智", level: "作战记录LS-1，技巧概要CA-1，" },
                { consume: "12理智", level: "活动关中间三分之一关" },
                { consume: "15理智", level: "作战记录LS-2，技巧概要CA-2，" },
                { consume: "18理智", level: "3次1-7，芯片本1，" },
                { consume: "20理智", level: "作战记录LS-3，技巧概要CA-3，" },
                { consume: "21理智", level: "活动关后三分之一关" },
                { consume: "25理智", level: "作战记录LS-4，技巧概要CA-4，" },
                {
                  consume: "30理智",
                  level: "5次1-7，作战记录LS-5，技巧概要CA-5，",
                },
                { consume: "36理智", level: "6次1-7，作战记录LS-6，芯片本2，" },
              ])}
            </div>
          </div>
        </div>

        <div
          className={`${styles['accordion-panel']} ${
            !activePanels.includes(2) ? styles.collapsed : ""
          }`}
        >
          <div
            className={`${styles['panel-header']} ${clickedPanel === 2 ? styles.active : ""}`}
            onClick={() => togglePanel(2)}
          >
            <h3>推荐路径快速查找：目标龙门币 - 现有龙门币 &gt; 0 的情况</h3>
          </div>
          <div
            className={`${styles['panel-content']} ${clickedPanel === 2 ? styles.active : ""}`}
          >
            <div className={styles['explain-text']}>
              <p>
                以下路径用于快速查找，不一定是最适合、最简单的路径方案，仅供参考。（默认初始龙门币为0，目标龙门币为对应值）
              </p>
            </div>
            <div className={styles['tables-container']}>
              {generateStaticTable3([
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
        </div>

        <div
          className={`${styles['accordion-panel']} ${
            !activePanels.includes(3) ? styles.collapsed : ""
          }`}
        >
          <div
            className={`${styles['panel-header']} ${clickedPanel === 3 ? styles.active : ""}`}
            onClick={() => togglePanel(3)}
          >
            <h3>推荐路径快速查找：目标龙门币 - 现有龙门币 &lt; 0 的情况</h3>
          </div>
          <div
            className={`${styles['panel-content']} ${clickedPanel === 3 ? styles.active : ""}`}
          >
            <div className={styles['explain-text']}>
              <p>
                以下路径用于快速查找，不一定是最适合的、最简单的路径方案，仅供参考。（默认初始龙门币为对应值，目标龙门币为0）
              </p>
            </div>
            <div className={styles['tables-container']}>
              {generateStaticTable3([
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
        </div>
      </div>
    </div>
  );
}

export default DataPage;
