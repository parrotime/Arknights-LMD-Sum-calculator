import React, { useReducer, useState } from "react";
//import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import { findPaths } from "./algorithms/DP";
import NotePage from "./pages/Note";
import DataPage from "./pages/Data";
import AboutPage from "./pages/About";
import PathRenderer from "./components/PathRenderer";
import { classifyData } from "./DataService"; 
import "./App.css";

// 状态管理 Reducer
const initialState = {
  num1: "", //当前数量
  num2: "", //目标数量
  result: "", //两者相差
  error1: "", // num1错误信息
  error2: "", // num2错误信息
  history: [], //计算历史记录
  differenceError: "", //差值错误信息
  pathCache: [], //计算出来的路径缓存
  currentPathIndex: 0, //路径索引
  clickCount: 0, // 路径切换次数
  isCalculating: false,
  settings: {
    disable3Star: false,
    disable2Star: false,
    disableMaterial: false,
    disableStore20: false,
    disableStore10: false,
    disableStore70: false,
    disableExt25: false,
    disableTrade: false, // 新增开关1：不允许使用贸易站售卖赤金
    enableUpgradeOnly0: false, // 新增开关2：允许精零1级连续升级
    enableUpgradeOnly1: false, // 新增开关3：允许精一1级连续升级
    enableUpgradeOnly2: false, // 新增开关4：允许精二1级连续升级
    enableUpgradeOnlyFor1: false, // 新增开关5：只允许对1级干员连续升级
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
      return { 
        ...state, 
        [action.field]: action.value 
      };
    case "SET_RESULT":
      return { 
        ...state, 
        result: action.value 
      };
    case "SET_PATHS":
      return {
        ...state,
        pathCache: action.paths,
        currentPathIndex: 0,
        clickCount: 0,
      };
    case "SET_HISTORY":
      return { 
        ...state, 
        history: action.history 
      };
    case "SET_CALCULATING":
      return { 
        ...state, 
        isCalculating: action.value 
      };
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
  const [showModal, setShowModal] = useState(false); // 新增：弹窗状态
  // 开关变化处理函数
  const handleToggleChange = (key) => {
    dispatch({ type: "TOGGLE_SETTING", key });
    // 新增：当切换 enableUpgradeOnlyFor1 时触发弹窗
    if (
      key === "enableUpgradeOnlyFor1" &&
      !state.settings.enableUpgradeOnlyFor1
    ) {
      setShowModal(true);
    }
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
        value: "你真的有这么多龙门币吗？",
      });
      return;
    }

    // 去除前导零
    dispatch({ type: "SET_NUM", field, value: numValue.toString() });
  };

  // 计算逻辑 异步函数
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
    const difference = num2Val - num1Val;

    if (Math.abs(difference) > 1000) {
      dispatch({
        type: "SET_ERROR",
        field: "differenceError",
        value: "差值需在-1000~1000之间",
      });
      dispatch({ type: "SET_RESULT", value: "" });
      return;
    }

    dispatch({ type: "SET_ERROR", field: "differenceError", value: "" });
    dispatch({ type: "SET_RESULT", value: difference.toString() });
    dispatch({ type: "SET_CALCULATING", value: true });

    try {
      // 优化：确保所有开关过滤条件同时生效
      const filteredItems = classifyData.filter((item) => {
        const settings = state.settings;
        const itemType = item.type?.toLowerCase() || "";

        const isUpgradeAllowed = settings.enableUpgradeOnlyFor1
          ? itemType !== "upgrade" // 开启时排除 upgrade
          : true; // 关闭时不过滤 upgrade

        return (
          (!settings.disable3Star || itemType !== "3_star") &&
          (!settings.disable2Star || itemType !== "2_star") &&
          (!settings.disableMaterial || itemType !== "material") &&
          (!settings.disableStore20 || itemType !== "store_20") &&
          (!settings.disableStore10 || itemType !== "store_10") &&
          (!settings.disableStore70 || itemType !== "store_70") &&
          (!settings.disableExt25 || itemType !== "ext_25") &&
          (!settings.disableTrade || itemType !== "trade") && // 新增开关1逻辑
          (settings.enableUpgradeOnly0 || itemType !== "upgrade_only_0") && // 新增开关2逻辑
          (settings.enableUpgradeOnly1 || itemType !== "upgrade_only_1") && // 新增开关3逻辑
          (settings.enableUpgradeOnly2 || itemType !== "upgrade_only_2") && // 新增开关4逻辑
          isUpgradeAllowed // 新增开关5逻辑
        );
      });

      const paths = await new Promise((resolve) => {
        setTimeout(() => resolve(findPaths(difference, filteredItems)), 100);
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

  // 切换路径
  /*const handleChangePath = () => {
    if (state.pathCache.length > 0) {
      dispatch({ type: "CHANGE_PATH", delta: 1 });
    }
  };

  const handlePrevPath = () => {
    if (state.pathCache.length > 0) {
      dispatch({ type: "CHANGE_PATH", delta: -1 });
    }
  };*/

  const handleChangePath = (delta) => {
    if (state.pathCache.length > 0) {
      dispatch({ type: "CHANGE_PATH", delta });
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
                <p>请输入两个0到99999999之间的整数</p>
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
                        value={state.num1}
                        onChange={(e) => handleInputChange(e, "num1")}
                        onKeyPress={(e) =>
                          !/[0-9]/.test(e.key) && e.preventDefault()
                        }
                      />
                      {state.error1 && (
                        <div className="error-message">{state.error1}</div>
                      )}
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
                        value={state.num2}
                        onChange={(e) => handleInputChange(e, "num2")}
                        onKeyPress={(e) =>
                          !/[0-9]/.test(e.key) && e.preventDefault()
                        }
                      />
                      {state.error2 && (
                        <div className="error-message">{state.error2}</div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  className="calculate-button"
                  onClick={handleCalculate}
                  disabled={state.isCalculating}
                >
                  {state.isCalculating ? "计算中..." : "立即计算"}
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
                      //value={state.result || "两者相差"}
                      placeholder="两者相差"
                      value={state.result}
                      readOnly
                    />
                  </div>
                  {state.differenceError && (
                    <div className="error-message">{state.differenceError}</div>
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
                { text: "不允许使用贸易站售卖赤金", key: "disableTrade" }, // 新增开关1
                {
                  text: "允许连续多次对精零1级干员进行升级",
                  key: "enableUpgradeOnly0",
                }, // 新增开关2
                {
                  text: "允许连续多次对精一1级干员进行升级",
                  key: "enableUpgradeOnly1",
                }, // 新增开关3
                {
                  text: "允许连续多次对精二1级干员进行升级",
                  key: "enableUpgradeOnly2",
                },
                {
                  text: "只允许连续多次对精零/精一/精二1级干员进行升级",
                  key: "enableUpgradeOnlyFor1",
                },
              ].map(({ text, key }) => (
                <div className="toggle-container" key={key}>
                  <div className="toggle-text">{text}</div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={state.settings[key]}
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
                  <br />
                  4.
                  对于某些数字可能存在计算较慢的现象，计算时页面卡住是正常现象，请耐心等待，后续会继续优化
                </div>
              </div>
            </div>
          </div>

          {/* 历史记录框 */}
          <div className="history-box">
            <div className="history-header">
              <h2>计算路径历史</h2>
            </div>

            {state.isCalculating ? (
              <div className="loading-container">
                <div className="progress-bar">
                  <div className="progress-bar-fill"></div>
                </div>
                <p>正在计算路径，请稍候...</p>
              </div>
            ) : state.pathCache.length > 0 ? (
              <PathRenderer
                path={state.pathCache[state.currentPathIndex] || []}
                initialLMD={parseInt(state.num1) || 0}
                totalPaths={state.pathCache.length}
                currentIndex={state.currentPathIndex}
                onPrevPath={() => handleChangePath(-1)}
                onNextPath={() => handleChangePath(1)}
              />
            ) : (
              <div className="no-path">{""}</div>
            )}

            {state.clickCount >= 5 && state.pathCache.length > 0 && (
              <div className="change-over-text">
                <p>
                  {state.clickCount < 10
                    ? "你已经尝试了五条路径，要不要考虑更换输入值？"
                    : "真的不考虑更换输入值吗？"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 新增：弹窗组件 */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>提醒</h3>
            <p>
              您已开启“只允许连续多次对精零/精一/精二1级干员进行升级”开关，请检查以下开关状态：
            </p>
            <ul>
              <li>
                允许连续多次对精零1级干员进行升级：
                {state.settings.enableUpgradeOnly0 ? "已开启" : "未开启"}
              </li>
              <li>
                允许连续多次对精一1级干员进行升级：
                {state.settings.enableUpgradeOnly1 ? "已开启" : "未开启"}
              </li>
              <li>
                允许连续多次对精二1级干员进行升级：
                {state.settings.enableUpgradeOnly2 ? "已开启" : "未开启"}
              </li>
            </ul>
            <button onClick={() => setShowModal(false)}>关闭</button>
          </div>
        </div>
      )}
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
