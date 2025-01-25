import React, { useState } from 'react';
import { findShortestPath } from './BFS'; // 导入算法函数
import './App.css';

function App() {
  const [num1, setNum1] = useState('');
  const [num2, setNum2] = useState('');
  const [result, setResult] = useState('');
  const [error1, setError1] = useState('');
  const [error2, setError2] = useState('');
  const [history, setHistory] = useState([]);

  const handleInputChange = (e, setNum, setError) => {
    const value = e.target.value;

    if (!/^\d+$/.test(value) || value < 0 || value > 1000) {
      setError('请输入 0 到 1000 的非负整数');
      setNum('');
    } else {
      setError('');
      setNum(value);
    }
  };

  const handleCalculate = () => {
    const difference = parseFloat(num2) - parseFloat(num1);
    if (!isNaN(difference)) {
      setResult(difference.toString());
      const path = findShortestPath(difference); // 调用算法函数
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
    setHistory([]); // 清空历史记录
  };

  const handleNavigation = (page) => {
    window.location.href = `${page}.html`; // 跳转到指定页面
  };

  return (
    <div className="app-container">
      {/* 左侧侧栏 */}
      <div className="sidebar">
        <div className="sidebar-box" onClick={() => handleNavigation('index')}>
          计算主页
        </div>
        <div className="sidebar-box" onClick={() => handleNavigation('note')}>
          注意事项
        </div>
        <div className="sidebar-box" onClick={() => handleNavigation('data')}>
          常见数据
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div className="content">
        <div className="title-bar">
          <h1>龙门币凑数计算器</h1>
        </div>

        <div className="main-content">
          <h1>test</h1>
          <p>test2</p>
          <div className="input-container">
            <div className="input-wrapper">
              <input
                type="number"
                className="input-box"
                placeholder="输入数字 1"
                value={num1}
                onChange={(e) => handleInputChange(e, setNum1, setError1)}
              />
              {error1 && <div className="error-message">{error1}</div>}
            </div>
            <div className="input-wrapper">
              <input
                type="number"
                className="input-box"
                placeholder="输入数字 2"
                value={num2}
                onChange={(e) => handleInputChange(e, setNum2, setError2)}
              />
              {error2 && <div className="error-message">{error2}</div>}
            </div>
          </div>
          <button className="calculate-button" onClick={handleCalculate}>
            计算
          </button>
          <div className="result-container">
            <input
              type="text"
              className="result-box"
              placeholder="结果"
              value={result}
              readOnly
            />
          </div>
        </div>

        <div className="history-box">
          <div className="history-header">
            <h2>计算历史</h2>
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
    </div>
  );
}

export default App;