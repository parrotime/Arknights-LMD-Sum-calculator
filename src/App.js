import React, { useState, useEffect, useReducer } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { findPaths } from './algorithms/DP';
import NotePage from './pages/Note';
import DataPage from './pages/Data';
import AboutPage from './pages/About';
import PathRenderer from './components/PathRenderer';
import { classifyData } from './DataService'; // 导入物品数据
import './App.css';




// 状态管理 Reducer
const initialState = {
  num1: '',
  num2: '',
  result: '',
  error1: '',
  error2: '',
  history: [],
  differenceError: '',
  pathCache: [],
  currentPathIndex: 0,
  clickCount: 0,
  isCalculating: false,
  settings: {
    disable3Star: false,
    disable2Star: false,
    disableMaterial: false,
    disableStore20: false,
    disableStore10: false,
    disableStore70: false,
    disableExt25: false,
  },
};


const reducer = (state, action) => {
  switch (action.type) {
    case "SET_NUM":
      return {
        ...state,
        [action.field]: action.value,
        [`error${action.field.slice(-1)}`]: "",
      };
    case "SET_ERROR":
      return { ...state, [action.field]: action.value };
    case "SET_RESULT":
      return { ...state, result: action.value };
    case "SET_PATHS":
      return {
        ...state,
        pathCache: action.paths,
        currentPathIndex: 0,
        clickCount: 0,
      };
    case "SET_HISTORY":
      return { ...state, history: action.history };
    case "SET_CALCULATING":
      return { ...state, isCalculating: action.value };
    case "TOGGLE_SETTING":
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.key]: !state.settings[action.key],
        },
      };
    case "CHANGE_PATH":
      return {
        ...state,
        currentPathIndex:
          (state.currentPathIndex + action.delta + state.pathCache.length) %
          state.pathCache.length,
        clickCount: state.clickCount + 1,
      };
    default:
      return state;
  }
};

// 主计算组件
const MainCalculator = () => {

  const [state, dispatch] = useReducer(reducer, initialState);

  // 开关变化处理函数
  const handleToggleChange = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 优化后的输入验证
  const handleInputChange = (e, field) => {
    const value = e.target.value.replace(/[^0-9]/g, ""); // 只允许数字
    if (value === "") {
      dispatch({ type: "SET_NUM", field, value: "" });
      return;
    }

    const numValue = parseInt(value, 10);
    if (numValue > 99999999) {
      dispatch({
        type: "SET_ERROR",
        field: `error${field.slice(-1)}`,
        value: "最大值为99999999",
      });
      return;
    }

    // 去除前导零
    const sanitizedValue = numValue.toString();
    dispatch({ type: "SET_NUM", field, value: sanitizedValue });
  };

  // 增强计算逻辑
  const handleCalculate = async () => {
    if (!state.num1 || !state.num2) {
      dispatch({
        type: "SET_ERROR",
        field: "differenceError",
        value: "请填写完整数字",
      });
      return;
    }

    const num1Val = parseInt(state.num1, 10);
    const num2Val = parseInt(state.num2, 10);

    if (Math.abs(num2Val - num1Val) > 500) {
      dispatch({
        type: "SET_ERROR",
        field: "differenceError",
        value: "差值需在-500~500之间",
      });
      dispatch({ type: "SET_RESULT", value: "" });
      return;
    }

    dispatch({ type: "SET_ERROR", field: "differenceError", value: "" });
    dispatch({ type: "SET_RESULT", value: (num2Val - num1Val).toString() });
    dispatch({ type: "SET_CALCULATING", value: true });

    try {
      const filteredItems = classifyData.filter((item) => {
        return Object.keys(state.settings).every(
          (key) =>
            !state.settings[key] ||
            item.type !== key.replace("disable", "").toLowerCase()
        );
      });

      const paths = await new Promise((resolve) => {
        setTimeout(
          () => resolve(findPaths(num2Val - num1Val, filteredItems)),
          100
        );
      });

      const validPaths = Array.isArray(paths)
        ? paths.filter((p) => Array.isArray(p))
        : [];
      dispatch({ type: "SET_PATHS", paths: validPaths });

      if (validPaths.length > 0) {
        dispatch({
          type: "SET_HISTORY",
          history: [
            ...state.history.slice(-10),
            {
              path: validPaths[0],
              timestamp: new Date().toLocaleString(),
              initialLMD: num1Val,
            },
          ],
        });
      } else {
        dispatch({
          type: "SET_HISTORY",
          history: [...state.history.slice(-10), "无有效路径"],
        });
      }
    } catch (error) {
      console.error("Calculation error:", error);
      dispatch({
        type: "SET_ERROR",
        field: "differenceError",
        value: "计算出错，请重试",
      });
    } finally {
      dispatch({ type: "SET_CALCULATING", value: false });
    }
  };

  const handleChangePath = () => {
    if (pathCache.length > 0) {
      setCurrentPathIndex((prev) => (prev + 1) % pathCache.length); // 循环切换
      setClickCount((prev) => prev + 1);
    }
  };

  const handlePrevPath = () => {
    if (pathCache.length > 0) {
      setCurrentPathIndex(
        (prev) => (prev - 1 + pathCache.length) % pathCache.length
      ); // 循环向前
      setClickCount((prev) => prev + 1);
    }
  };
  /*const handleClearHistory = () => {
    setHistory([]);
  };*/
  // 新增返回顶部函数
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
        <div className="main-container">
          {/* 主内容容器 */}
          <div className="main-content-container">
            {/* 左侧计算面板 */}
            <div className="content-panel left-panel">
              <div className="title-bar">
                <h1>龙门币凑数计算器</h1>
              </div>

              <div className="title-text">
                <p>请输入两个大于0的整数</p>
                <p>且两数差值处于-500~500之间</p>
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
                        onChange={(e) =>
                          handleInputChange(e, setNum1, setError1)
                        }
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
                        onChange={(e) =>
                          handleInputChange(e, setNum2, setError2)
                        }
                        onKeyPress={(e) =>
                          !/[0-9]/.test(e.key) && e.preventDefault()
                        }
                      />
                      {error2 && <div className="error-message">{error2}</div>}
                    </div>
                  </div>
                </div>

                <button
                  className="calculate-button"
                  onClick={handleCalculate}
                  disabled={isCalculating}
                >
                  {isCalculating ? "计算中..." : "立即计算"}
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
              <div className="title-bar">
                <h1>设置区域</h1>
              </div>

              {/* 开关容器模板 - 五个相同结构的设置项 */}
              {[
                // 创建设置项配置数组优化代码结构
                { text: "不允许使用理智三星通关", key: "disable3Star" },
                { text: "不允许使用理智二星通关", key: "disable2Star" },
                { text: "不允许使用基建物品合成", key: "disableMaterial" },
                {
                  text: "不存在/不使用sidestory活动商店1代币换20龙门币",
                  key: "disableStore20",
                },
                {
                  text: "不存在/不使用故事集活动商店1代币换10龙门币",
                  key: "disableStore10",
                },
                {
                  text: "不存在/不使用危机合约1代币换70龙门币",
                  key: "disableStore70",
                },
                {
                  text: "不存在/不使用代理剿灭25理智获取250龙门币",
                  key: "disableExt25",
                },
              ].map(({ text, key }) => (
                <div className="toggle-container" key={key}>
                  <div className="toggle-text">{text}</div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={() => handleToggleChange(key)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              ))}

              <div className="usage-guide">
                <div className="notice-title">龙门币数值输入规范</div>
                <div className="notice-content">
                  1. 输入要求：两个差值小于500的非负整数（0 或正整数）
                  <br />
                  2. 输入示例：
                  <br />
                  &nbsp;&nbsp;&nbsp;✓ 有效输入：① 300 与 800 ② 500 与 500 ③ 0 与
                  1000
                  <br />
                  &nbsp;&nbsp;&nbsp;✗ 无效输入：① -50 与 1500 ② 300 与 非整数
                  <br />
                  3.
                  点击“立即计算”按钮开始计算，点击“上一路径”和“下一路径”可以切换路径方案
                </div>
              </div>
            </div>
          </div>

          {/* 历史记录框 */}
          <div className="history-box">
            <div className="history-header">
              <h2>计算路径历史</h2>
            </div>

            {isCalculating ? (
              <div className="loading-container">
                <div className="progress-bar">
                  <div className="progress-bar-fill"></div>
                </div>
                <p>正在计算路径，请稍候...</p>
              </div>
            ) : pathCache.length > 0 ? (
              <PathRenderer
                path={pathCache[currentPathIndex] || []}
                initialLMD={parseInt(num1) || 0}
                totalPaths={pathCache.length}
                currentIndex={currentPathIndex}
                onPrevPath={handlePrevPath}
                onNextPath={handleChangePath}
              />
            ) : (
              <div className="no-path">{""}</div>
            )}
            {clickCount >= 5 && pathCache.length > 0 && (
              <div className="change-over-text">
                <p>
                  {clickCount < 10
                    ? "你已经尝试了五条路径，要不要考虑更换输入值？"
                    : "真的不考虑更换输入值吗？"}
                </p>
              </div>
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
                    <PathRenderer
                      path={entry}
                      initialLMD={parseInt(num1) || 0}
                    />
                  </div>
                );
              })}
            </div>
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