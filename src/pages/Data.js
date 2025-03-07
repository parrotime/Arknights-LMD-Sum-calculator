import React, { useState } from "react";
import "../../src/assets/styles/Data.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

const Sidebar = () => (
  <div className="sidebar">
    <div className="sidebar-title">凑数计算器</div>
    <div className="sidebar-box">
      <Link to="/">计算主页</Link>
    </div>
    <div className="sidebar-box">
      <Link to="/note">注意事项</Link>
    </div>
    <div className="sidebar-box">
      <Link to="/data">数据部分</Link>
    </div>
    <div className="sidebar-box">
      <Link to="/about">关于</Link>
    </div>
  </div>
);

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

function DataPage() {
  const [activePanels, setActivePanels] = useState([0, 1, 2]);
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
              {/* 表1 */}
              {generateStaticTable([
                { name: "精零1级", value1: "-61", value2: "-125" },
                { name: "精零5级", value1: "-69", value2: "-141" },
                { name: "精零10级", value1: "-79", value2: "-159" },
                { name: "精零15级", value1: "-88", value2: "-177" },
                { name: "精零20级", value1: "-122", value2: "-251" },
                { name: "精零25级", value1: "-162", value2: "-324" },
                { name: "精零30级", value1: "-202", value2: "-404" },
                { name: "精零35级", value1: "-242", value2: "-484" },
                { name: "精零40级", value1: "-282", value2: "-564" },
                { name: "精零45级", value1: "-322", value2: "-644" },
                { name: "精一1级", value1: "-81", value2: "-165" },
                { name: "精一5级", value1: "-89", value2: "-179" },
                { name: "精一10级", value1: "-100", value2: "-199" },
                { name: "精一15级", value1: "-111", value2: "-222" },
                { name: "精一20级", value1: "-122", value2: "-244" },
                { name: "精一25级", value1: "-133", value2: "-265" },
                { name: "精一30级", value1: "-144", value2: "-288" },
                { name: "精一35级", value1: "-155", value2: "-310" },
                { name: "精一40级", value1: "-166", value2: "-332" },
                { name: "精一45级", value1: "-177", value2: "-354" },
                { name: "精一50级", value1: "-188", value2: "-376" },
                { name: "精一55级", value1: "-199", value2: "-398" },
              ])}

              {/* 表2 */}
              {generateStaticTable([
                { name: "精一60级", value1: "-210", value2: "-420" },
                { name: "精一65级", value1: "-221", value2: "-442" },
                { name: "精一70级", value1: "-232", value2: "-464" },
                { name: "精一75级", value1: "-?????", value2: "-?????" },
                { name: "精二1级", value1: "-80", value2: "-162" },
                { name: "精二5级", value1: "-87", value2: "-175" },
                { name: "精二10级", value1: "-96", value2: "-192" },
                { name: "精二15级", value1: "-105", value2: "-210" },
                { name: "精二20级", value1: "-114", value2: "-228" },
                { name: "精二25级", value1: "-123", value2: "-246" },
                { name: "精二30级", value1: "-132", value2: "-264" },
                { name: "精二35级", value1: "-141", value2: "-282" },
                { name: "精二40级", value1: "-150", value2: "-300" },
                { name: "精二45级", value1: "-159", value2: "-318" },
                { name: "精二50级", value1: "-168", value2: "-336" },
                { name: "精二55级", value1: "-177", value2: "-354" },
                { name: "精二60级", value1: "-186", value2: "-372" },
                { name: "精二65级", value1: "-195", value2: "-390" },
                { name: "精二70级", value1: "-204", value2: "-408" },
                { name: "精二75级", value1: "-213", value2: "-426" },
                { name: "精二80级", value1: "-223", value2: "-445" },
                { name: "精二85级", value1: "-234", value2: "-467" },
              ])}
            </div>

            <div className="explain-text">
              <p>
                三星通关获得龙门币数量 = 使用理智数量 * 12
                <br />
                二星通关获得龙门币数量 = 使用理智数量 * 10
                <br />
                故事集活动商店是指类似于"我们明日见"的活动商店，在使用前请注意
              </p>
            </div>

            {/* 新增的两个水平排列表格 */}
            <div className="tables-container">
              {generateStaticTable2([
                { name: "三星通关6理智关卡", value: "+72" },
                { name: "三星通关9理智关卡", value: "+108" },
                { name: "三星通关10理智关卡", value: "+120" },
                { name: "三星通关15理智关卡", value: "+180" },
                { name: "三星通关18理智关卡", value: "+216" },
                { name: "三星通关21理智关卡", value: "+252" },
                { name: "三星通关25理智常驻剿灭关卡", value: "+250" },
                { name: "二星通关6理智关卡", value: "+60" },
                { name: "二星通关9理智关卡", value: "+90" },
                { name: "二星通关10理智关卡", value: "+100" },
              ])}

              {generateStaticTable2([
                { name: "二星通关15理智关卡", value: "+150" },
                { name: "二星通关18理智关卡", value: "+180" },
                { name: "二星通关21理智关卡", value: "+210" },
                { name: "基建合成绿色材料", value: "-100" },
                { name: "基建合成蓝色材料", value: "-200" },
                { name: "基建合成紫色材料", value: "-300" },
                { name: "基建合成橙色材料", value: "-400" },
                { name: "故事集活动商店使用1代币", value: "+10" },
                { name: "sidestory活动商店使用1代币", value: "+20" },
                { name: "危机合约活动商店使用1代币", value: "+70" },
              ])}
            </div>
          </div>
        </div>

        <div
          className={`accordion-panel ${
            !activePanels.includes(1) ? "collapsed" : ""
          }`}
        >
          <div
            className={`panel-header ${clickedPanel === 1 ? "active" : ""}`}
            onClick={() => togglePanel(1)}
          >
            <h3>推荐路径快速查找：目标龙门币 - 现有龙门币 &gt; 0 的情况</h3>
          </div>
          <div
            className={`panel-content ${clickedPanel === 1 ? "active" : ""}`}
          >
            <div className="explain-text">
              <p>
                以下路径用于快速查找，不一定是最适合、最简单的路径方案，仅供参考
              </p>
            </div>
            <div className="tables-container">
              {generateStaticTable3([
                {
                  num: "+1",
                  way: "使用【1】次【精零20级初级作战记录】,【花费】【251】个龙门币。使用【1】次【三星通关21理智关卡】,【获得】【252】个龙门币",
                },
                {
                  num: "",
                  way: "通过【1】次使用【精一5级初级作战记录】，【花费】 【179】个龙门币。通过【1】次使用【三星通关15理智关卡】，【获得】 【180】个龙门币",
                },
                {
                  num: "+2",
                  way: "通过【2】次使用【精零1级初级作战记录】，【花费】 【250】个龙门币。通过【1】次使用【三星通关21理智关卡】，【获得】 【252】个龙门币",
                },
                {
                  num: "",
                  way: "通过【2】次使用【精一5级基础作战记录】，【花费】 【178】个龙门币。通过【1】次使用【三星通关15理智关卡】，【获得】 【180】个龙门币",
                },
                {
                  num: "+5",
                  way: "通过【1】次使用【精二5级初级作战记录】，【花费】 【175】个龙门币。通过【1】次使用【三星通关15理智关卡】，【获得】 【180】个龙门币",
                },
                {
                  num: "",
                  way: "通过【1】次使用【精零1级初级作战记录】，【花费】 【125】个龙门币。通过【1】次使用【精零20级基础作战记录】，【花费】 【122】个龙门币。通过【1】次使用【三星通关21理智关卡】，【获得】 【252】个龙门币",
                },
                {
                  num: "+10",
                  way: "通过【1】次使用【精零35级基础作战记录】，【花费】 【242】个龙门币。通过【1】次使用【三星通关21理智关卡】，【获得】 【252】个龙门币",
                },
                {
                  num: "",
                  way: "通过【2】次使用【精二5级初级作战记录】，【花费】 【350】个龙门币。通过【2】次使用【三星通关15理智关卡】，【获得】 【360】个龙门币",
                },
                {
                  num: "+50",
                  way: "通过【1】次使用【精零30级基础作战记录】，【花费】 【202】个龙门币。通过【1】次使用【三星通关21理智关卡】，【获得】 【252】个龙门币",
                },
                {
                  num: "",
                  way: "通过【1】次使用【精一35级初级作战记录】，【花费】 【310】个龙门币。通过【2】次使用【三星通关15理智关卡】，【获得】 【360】个龙门币",
                },
                {
                  num: "+100",
                  way: "通过【2】次使用【精零30级基础作战记录】，【花费】 【404】个龙门币。通过【2】次使用【三星通关21理智关卡】，【获得】 【504】个龙门币",
                },
                {
                  num: "",
                  way: "通过【1】次使用【精零30级初级作战记录】，【花费】 【404】个龙门币。通过【2】次使用【三星通关21理智关卡】，【获得】 【504】个龙门币",
                },
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
            <h3>推荐路径快速查找：目标龙门币 - 现有龙门币 &lt; 0 的情况</h3>
          </div>
          <div
            className={`panel-content ${clickedPanel === 2 ? "active" : ""}`}
          >
            <div className="explain-text">
              <p>
                以下路径用于快速查找，不一定是最适合的、最简单的路径方案，仅供参考
              </p>
            </div>
            <div className="tables-container">
              {generateStaticTable3([
                {
                  num: "-1",
                  way: "通过【1】次使用【精零5级初级作战记录】，【花费】 【141】个龙门币。通过【1】次使用【精一10级基础作战记录】，【花费】 【100】个龙门币。通过【2】次使用【三星通关10理智关卡】，【获得】 【240】个龙门币",
                },
                {
                  num: "",
                  way: "通过【1】次使用【精零5级初级作战记录】，【花费】 【141】个龙门币。通过【2】次使用【三星通关10理智关卡】，【获得】 【240】个龙门币。通过【1】次使用【基建加工站合成绿色材料】，【花费】 【100】个龙门币",
                },
                {
                  num: "-2",
                  way: "通过【2】次使用【精零1级基础作战记录】，【花费】 【122】个龙门币。通过【1】次使用【三星通关10理智关卡】，【获得】 【120】个龙门币",
                },
                {
                  num: "",
                  way: "通过【1】次使用【精零20级基础作战记录】，【花费】 【122】个龙门币。通过【1】次使用【三星通关10理智关卡】，【获得】 【120】个龙门币",
                },
                {
                  num: "-5",
                  way: "通过【1】次使用【精零1级初级作战记录】，【花费】 【125】个龙门币。通过【1】次使用【三星通关10理智关卡】，【获得】 【120】个龙门币",
                },
                {
                  num: "",
                  way: "通过【1】次使用【精一65级基础作战记录】，【花费】 【221】个龙门币。通过【1】次使用【三星通关18理智关卡】，【获得】 【216】个龙门币",
                },
                {
                  num: "-10",
                  way: "通过【2】次使用【精零1级初级作战记录】，【花费】 【250】个龙门币。通过【2】次使用【三星通关10理智关卡】，【获得】 【240】个龙门币",
                },
                {
                  num: "",
                  way: "通过【1】次使用【精一65级初级作战记录】，【花费】 【442】个龙门币。通过【2】次使用【三星通关18理智关卡】，【获得】 【432】个龙门币",
                },
                {
                  num: "-50",
                  way: "通过【2】次使用【精零1级基础作战记录】，【花费】 【122】个龙门币。通过【1】次使用【三星通关6理智关卡】，【获得】 【72】个龙门币",
                },
                {
                  num: "",
                  way: "通过【2】次使用【精零10级基础作战记录】，【花费】 【158】个龙门币。通过【1】次使用【三星通关9理智关卡】，【获得】 【108】个龙门币",
                },
                {
                  num: "-100",
                  way: "通过【1】次使用【精一10级基础作战记录】，【花费】 【100】个龙门币",
                },
                {
                  num: "",
                  way: "通过【1】次使用【基建加工站合成绿色材料】，【花费】 【100】个龙门币",
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
