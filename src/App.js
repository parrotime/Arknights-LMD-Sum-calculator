import React, { useReducer, useState, useCallback, useEffect } from "react";
//import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
<<<<<<< Updated upstream
import { findPaths } from "./algorithms/DP";
=======
import { Transmission } from "./Transmission";
>>>>>>> Stashed changes
import NotePage from "./pages/Note";
import DataPage from "./pages/Data";
import AboutPage from "./pages/About";
import PathRenderer from "./components/PathRenderer";
import { classifyData } from "./DataService"; 
import bonusImage from "./assets/images/bonus.webp";
import "./App.css";

// 状态管理 Reducer
const defaultState = {
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
    disableStore2000: false,
    disableStore5000: false,
    disableExt25: false,
    disableTrade: false,
    enableUpgradeOnly0: false,
    enableUpgradeOnly1: false,
    enableUpgradeOnly2: false,
    enableUpgradeOnlyFor1: false,
  },
};

// 默认设置按钮的初始状态
const getInitialState = () => {
  const savedState = localStorage.getItem("calculatorState");
  const initialState = savedState ? JSON.parse(savedState) : defaultState;
  initialState.settings.disable2Star = true;
  initialState.settings.disableStore10 = true;
  initialState.settings.disableStore70 = true;
  initialState.settings.disableExt25 = true;
  initialState.settings.enableUpgradeOnly0 = true;
  initialState.settings.enableUpgradeOnly1 = true;
  initialState.settings.enableUpgradeOnly2 = true;
  return initialState;
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
        [action.field]: action.value,
      };
    case "SET_RESULT":
      return {
        ...state,
        result: action.value,
      };
    case "SET_PATHS":
      console.log("Reducer SET_PATHS:", action.paths);
      return {
        ...state,
        pathCache: action.paths,
        currentPathIndex: 0,
        clickCount: 0,
      };
    case "SET_HISTORY":
      return {
        ...state,
        history: action.history,
      };
    case "SET_CALCULATING":
      return {
        ...state,
        isCalculating: action.value,
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
  const [state, dispatch] = useReducer(reducer, getInitialState());
  const [showModal, setShowModal] = useState(false); // 弹窗状态
  const [showBonusModal, setShowBonusModal] = useState(false); // 彩蛋弹窗状态

  // 状态变化时保存到本地存储
  useEffect(() => {localStorage.setItem("calculatorState", JSON.stringify(state));}, [state]);

  // 开关变化处理
  const handleToggleChange = useCallback((key) => {
    dispatch({ type: "TOGGLE_SETTING", key });
    if (key === "enableUpgradeOnlyFor1" && !state.settings.enableUpgradeOnlyFor1) {
      setShowModal(true);
    }
  },[state.settings]);

  // 优化后的输入验证
  const handleInputChange = useCallback((e, field) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
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
    dispatch({ type: "SET_NUM", field, value: numValue.toString() });
  }, []);

<<<<<<< Updated upstream
  // 计算逻辑 异步函数
=======
  // 处理左边限制类数量输入
  const handleUpgradeCountChange = useCallback((e, field, min, max) => {
    const value = e.target.value;
    if (value === "") {
      dispatch({ type: "SET_UPGRADE_COUNT", field, value: "" });
      return;
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < min || numValue > max) {
      return; 
    }
    dispatch({ type: "SET_UPGRADE_COUNT", field, value: numValue.toString() });
  }, []);


  // 主体计算逻辑 异步函数
>>>>>>> Stashed changes
  const handleCalculate = useCallback(async () => {
    if (!state.num1 || !state.num2) {
      dispatch({
        type: "SET_ERROR",
        field: "differenceError",
        value: "请填写当前和目标龙门币数量",
      });
      return;
    }

    const num1Val = parseInt(state.num1, 10);
    const num2Val = parseInt(state.num2, 10);
    const difference = num2Val - num1Val;

    if (Math.abs(difference) > 5000) {
      dispatch({
        type: "SET_ERROR",
        field: "differenceError",
        value: "差值需在[-5000,5000]内",
      });
      dispatch({ type: "SET_RESULT", value: "" });
      return;
    }

    //清除旧错误，显示差值，设置加载状态
    dispatch({ type: "SET_ERROR", field: "differenceError", value: "" });
    dispatch({ type: "SET_RESULT", value: difference.toString() });
    dispatch({ type: "SET_CALCULATING", value: true });

    const filteredItems = classifyData.filter((item) => {
      const { settings } = state;
      const itemType = item.type?.toLowerCase() || "";
      const isUpgradeAllowed = settings.enableUpgradeOnlyFor1
        ? itemType !== "upgrade"
        : true;
      return (
        (!settings.disable3Star || itemType !== "3_star") &&
        (!settings.disable2Star || itemType !== "2_star") &&
        (!settings.disableMaterial || itemType !== "material") &&
        (!settings.disableStore20 || itemType !== "store_20") &&
        (!settings.disableStore10 || itemType !== "store_10") &&
        (!settings.disableStore70 || itemType !== "store_70") &&
        (!settings.disableStore2000 || itemType !== "store_2000") &&
        (!settings.disableStore5000 || itemType !== "store_5000") &&
        (!settings.disableExt25 || itemType !== "ext_25") &&
        (!settings.disableTrade || itemType !== "trade") &&
        (settings.enableUpgradeOnly0 || itemType !== "upgrade_only_0") &&
        (settings.enableUpgradeOnly1 || itemType !== "upgrade_only_1") &&
        (settings.enableUpgradeOnly2 || itemType !== "upgrade_only_2") &&
        isUpgradeAllowed
      );
    });

<<<<<<< Updated upstream
=======
    // 提取四个限制值，空值时默认为无限大
    const upgrade0Limit = state.upgrade0Count === "" ? Infinity : parseInt(state.upgrade0Count, 10);
    const upgrade1Limit = state.upgrade1Count === "" ? Infinity : parseInt(state.upgrade1Count, 10);
    const upgrade2Limit = state.upgrade2Count === "" ? Infinity : parseInt(state.upgrade2Count, 10);
    const sanityLimit = state.sanityCount === "" ? Infinity : parseInt(state.sanityCount, 10);

>>>>>>> Stashed changes
    console.log("filteredItems:", filteredItems);

    //处理缓存（保存最近5条）
    const cacheKey = `${difference}_${Object.entries(state.settings)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
<<<<<<< Updated upstream
      .join("|")}`;
=======
      .join("|")}_${upgrade0Limit}_${upgrade1Limit}_${upgrade2Limit}_${sanityLimit}`;
>>>>>>> Stashed changes
    console.log("生成的 cacheKey:", cacheKey);
    const cachedResult = localStorage.getItem(`pathCache_${cacheKey}`);
    let paths;

    if (cachedResult) {
      paths = JSON.parse(cachedResult);
      console.log("从缓存读取路径:", JSON.stringify(paths, null, 2));
      if (!paths || paths.length === 0) {
        console.log("缓存为空，重新计算");
        localStorage.removeItem(`pathCache_${cacheKey}`);
      } else {
        console.log("缓存命中且有效！");
        dispatch({ type: "SET_PATHS", paths });
        dispatch({ type: "SET_CALCULATING", value: false });
        dispatch({
          type: "SET_HISTORY",
          history: [
            ...state.history.slice(-5),
            {
              path: paths[0],
              timestamp: new Date().toLocaleString(),
              initialLMD: num1Val,
            },
          ],
        });
        return;
      }
    }

    console.log("缓存未命中或无效，开始调用 findPaths");

    //限制15秒
    const timeoutPromise = new Promise((_, reject) =>
<<<<<<< Updated upstream
      setTimeout(() => reject(new Error("计算超时")), 20000)
    ); // 缩短超时
    const startTime = Date.now();
    try {
      paths = await Promise.race([
        findPaths(difference, filteredItems),
=======
      setTimeout(() => reject(new Error("计算超时")), 15000)
    ); 
    const startTime = Date.now();
    console.log("limit in APPjs is:", upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit);
    try {
      paths = await Promise.race([
        Transmission(difference, filteredItems, {upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit,}),
>>>>>>> Stashed changes
        timeoutPromise,
      ]);
      console.log("findPaths 返回的 paths:", JSON.stringify(paths, null, 2));
      if (!paths || paths.length === 0) {
        console.error("后端返回空路径");
        dispatch({
          type: "SET_ERROR",
          field: "differenceError",
          value: "未计算出有效路径，请调整数据重试",
        });
        paths = [];
      } else {
        localStorage.setItem(`pathCache_${cacheKey}`, JSON.stringify(paths));
        console.log("缓存已保存，耗时:", Date.now() - startTime, "ms");
        managePathCache(cacheKey);
      }
      dispatch({ type: "SET_PATHS", paths });
      dispatch({
        type: "SET_HISTORY",
        history: [
          ...state.history.slice(-10),
          paths.length > 0
            ? {
                path: paths[0],
                timestamp: new Date().toLocaleString(),
                initialLMD: num1Val,
              }
            : "未计算出有效路径，请调整数据重试",
        ],
      });
    } catch (error) {
      console.error("计算失败:", error);
      dispatch({
        type: "SET_ERROR",
        field: "differenceError",
        value: "计算超时，请尝试缩小差值或调整设置",
      });
      paths = [];
      dispatch({ type: "SET_PATHS", paths });
    } finally {
      dispatch({ type: "SET_CALCULATING", value: false });
    }
<<<<<<< Updated upstream
  }, [state.num1, state.num2, state.history]);
=======
  }, [state.num1, state.num2, state.history, state.upgrade0Count, state.upgrade1Count, state.upgrade2Count, state.sanityCount,]);
>>>>>>> Stashed changes

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

  // 管理路径缓存（最多5条）
  const managePathCache = (newKey) => {
<<<<<<< Updated upstream
    const cacheQueue = JSON.parse(localStorage.getItem("pathCacheQueue") || "[]");
=======
    const cacheQueue = JSON.parse(localStorage.getItem("pathCacheQueue") || "[]" );
>>>>>>> Stashed changes
    if (!cacheQueue.includes(newKey)) {
      cacheQueue.push(newKey);
      if (cacheQueue.length > 5) {
        const removedKey = cacheQueue.shift();
        localStorage.removeItem(`pathCache_${removedKey}`);
        console.log(`缓存队列超限，移除最旧缓存: ${removedKey}`); 
      }
      localStorage.setItem("pathCacheQueue", JSON.stringify(cacheQueue));
    } else {
      console.log(`缓存键 ${newKey} 已在队列中，无需操作队列`); 
    }
  };

<<<<<<< Updated upstream

  const handleChangePath = useCallback(
    (delta) => {
      if (state.pathCache.length > 0) {
        const newClickCount = state.clickCount + 1;
        dispatch({ type: "CHANGE_PATH", delta });
        if (newClickCount === 30) {
          setShowBonusModal(true); // 触发彩蛋弹窗
        }
=======
  //路径切换
  const handleChangePath = useCallback((delta) => {
    if (state.pathCache.length > 0) {
      const newClickCount = state.clickCount + 1;
      dispatch({ type: "CHANGE_PATH", delta });
      if (newClickCount === 30) {
        setShowBonusModal(true); // 触发彩蛋弹窗
>>>>>>> Stashed changes
      }
    }
  },[state.pathCache.length, state.clickCount]);
  
  /*const handleClearHistory = () => {
    setHistory([]);
  };*/

  // 返回顶部函数
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // 公共侧边栏组件
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

  const settingsOptions = [
    { text: "不允许使用理智三星通关", key: "disable3Star" },
    { text: "不允许使用理智二星通关", key: "disable2Star" },
    { text: "不允许使用基建物品合成", key: "disableMaterial" },
    { text: "不存在/不使用sidestory活动商店1代币换20龙门币", key: "disableStore20"},
    { text: "不存在/不使用sidestory活动商店5代币换2000龙门币", key: "disableStore2000"},
    { text: "不存在/不使用sidestory活动商店7代币换5000龙门币", key: "disableStore5000"},
    { text: "不存在/不使用故事集活动商店1代币换10龙门币", key: "disableStore10"},
    { text: "不存在/不使用危机合约1代币换70龙门币", key: "disableStore70" },
    { text: "不存在/不使用代理剿灭25理智获取250龙门币", key: "disableExt25" },
    { text: "不允许使用贸易站售卖赤金", key: "disableTrade" },
    { text: "允许连续多次对精零1级干员进行升级", key: "enableUpgradeOnly0" },
    { text: "允许连续多次对精一1级干员进行升级", key: "enableUpgradeOnly1" },
    { text: "允许连续多次对精二1级干员进行升级", key: "enableUpgradeOnly2" },
    { text: "只允许连续多次对精零/精一/精二1级干员进行升级", key: "enableUpgradeOnlyFor1"},
  ];

  // 修改了App.js中的MainCalculator组件return部分
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

              <div className="left-panel-title-container">
                <div className="title-text">
                  请输入两个[0,99999999]区间的整数
                </div>
                <div className="title-text">且两数差值处于[-5000,5000]区间</div>
              </div>

              <div className="main-content">
                <div className="input-container">

                  {/* 当前数量输入 */}
<<<<<<< Updated upstream
                  <div className="input-group">
                    <div className="input-wrapper-text">当前龙门币数量:</div>
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
=======
                  <div className="input-group-horizontal">
                    <div className="input-group">
                      <div className="input-wrapper-text">当前龙门币数量:</div>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          className="input-box"
                          placeholder="请输入数字"
                          value={state.num1}
                          onChange={(e) => handleInputChange(e, "num1")}
                        />
                        {state.error1 && (<div className="error-message">{state.error1}</div>)}
                      </div>
                    </div>

                    {/* 目标数量输入 */}
                    <div className="input-group">
                      <div className="input-wrapper-text">目标龙门币数量:</div>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          className="input-box"
                          placeholder="请输入数字"
                          value={state.num2}
                          onChange={(e) => handleInputChange(e, "num2")}
                        />
                        {state.error2 && (<div className="error-message">{state.error2}</div>)}
                      </div>
>>>>>>> Stashed changes
                    </div>
                  </div>

<<<<<<< Updated upstream
                  {/* 目标数量输入 */}
                  <div className="input-group">
                    <div className="input-wrapper-text">目标龙门币数量:</div>
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
=======
                {/* 输入限制性数据 */}
                <div className="upgrade-count-container">
                  <div className="toggle-container">
                    <div className="toggle-text">允许升级的精零干员数量：</div>
                    <input
                      type="number"
                      className="short-input-box"
                      min="0" // 最小值
                      max="10" // 最大值
                      step="1" // 步长
                      placeholder="0-10"
                      value={state.upgrade0Count}
                      onChange={(e) => handleUpgradeCountChange(e, "upgrade0Count", 0, 10)}
                    />
                  </div>
                  <div className="toggle-container">
                    <div className="toggle-text">允许升级的精一干员数量：</div>
                    <input
                      type="number"
                      className="short-input-box"
                      min="0" 
                      max="10" 
                      step="1" 
                      placeholder="0-10"
                      value={state.upgrade1Count}
                      onChange={(e) => handleUpgradeCountChange(e, "upgrade1Count", 0, 10)}
                    />
                  </div>
                  <div className="toggle-container">
                    <div className="toggle-text">允许升级的精二干员数量：</div>
                    <input
                      type="number"
                      className="short-input-box"
                      min="0" 
                      max="10"
                      step="1" 
                      placeholder="0-10"
                      value={state.upgrade2Count}
                      onChange={(e) => handleUpgradeCountChange(e, "upgrade2Count", 0, 10)}
                    />
                  </div>
                  <div className="toggle-container">
                    <div className="toggle-text">允许升级的理智的数量：</div>
                    <input
                      type="number"
                      className="short-input-box"
                      min="0" 
                      max="200"
                      step="1"
                      placeholder="0-200"
                      value={state.sanityCount}
                      onChange={(e) => handleUpgradeCountChange(e, "sanityCount", 0, 200)}
                    />
>>>>>>> Stashed changes
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
                  {/* 结果框 */}
                  <div className="output-wrapper-text">
                    计算还需要龙门币数量:
                  </div>
                  <div className="result-container">
                    <input
                      type="text"
                      className="result-box"
                      placeholder="两者相差"
                      value={state.result}
                      readOnly
                    />
                  </div>
                  {state.differenceError && (
                    <div className="error-message">{state.differenceError}</div>
                  )}
                </div>

                <div className="usage-guide">
                  <div className="notice-title">数值输入注意事项</div>
                  <div className="notice-content">
                    1. 输入要求：两个差值处于[-5000,5000]的非负整数
                    <br />
                    2.
                    点击“立即计算”按钮开始计算，点击“上一路径”和“下一路径”可以切换路径方案
                    <br />
                    3.设置面板中的开关调整之后，需要重新点击“立即计算”按钮才会生效，有些情况下需要你点两下按钮才会生效。
                    对于某些较大的数字可能存在计算较慢的现象，但一般5秒左右能计算出结果。后续会继续优化。
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧设置面板 */}
            <div className="content-panel right-panel">
              <div className="title-bar">
                <h1>设置区域</h1>
              </div>

              {/* 开关容器 */}
              <div className="toggle-wrapper">
                {settingsOptions.map(({ text, key }) => (
                  <div className="toggle-container" key={key}>
                    <div className="toggle-text">{text}</div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={state.settings[key]}
                        onChange={() => handleToggleChange(key)}
                      />
                      <span className="slider" />
                    </label>
                  </div>
                ))}

              </div>
            </div>
          </div>

          {/* 路径显示框 */}
          <div className="history-box">
            <div className="history-header">
              <h2>计算所得路径</h2>
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

            {state.clickCount >= 10 && state.pathCache.length > 0 && (
              <div className="change-over-text">
                <p>
                  {state.clickCount < 15
                    ? "你已经尝试了10条路径，要不要考虑更换输入值呢？"
                    : "要不要考虑更换输入值呢？"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

<<<<<<< Updated upstream
      {/* 新增：弹窗组件 */}
=======
      {/* 底部备案信息区域 */}
      <div className="footer">
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noreferrer noopener"
          className="external-link"
        >
          备案号：鄂ICP备2025105560号-1
        </a>
        <p>© 2025 龙门币凑数计算器. All rights reserved.</p>
      </div>

      {/* 弹窗组件 */}
>>>>>>> Stashed changes
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>提醒</h3>
            <p>您已开启“只允许连续多次对精零/精一/精二1级干员进行升级”开关，请检查以下开关状态：</p>
            <p>
              <p>
                允许连续多次对精零1级干员进行升级：
                {state.settings.enableUpgradeOnly0 ? "已开启" : "未开启"}
              </p>
              <p>
                允许连续多次对精一1级干员进行升级：
                {state.settings.enableUpgradeOnly1 ? "已开启" : "未开启"}
              </p>
              <p>
                允许连续多次对精二1级干员进行升级：
                {state.settings.enableUpgradeOnly2 ? "已开启" : "未开启"}
              </p>
            </p>
            <button onClick={() => setShowModal(false)}>关闭</button>
          </div>
        </div>
      )}

      {/* 彩蛋弹窗 */}
      {showBonusModal && (
        <div className="modal-overlay">
          <div className="modal-content bonus-modal">
            <img src={bonusImage} alt="Bonus" className="bonus-image" />
            <p className="bonus-text">
              你已经摆弄这俩按钮30次了，有这个探索精神相信你做什么都能成功的
            </p>
            <button onClick={() => setShowBonusModal(false)}>关闭</button>
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
