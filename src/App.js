import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { findShortestPath } from './BFS';
import NotePage from './pages/Note';
import DataPage from './pages/Data';
import AboutPage from './pages/About';
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
      setDifferenceError('请填写完整数字');
      return;
    }

    const num1Val = parseInt(num1, 10);
    const num2Val = parseInt(num2, 10);
    
    if (isNaN(num1Val) || isNaN(num2Val)) {
      setDifferenceError('请输入有效数字');
      return;
    }

    const difference = num2Val - num1Val;
    if (Math.abs(difference) > 1000) {
      setDifferenceError('差值需在-1000~1000之间');
      setResult('');
      return;
    }

    setDifferenceError('');
    setResult(difference.toString());
    
    // 路径计算
    const path = findShortestPath(difference);
    const newEntry = path 
      ? `差值: ${difference}, 路径: ${path.join(' → ')}`
      : `差值: ${difference}, 无法找到路径`;
    
    setHistory(prev => [...prev.slice(-9), newEntry]); // 保持最近10条记录
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
      <button 
        className="back-to-top"
        onClick={scrollToTop}
      >
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
                  onKeyPress={(e) => !/[0-9]/.test(e.key) && e.preventDefault()}
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
                  onKeyPress={(e) => !/[0-9]/.test(e.key) && e.preventDefault()}
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
                value={result || '两者相差'}
                readOnly
              />
            </div>
            {differenceError && <div className="error-message">{differenceError}</div>}
          
            </div>
          </div>
        </div>

        {/* 右侧说明面板 */}
        <div className="content-panel right-panel">

        <div className='toggle-title'>设置区域</div>

        <div className="toggle-container">
          <div className="toggle-text">是否允许使用理智三星通关</div>
          {/*!-- 开关按钮 */}
          <label class="toggle-switch">
              <input type="checkbox"/>
              <span class="slider"></span>
          </label>
        </div>

        <div className="toggle-container">
          <div className="toggle-text">是否允许使用理智二星通关</div>
          {/*!-- 开关按钮 */}
          <label class="toggle-switch">
              <input type="checkbox"/>
              <span class="slider"></span>
          </label>
        </div>

        <div className="toggle-container">
          <div className="toggle-text">是否允许基建物品合成</div>
          {/*!-- 开关按钮 */}
          <label class="toggle-switch">
              <input type="checkbox"/>
              <span class="slider"></span>
          </label>
        </div>

        <div className="toggle-container">
          <div className="toggle-text">是否存在/使用活动商店1代币换20龙门币</div>
          {/*!-- 开关按钮 */}
          <label class="toggle-switch">
              <input type="checkbox"/>
              <span class="slider"></span>
          </label>
        </div>

        <div className="toggle-container">
          <div className="toggle-text">是否存在/使用危机合约商店1代币换70龙门币</div>
          {/*!-- 开关按钮 */}
          <label class="toggle-switch">
              <input type="checkbox"/>
              <span class="slider"></span>
          </label>
        </div>

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
        </div>
        <ul>
          {history.map((entry, index) => (
            <li key={index}>{entry}</li>
          ))}
        </ul>
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