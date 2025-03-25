import React, { useState } from "react";
import "../../src/assets/styles/Data.css";
//import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";

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
  const [clickedPanel, setClickedPanel] = useState(null); // 新增状态跟踪点击的面板

  const togglePanel = (index) => {
    // 点击时设置被点击的面板
    setClickedPanel(index);
    setActivePanels((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
    // 300ms 后移除点击状态，与动画时间一致
    setTimeout(() => setClickedPanel(null), 300);
  };

  // 生成预定义数据的静态表格
  const generateStaticTable = (data) => (
    <table className="material-table table-a">
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
    <table className="material-table table-b">
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

    // 修改 generateStaticTable3，优化换行显示
  const generateStaticTable3 = (data) => (
    <table className="material-table table-c">
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

  // 新增：生成 31 行 4 列的表格函数
  const generateUpgradeTable4a = (data) => (
    <table className="material-table table-d table-d1">
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
    <table className="material-table table-d table-d2">
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
            <td>{i + 16}</td> {/* 从 16 开始计数 */}
            <td>{row.value1}</td>
            <td>{row.value2}</td>
            <td>{row.value3}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const upgradeData = [
    { value1: "-61", value2: "-81", value3: "-80" },
    { value1: "-125", value2: "-165", value3: "-162" },
    { value1: "-192", value2: "-251", value3: "-244" },
    { value1: "-262", value2: "-338", value3: "-328" },
    { value1: "-338", value2: "-427", value3: "-412" },
    { value1: "-407", value2: "-516", value3: "-497" },
    { value1: "-482", value2: "-607", value3: "-583" },
    { value1: "-559", value2: "-700", value3: "-670" },
    { value1: "-638", value2: "-793", value3: "-757" },
    { value1: "-718", value2: "-886", value3: "-844" },
    { value1: "-800", value2: "-982", value3: "-933" },
    { value1: "-883", value2: "-1077", value3: "-1022" },
    { value1: "-967", value2: "-1175", value3: "-1110" },
    { value1: "-1053", value2: "-1273", value3: "-1199" },
    { value1: "-1139", value2: "-1371", value3: "-1290" },
    { value1: "-1228", value2: "-1471", value3: "-1381" },
    { value1: "-1317", value2: "-1570", value3: "-1472" },
    { value1: "-1407", value2: "-1671", value3: "-1563" },
    { value1: "-1503", value2: "-1772", value3: "-1654" },
    { value1: "-1601", value2: "-1874", value3: "-1747" },
    { value1: "-1707", value2: "-1976", value3: "-1839" },
    { value1: "-1812", value2: "-2081", value3: "-1932" },
    { value1: "-1926", value2: "-2185", value3: "-2024" },
    { value1: "-2040", value2: "-2289", value3: "-2118" },
    { value1: "-2162", value2: "-2395", value3: "-2213" },
    { value1: "-2284", value2: "-2502", value3: "-2307" },
    { value1: "-2413", value2: "-2608", value3: "-2401" },
    { value1: "-2542", value2: "-2714", value3: "-2496" },
    { value1: "-2678", value2: "-2823", value3: "-2591" },
    { value1: "-2815", value2: "-2931", value3: "-2687" },
  ];

  const generateStaticTable5 = (data) => (
    <table className="material-table table-c">
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

      <div className="main-data-content">
        <div
          className={`accordion-panel ${
            !activePanels.includes(0) ? "collapsed" : ""
          }`}
        >
          <div
            className={`panel-header ${clickedPanel === 0 ? "active" : ""}`}
            onClick={() => togglePanel(0)}
          >
            <h3>参考数据</h3>
          </div>
          <div
            className={`panel-content ${clickedPanel === 0 ? "active" : ""}`}
          >
            <div className="explain-text">
              <p>
                下面是计算过程中使用到的数据，负数表示使用龙门币，正数表示获得龙门币，数据仅供参考
                <br />
                基础作战记录和初级作战记录相对而言更容易获得，并且对应消耗的龙门币较少，易于计算，因此只用到这两种作战记录
                <br />
                为了减少计算量，只使用了相对常见等级对应的数据（例如5的倍数，10的倍数）
              </p>
            </div>

            <div className="tables-container">
              {generateStaticTable([
                { name: "精零1级", value1: '"-61"', value2: '"-125"' },
                { name: "精零5级", value1: '"-69"', value2: '"-141"' },
                { name: "精零10级", value1: '"-79"', value2: '"-159"' },
                { name: "精零15级", value1: '"-88"', value2: '"-177"' },
                { name: "精零20级", value1: '"-122"', value2: '"-251"' },
                { name: "精零25级", value1: '"-162"', value2: '"-324"' },
                { name: "精零30级", value1: '"-202"', value2: '"-404"' },
                { name: "精零35级", value1: '"-242"', value2: '"-484"' },
                { name: "精零40级", value1: '"-282"', value2: '"-564"' },
                { name: "精零45级", value1: '"-322"', value2: '"-644"' },
                { name: "精一1级", value1: '"-81"', value2: '"-165"' },
                { name: "精一5级", value1: '"-89"', value2: '"-179"' },
                { name: "精一10级", value1: '"-100"', value2: '"-199"' },
                { name: "精一15级", value1: '"-111"', value2: '"-222"' },
                { name: "精一20级", value1: '"-122"', value2: '"-244"' },
                { name: "精一25级", value1: '"-133"', value2: '"-265"' },
                { name: "精一30级", value1: '"-144"', value2: '"-288"' },
                { name: "精一35级", value1: '"-155"', value2: '"-310"' },
                { name: "精一40级", value1: '"-166"', value2: '"-332"' },
                { name: "精一45级", value1: '"-177"', value2: '"-354"' },
                { name: "精一50级", value1: '"-188"', value2: '"-376"' },
                { name: "精一55级", value1: '"-199"', value2: '"-398"' },
              ])}

              {/* 表2 */}
              {generateStaticTable([
                { name: "精一60级", value1: '"-210"', value2: '"-420"' },
                { name: "精一65级", value1: '"-221"', value2: '"-442"' },
                { name: "精一70级", value1: '"-232"', value2: '"-464"' },
                { name: "精一75级", value1: '"-243"', value2: '"-486"' },
                { name: "精二1级", value1: '"-80"', value2: '"-162"' },
                { name: "精二5级", value1: '"-87"', value2: '"-175"' },
                { name: "精二10级", value1: '"-96"', value2: '"-192"' },
                { name: "精二15级", value1: '"-105"', value2: '"-210"' },
                { name: "精二20级", value1: '"-114"', value2: '"-228"' },
                { name: "精二25级", value1: '"-123"', value2: '"-246"' },
                { name: "精二30级", value1: '"-132"', value2: '"-264"' },
                { name: "精二35级", value1: '"-141"', value2: '"-282"' },
                { name: "精二40级", value1: '"-150"', value2: '"-300"' },
                { name: "精二45级", value1: '"-159"', value2: '"-318"' },
                { name: "精二50级", value1: '"-168"', value2: '"-336"' },
                { name: "精二55级", value1: '"-177"', value2: '"-354"' },
                { name: "精二60级", value1: '"-186"', value2: '"-372"' },
                { name: "精二65级", value1: '"-195"', value2: '"-390"' },
                { name: "精二70级", value1: '"-204"', value2: '"-408"' },
                { name: "精二75级", value1: '"-213"', value2: '"-426"' },
                { name: "精二80级", value1: '"-223"', value2: '"-445"' },
                { name: "精二85级", value1: '"-234"', value2: '"-467"' },
              ])}
            </div>

            <div className="explain-text">
              <p>
                三星通关获得龙门币数量 = 使用理智数量 * 12
                <br />
                二星通关获得龙门币数量 = 使用理智数量 * 10
                <br />
                故事集活动商店是指类似于\"我们明日见\"的活动商店，请在使用前检查并区分当期活动是故事集类型还是sidestory类型，此外最好还要检查当期活动商店对应的兑换龙门币数量，本网页使用到的数据是活动商店最后一档的龙门币兑换
              </p>
            </div>

            {/* 新增的两个水平排列表格 */}
            <div className="tables-container">
              {generateStaticTable2([
                { name: "三星通关6理智关卡", value: "+72" },
                { name: "三星通关9理智关卡", value: "+108" },
                { name: "三星通关10理智关卡", value: "+120" },
                { name: "三星通关12理智关卡", value: "+144" },
                { name: "三星通关15理智关卡", value: "+180" },
                { name: "三星通关18理智关卡(等效刷3次1-7)", value: "+216" },
                { name: "三星通关20理智关卡", value: "+240" },
                { name: "三星通关21理智关卡", value: "+252" },
                { name: "三星通关25理智关卡", value: "+300" },
                { name: "三星通关25理智常驻剿灭关卡", value: "+250" },
                { name: "三星通关30理智关卡(等效刷5次1-7)", value: "+360" },
                { name: "三星通关36理智关卡(等效刷6次1-7)", value: "+432" },
                { name: "二星通关6理智关卡", value: "+60" },
                { name: "二星通关9理智关卡", value: "+90" },
                { name: "二星通关10理智关卡", value: "+100" },
              ])}

              {generateStaticTable2([
                { name: "二星通关12理智关卡", value: "+120" },
                { name: "二星通关15理智关卡", value: "+150" },
                { name: "二星通关18理智关卡", value: "+180" },
                { name: "二星通关20理智关卡", value: "+200" },
                { name: "二星通关21理智关卡", value: "+210" },
                { name: "二星通关25理智关卡", value: "+250" },
                { name: "二星通关30理智关卡", value: "+300" },
                { name: "二星通关36理智关卡(等效刷5次1-7)", value: "+360" },
                { name: "基建合成绿色材料", value: "-100" },
                { name: "基建合成蓝色材料", value: "-200" },
                { name: "基建合成紫色材料", value: "-300" },
                { name: "基建合成橙色材料", value: "-400" },
                { name: "故事集活动商店使用1代币", value: "+10" },
                { name: "sidestory活动商店使用1代币", value: "+20" },
                { name: "危机合约活动商店使用1代币", value: "+70" },
              ])}
            </div>

            {/* 新增：31行4列表格 */}
            <div className="tables-container">
              {generateUpgradeTable4a(upgradeData)}
              {generateUpgradeTable4b(upgradeData)}
            </div>
          </div>
        </div>

        {/* 新增：第二个面板（待填入内容） */}
        <div
          className={`accordion-panel ${
            !activePanels.includes(1) ? "collapsed" : ""
          }`}
        >
          <div
            className={`panel-header ${clickedPanel === 1 ? "active" : ""}`}
            onClick={() => togglePanel(1)}
          >
            <h3>理智消耗与对应关卡速查表</h3>
          </div>
          <div
            className={`panel-content ${clickedPanel === 1 ? "active" : ""}`}
          >
            <div className="explain-text">
              <p>理智消耗与对应关卡速查表，这里仅为推荐关卡</p>
              {generateStaticTable5([
                {
                  consume: "6理智",
                  level: "1-7",
                },
                {
                  consume: "9理智",
                  level: "活动关前三分之一关",
                },
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
          className={`accordion-panel ${
            !activePanels.includes(2) ? "collapsed" : ""
          }`}
        >
          <div
            className={`panel-header ${clickedPanel === 2 ? "active" : ""}`}
            onClick={() => togglePanel(2)}
          >
            <h3>推荐路径快速查找：目标龙门币 - 现有龙门币 &gt; 0 的情况</h3>
          </div>
          <div
            className={`panel-content ${clickedPanel === 2 ? "active" : ""}`}
          >
            <div className="explain-text">
              <p>
                以下路径用于快速查找，不一定是最适合、最简单的路径方案，仅供参考。（默认初始龙门币为0，目标龙门币为对应值）
              </p>
            </div>
            <div className="tables-container">
              {generateStaticTable3([
                {
                  num: "+1",
                  way: "步骤 1：通过【2】次使用【基建加工站合成橙色材料】，【花费】 【800】个龙门币， 当前龙门币数量为【-800】。步骤 2：通过【1】次使用【贸易站售卖4条赤金】，【获得】 【2000】个龙门币， 当前龙门币数量为【1200】。步骤 3：通过【1】次使用【对1名精二1级干员使用14次基础作战记录】，【花费】 【1199】个龙门币， 当前龙门币数量为【1】",
                },
                {
                  num: "",
                  way: "步骤 1：通过【4】次使用【基建加工站合成蓝色材料】，【花费】 【800】个龙门币， 当前龙门币数量为【-800】。步骤 2：通过【1】次使用【贸易站售卖4条赤金】，【获得】 【2000】个龙门币， 当前龙门币数量为【1200】。步骤 3：通过【1】次使用【对1名精二1级干员使用14次基础作战记录】，【花费】 【1199】个龙门币， 当前龙门币数量为【1】",
                },
                {
                  num: "+2",
                  way: "步骤 1：通过【2】次使用【三星通关30理智关卡】，【获得】 【720】个龙门币， 当前龙门币数量为【720】。步骤 2：通过【1】次使用【对1名精零1级干员使用10次基础作战记录】，【花费】 【718】个龙门币， 当前龙门币数量为【2】",
                },
                {
                  num: "",
                  way: "步骤 1：通过【2】次使用【贸易站售卖4条赤金】，【获得】 【4000】个龙门币， 当前龙门币数量为【4000】。步骤 2：通过【1】次使用【对1名精一1级干员使用13次基础作战记录】，【花费】 【1175】个龙门币， 当前龙门币数量为【2825】。步骤 3：通过【1】次使用【对1名精一1级干员使用29次基础作战记录】，【花费】 【2823】个龙门币， 当前龙门币数量为【2】",
                },
                {
                  num: "+5",
                  way: "步骤 1：通过【1】次使用【三星通关36理智关卡】，【获得】 【432】个龙门币， 当前龙门币数量为【432】。步骤 2：通过【1】次使用【对1名精一1级干员使用5次基础作战记录】，【花费】 【427】个龙门币， 当前龙门币数量为【5】",
                },
                {
                  num: "",
                  way: "步骤 1：通过【2】次使用【贸易站售卖4条赤金】，【获得】 【4000】个龙门币， 当前龙门币数量为【4000】。步骤 2：通过【1】次使用【对1名精零1级干员使用17次基础作战记录】，【花费】 【1317】个龙门币， 当前龙门币数量为【2683】。步骤 3：通过【1】次使用【对1名精零1级干员使用29次基础作战记录】，【花费】 【2678】个龙门币， 当前龙门币数量为【5】",
                },
                {
                  num: "+10",
                  way: "步骤 1：通过【2】次使用【三星通关36理智关卡】，【获得】 【864】个龙门币， 当前龙门币数量为【864】。步骤 2：通过【2】次使用【对1名精一1级干员使用5次基础作战记录】，【花费】 【854】个龙门币， 当前龙门币数量为【10】",
                },
                {
                  num: "",
                  way: "步骤 1：通过【2】次使用【贸易站售卖4条赤金】，【获得】 【4000】个龙门币， 当前龙门币数量为【4000】。步骤 2：通过【1】次使用【对1名精零1级干员使用30次基础作战记录】，【花费】 【2815】个龙门币， 当前龙门币数量为【1185】。步骤 3：通过【1】次使用【对1名精一1级干员使用13次基础作战记录】，【花费】 【1175】个龙门币， 当前龙门币数量为【10】",
                },
                {
                  num: "+50",
                  way: "步骤 1：通过【2】次使用【三星通关30理智关卡】，【获得】 【720】个龙门币， 当前龙门币数量为【720】。步骤 2：通过【1】次使用【对1名精二1级干员使用8次基础作战记录】，【花费】 【670】个龙门币， 当前龙门币数量为【50】",
                },
                {
                  num: "",
                  way: "步骤 1：通过【2】次使用【三星通关36理智关卡】，【获得】 【864】个龙门币， 当前龙门币数量为【864】。步骤 2：通过【2】次使用【对1名精零1级干员使用6次基础作战记录】，【花费】 【814】个龙门币， 当前龙门币数量为【50】",
                },
                {
                  num: "+100",
                  way: "步骤 1：通过【1】次使用【贸易站售卖3条赤金】，【获得】 【1500】个龙门币， 当前龙门币数量为【1500】。步骤 2：通过【2】次使用【对1名精一1级干员使用8次基础作战记录】，【花费】 【1400】个龙门币， 当前龙门币数量为【100】",
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
          className={`accordion-panel ${
            !activePanels.includes(3) ? "collapsed" : ""
          }`}
        >
          <div
            className={`panel-header ${clickedPanel === 3 ? "active" : ""}`}
            onClick={() => togglePanel(3)}
          >
            <h3>推荐路径快速查找：目标龙门币 - 现有龙门币 &lt; 0 的情况</h3>
          </div>
          <div
            className={`panel-content ${clickedPanel === 3 ? "active" : ""}`}
          >
            <div className="explain-text">
              <p>
                以下路径用于快速查找，不一定是最适合的、最简单的路径方案，仅供参考。（默认初始龙门币为对应值，目标龙门币为0）
              </p>
            </div>
            <div className="tables-container">
              {generateStaticTable3([
                {
                  num: "-1",
                  way: "步骤 1：通过【1】次使用【精零1级基础作战记录】，【花费】 【61】个龙门币， 当前龙门币数量为【-60】。步骤 2：通过【3】次使用【活动商店使用1代币换取20龙门币】，【获得】 【60】个龙门币， 当前龙门币数量为【0】",
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
                  way: "步骤 1：通过【6】次使用【活动商店使用1代币换取20龙门币】，【获得】 【120】个龙门币， 当前龙门币数量为【122】。步骤 2：通过【2】次使用【对1名精零1级干员使用1次基础作战记录】，【花费】 【122】个龙门币， 当前龙门币数量为【0】",
                },
                {
                  num: "-5",
                  way: "步骤 1：通过【1】次使用【三星通关10理智关卡】，【获得】 【120】个龙门币， 当前龙门币数量为【125】。步骤 2：通过【1】次使用【对1名精零1级干员使用2次基础作战记录】，【花费】 【125】个龙门币， 当前龙门币数量为【0】",
                },
                {
                  num: "",
                  way: "步骤 1：通过【6】次使用【活动商店使用1代币换取20龙门币】，【获得】 【120】个龙门币， 当前龙门币数量为【125】。步骤 2：通过【1】次使用【对1名精零1级干员使用2次基础作战记录】，【花费】 【125】个龙门币， 当前龙门币数量为【0】",
                },
                {
                  num: "-10",
                  way: "步骤 1：通过【1】次使用【三星通关21理智关卡】，【获得】 【252】个龙门币， 当前龙门币数量为【262】。步骤 2：通过【1】次使用【对1名精零1级干员使用4次基础作战记录】，【花费】 【262】个龙门币， 当前龙门币数量为【0】",
                },
                {
                  num: "",
                  way: "步骤 1：通过【1】次使用【三星通关21理智关卡】，【获得】 【252】个龙门币， 当前龙门币数量为【262】。步骤 2：通过【2】次使用【三星通关30理智关卡】，【获得】 【720】个龙门币， 当前龙门币数量为【982】。步骤 3：通过【1】次使用【对1名精一1级干员使用11次基础作战记录】，【花费】 【982】个龙门币， 当前龙门币数量为【0】",
                },
                {
                  num: "-50",
                  way: "步骤 1：通过【1】次使用【三星通关36理智关卡】，【获得】 【432】个龙门币， 当前龙门币数量为【482】。步骤 2：通过【1】次使用【对1名精零1级干员使用7次基础作战记录】，【花费】 【482】个龙门币， 当前龙门币数量为【0】",
                },
                {
                  num: "",
                  way: "步骤 1：通过【2】次使用【基建加工站合成橙色材料】，【花费】 【800】个龙门币， 当前龙门币数量为【-750】。步骤 2：通过【1】次使用【贸易站售卖2条赤金】，【获得】 【1000】个龙门币， 当前龙门币数量为【250】。步骤 3：通过【2】次使用【对1名精零1级干员使用2次基础作战记录】，【花费】 【250】个龙门币， 当前龙门币数量为【0】",
                },
                {
                  num: "-100",
                  way: "通过【1】次使用【基建加工站合成绿色材料】，【花费】 【100】个龙门币",
                },
                {
                  num: "",
                  way: "步骤 1：通过【4】次使用【基建加工站合成橙色材料】，【花费】 【1600】个龙门币， 当前龙门币数量为【-1500】。步骤 2：通过【1】次使用【贸易站售卖3条赤金】，【获得】 【1500】个龙门币， 当前龙门币数量为【0】",
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
