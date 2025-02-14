import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { findPaths } from './algorithms/DP';
import NotePage from './pages/Note';
import DataPage from './pages/Data';
import AboutPage from './pages/About';
import PathRenderer from './components/PathRenderer';
import { classifyData, getItemById } from './DataService'; // 导入物品数据
import './App.css';


// 主计算组件
const MainCalculator = () => {
  const [num1, setNum1] = useState('');
  const [num2, setNum2] = useState('');
  const [result, setResult] = useState('');
  const [error1, setError1] = useState('');
  const [error2, setError2] = useState('');
  const [history, setHistory] = useState([]);
  const [differenceError, setDifferenceError] = useState('');

    // 新增状态
  const [pathCache, setPathCache] = useState([]); // 所有合格路径
  const [currentPathIndex, setCurrentPathIndex] = useState(0); // 当前展示路径索引
  const [clickCount, setClickCount] = useState(0); // 按钮点击次数

// 新增返回顶部函数
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };


  // 优化后的输入验证
  const handleInputChange = (e, setNum, setError) => {
    const value = e.target.value;
    
    // 允许空值和纯数字输入
    if (/^\d*$/.test(value)) {
      setNum(value);
      setError('');
      
      // 只在有值时验证范围
      if (value !== '') {
        const numValue = parseInt(value, 10);
        if (numValue < 0) {
          setError('请输入大于0的整数');
        }
      }
    }
  };

  // 增强计算逻辑
  const handleCalculate = () => {
    if (!num1 || !num2) {
      setDifferenceError("请填写完整数字");
      return;
    }

    const num1Val = parseInt(num1, 10);
    const num2Val = parseInt(num2, 10);

    if (isNaN(num1Val) || isNaN(num2Val)) {
      setDifferenceError("请输入有效数字");
      return;
    }

    const difference = num2Val - num1Val;
    if (Math.abs(difference) > 1000) {
      setDifferenceError("差值需在-1000~1000之间");
      setResult("");
      return;
    }

    setDifferenceError("");
    setResult(difference.toString());

    // 路径计算
    const paths = findPaths(difference, classifyData);

    // 确保总是二维数组
    const validPaths = Array.isArray(paths)
      ? paths.filter((p) => Array.isArray(p))
      : [];

    setPathCache(validPaths);
    setCurrentPathIndex(0);

    if (validPaths.length > 0) {
      setHistory((prev) => [
        ...prev.slice(-9),
        {
          path: validPaths[0], // 保存完整路径数据
          timestamp: new Date().toLocaleString(), // 添加时间戳
          initialLMD: parseInt(num1) || 0, // 保存计算时的初始值
        },
      ]);
    } else {
      setHistory((prev) => [...prev.slice(-9), "无有效路径"]);
    }
  };

  // 路径切换逻辑
  const handleChangePath = () => {
    if (currentPathIndex < pathCache.length - 1) {
      setCurrentPathIndex(prev => prev + 1);
    } else {
      // 如果已经展示到最后一条路径，回到第一条
      setCurrentPathIndex(0);
    }
    setClickCount(prev => prev + 1);
  };


  const handleClearHistory = () => {
    setHistory([]);
  };

  // 公共侧边栏组件
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

// 修改App.js中的MainCalculator组件return部分
return (
  <div className="app-container">
    <Sidebar />

    {/* 返回顶部按钮 */}
    <button className="back-to-top" onClick={scrollToTop}>
      ↑ 返回顶部
    </button>

    <div className="input-area">
      {/* 主内容容器 */}
      <div className="main-content-container">
        {/* 左侧计算面板 */}
        <div className="content-panel left-panel">
          <div className="title-bar">
            <h1>龙门币凑数计算器</h1>
          </div>

          <div className="title-text">
            <p>请输入两个大于0的整数</p>
            <p>且两数差值处于-1000~1000之间</p>
          </div>

          <div className="main-content">
            <div className="input-container">
              {/* 当前数量输入 */}
              <div className="input-group">
                <div className="input-wrapper-text">
                  <p>当前龙门币数量:</p>
                </div>
                <div className="input-wrapper">
                  <input
                    type="text"
                    className="input-box"
                    placeholder="请输入数字"
                    value={num1}
                    onChange={(e) => handleInputChange(e, setNum1, setError1)}
                    onKeyPress={(e) =>
                      !/[0-9]/.test(e.key) && e.preventDefault()
                    }
                  />
                  {error1 && <div className="error-message">{error1}</div>}
                </div>
              </div>

              {/* 目标数量输入 */}
              <div className="input-group">
                <div className="input-wrapper-text">
                  <p>目标龙门币数量:</p>
                </div>
                <div className="input-wrapper">
                  <input
                    type="text"
                    className="input-box"
                    placeholder="请输入数字"
                    value={num2}
                    onChange={(e) => handleInputChange(e, setNum2, setError2)}
                    onKeyPress={(e) =>
                      !/[0-9]/.test(e.key) && e.preventDefault()
                    }
                  />
                  {error2 && <div className="error-message">{error2}</div>}
                </div>
              </div>
            </div>

            <button className="calculate-button" onClick={handleCalculate}>
              立即计算
            </button>

            <div className="result-section">
              {/* ...原有结果框代码... */}
              <div className="output-wrapper-text">
                <p>计算还需要龙门币数量:</p>
              </div>
              <div className="result-container">
                <input
                  type="text"
                  className="result-box"
                  value={result || "两者相差"}
                  readOnly
                />
              </div>
              {differenceError && (
                <div className="error-message">{differenceError}</div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧说明面板 */}
        <div className="content-panel right-panel">
          <div className="toggle-title">设置区域</div>

          {/* 开关容器模板 - 五个相同结构的设置项 */}
          {[
            // 创建设置项配置数组优化代码结构
            "是否允许使用理智三星通关",
            "是否允许使用理智二星通关",
            "是否允许基建物品合成",
            "是否存在/使用活动商店...",
            "是否存在/使用危机合约...",
          ].map((text, index) => (
            <div className="toggle-container" key={index}>
              <div className="toggle-text">{text}</div>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span className="slider"></span>
              </label>
            </div>
          ))}

          <div className="usage-guide">
            <h3>使用说明</h3>
            <ul>
              <li>输入当前持有龙门币数量</li>
              <li>输入目标需要达到的数量</li>
              <li>点击计算获取最优路径</li>
              <li>历史记录自动保存最近10条</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 历史记录框 */}
      <div className="history-box">
        <div className="history-header">
          <h2>计算路径历史</h2>
          <button
            className="clear-history-button"
            onClick={handleClearHistory}
            disabled={history.length === 0}
          >
            清空历史
          </button>

          <button onClick={handleChangePath}>更换路径</button>
          {clickCount >= 5 && (
            <p>你已经尝试了五条路径，要不要考虑更换输入值？</p>
          )}
        </div>
        
        {pathCache.length > 0 ? (
          <PathRenderer
            path={pathCache[currentPathIndex] || []}
            initialLMD={parseInt(num1) || 0}
          />
        ) : (
          <div className="no-path">没有找到可行路径</div>
        )}
        {/* 修改历史记录渲染方式 */}
        <div className="history-list">
          {history.map((entry, index) => {
            // 如果是字符串（无有效路径的情况）
            if (typeof entry === "string") {
              return (
                <div key={index} className="history-item">
                  {entry}
                </div>
              );
            }

            // 如果是路径数组，使用 PathRenderer 渲染
            return (
              <div key={index} className="history-item">
                <PathRenderer path={entry} initialLMD={parseInt(num1) || 0} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);
};

// 主应用组件
const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<MainCalculator />} />
      <Route path="/note" element={<NotePage />} />
      <Route path="/data" element={<DataPage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  </Router>
);

export default App;