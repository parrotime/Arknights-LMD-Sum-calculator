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
            <p>常用材料价值对照表：</p>
            <table>
              <thead>
                <tr>
                  <th>材料名称</th>
                  <th>等效理智</th>
                  <th>获取途径</th>
                </tr>
              </thead>
            </table>
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
            <h3>推荐路径1：高效方案</h3>
          </div>
          <div
            className={`panel-content ${clickedPanel === 1 ? "active" : ""}`}
          >
            <ul>
              <li>步骤1：刷取LS-6关卡10次</li>
              <li>步骤2：合成中级作战记录</li>
              <li>预计消耗理智：540</li>
              <li>步骤3：刷取LS-6关卡10次</li>
              <li>预计消耗理智：540</li>
              <li>步骤3：刷取LS-6关卡10次</li>
              <li>预计消耗理智：540</li>
              <li>步骤3：刷取LS-6关卡10次</li>
            </ul>
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
            <h3>推荐路径2：低耗方案</h3>
          </div>
          <div
            className={`panel-content ${clickedPanel === 2 ? "active" : ""}`}
          >
            <ul>
              <li>步骤1：每日任务获取基础材料</li>
              <li>步骤2：信用商店兑换</li>
              <li>预计消耗理智：240</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataPage;
