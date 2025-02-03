import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { findShortestPath } from './BFS';
import './App.css';
import NotePage from './pages/Note';
import DataPage from './pages/Data';

function App() {
  const [num1, setNum1] = useState('');
  const [num2, setNum2] = useState('');
  const [result, setResult] = useState('');
  const [error1, setError1] = useState('');
  const [error2, setError2] = useState('');
  const [differenceError, setDifferenceError] = useState('');
  const [history, setHistory] = useState([]);

  const num1Ref = useRef(null);
  const num2Ref = useRef(null);

const handleInputChange = (e, setNum, setError) => {
  const value = e.target.value;

  // 完全允许数字输入（包括前导零）
  if (/^\d*$/.test(value)) {  // 允许空值和纯数字
    setError('');
    setNum(value);
  } else {
    setError('请输入有效整数');
  }
};


  const handleCalculate = () => {
    // 最终提交时做严格验证
    const num1Value = parseInt(num1, 10);
    const num2Value = parseInt(num2, 10);

    if (!num1 || !num2) {
      setDifferenceError('请完整输入两个数字');
      return;
    }

    if (num1Value <= 0 || num2Value <= 0) {
      setDifferenceError('请输入大于0的整数');
      return;
    }

    const difference = num2Value - num1Value;

    if (difference < -1000 || difference > 1000) {
      setDifferenceError('请让两个数字只差处于-1000~1000之间');
      setResult('');
      return;
    } else {
      setDifferenceError('');
    }

    if (!isNaN(difference)) {
      setResult(difference.toString());
      const path = findShortestPath(difference);
      if (path) {
        setHistory([...history, `差值: ${difference}, 路径: ${path.join(' => ')}`]);
      } else if (path === null) {
        setHistory([...history, `差值: ${difference}, 步数过多，请重新选择输入值`]);
      } else {
        setHistory([...history, `差值: ${difference}, 无法找到路径`]);
      }
    } else {
      setResult('');
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const Sidebar = () => (
    <div className="sidebar">
      <div className="sidebar-title">
        凑数计算器
      </div>
      <div className="sidebar-box">
        <Link to="/">计算主页</Link>
      </div>
      <div className="sidebar-box">
        <Link to="/note">注意事项</Link>
      </div>
      <div className="sidebar-box">
        <Link to="/data">数据部分</Link>
      </div>
    </div>
  );

  const MainContent = () => (
    <div className="input-area">

      <div className="title-bar">
        <h1>龙门币凑数计算器</h1>
      </div>

      <div className="title-text">
        <p>请让输入两个值是不小于0的整数</p>
      </div>
      <div className="title-text">
        <p>且两数之差小于1000</p>
      </div>

      <div className="main-content">
        <div className="input-container">

          <div className="input-wrapper-text">
            <p>你现在的龙门币数量:</p>
          </div>

          <div className="input-wrapper">
            <input
              key="index"
              type="number"
              className="input-box"
              placeholder="输入数字 1"
              value={num1}
              onChange={(e) => handleInputChange(e, setNum1, setError1)}
              inputMode="numeric"  // 移动端显示数字键盘
              pattern="[0-9]*"    // 允许数字输入
              ref={num1Ref}  // 使用ref来确保聚焦时输入框不会被重置
            />
            {error1 && <div className="error-message">{error1}</div>}
          </div>

          <div className="input-wrapper-text">
            <p>你的目标龙门币数量:</p>
          </div>

          <div className="input-wrapper">
            <input
              key={"num2-key"}
              type="number"
              className="input-box"
              placeholder="输入数字 2"
              value={num2}
              onChange={(e) => handleInputChange(e, setNum2, setError2)}
              inputMode="numeric"  // 移动端显示数字键盘
              pattern="[0-9]*"    // 允许数字输入
              ref={num2Ref}  // 使用ref来确保聚焦时输入框不会被重置
            />
            {error2 && <div className="error-message">{error2}</div>}
          </div>
        </div>

        <button className="calculate-button" onClick={handleCalculate}>
          计算
        </button>

        <div className="output-container">

          <div className="output-wrapper-text">
            <p>你还需要的龙门币数量:</p>
          </div>

          <div className="result-container">
            <input
              type="text"
              className="result-box"
              placeholder="结果"
              value={result}
              readOnly
            />
          </div>
          {differenceError && <div className="error-message">{differenceError}</div>}
        </div>

      </div>
    </div>
  );


  const Layout = () => {
    const location = useLocation();
    const isNoteOrDataPage = location.pathname === '/note' || location.pathname === '/data';
    const isIndexPage = location.pathname === '/';

    return (
      <div className="app-container">
        
        {/* 动态添加 is-index 类名 */}
        <div className={`left-container ${isIndexPage ? 'is-index' : ''}`}>
          <Sidebar />
          <div className={`content-area ${isNoteOrDataPage ? 'full-width' : ''}`}>
            <Outlet /> {/* 嵌套路由的内容会渲染在这里 */}
          </div>
        </div>

        {/* 只在首页显示右侧区域 */}
        {isIndexPage && (
          <div className="output-area">
            <div className="history-box">
              <div className="history-header">
                <h2>计算结果</h2>
                <button className="clear-history-button" onClick={handleClearHistory}>
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
        )}
      </div>
    );
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MainContent />} />
          <Route path="note" element={<NotePage />} />
          <Route path="data" element={<DataPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;