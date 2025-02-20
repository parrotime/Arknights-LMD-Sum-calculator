import React, {useState} from 'react';
import '../../src/assets/styles/Data.css';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

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
      behavior: "smooth"
    });
  };

  
function DataPage() {
  // 折叠面板状态控制
  const [activePanels, setActivePanels] = useState([0, 1, 2]); // 默认全部展开

  const togglePanel = (index) => {
    setActivePanels((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };



  return (
    <div className="app-container">
      <Sidebar />

      {/* 返回顶部按钮 */}
      <button className="back-to-top" onClick={scrollToTop}>
        ↑ 返回顶部
      </button>

      <div className="main-data-content">
        {/* 参考数据面板 */}
        <div
          className={`accordion-panel ${
            !activePanels.includes(0) ? "collapsed" : ""
          }`}
        >
          <div className="panel-header" onClick={() => togglePanel(0)}>
            <h3>参考数据</h3>
          </div>
          <div className="panel-content">
            <p>常用材料价值对照表：</p>
            <table>
              <thead>
                <tr>
                  <th>材料名称</th>
                  <th>等效理智</th>
                  <th>获取途径</th>
                </tr>
              </thead>
              {/* 表格内容 */}
            </table>
          </div>
        </div>

        {/* 推荐路径1 */}
        <div
          className={`accordion-panel ${
            !activePanels.includes(1) ? "collapsed" : ""
          }`}
        >
          <div className="panel-header" onClick={() => togglePanel(1)}>
            <h3>推荐路径1：高效方案</h3>
          </div>
          <div className="panel-content">
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

        {/* 推荐路径2 */}
        <div
          className={`accordion-panel ${
            !activePanels.includes(2) ? "collapsed" : ""
          }`}
        >
          <div className="panel-header" onClick={() => togglePanel(2)}>
            <h3>推荐路径2：低耗方案</h3>
          </div>
          <div className="panel-content">
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