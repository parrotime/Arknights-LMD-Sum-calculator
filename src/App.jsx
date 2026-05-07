import React, { useReducer, useState, useCallback, useEffect, Suspense, lazy } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { Transmission } from "./components/Transmission";
import { CursorProvider, useCursorState } from "./components/CursorContext";

const NotePage = lazy(() => import("./pages/Note"));
const DataPage = lazy(() => import("./pages/Data"));
const AboutPage = lazy(() => import("./pages/About"));
import InputPanel from "./components/InputPanel";
import SettingsPanel from "./components/SettingsPanel";
import ResultArea from "./components/ResultArea";
import {
  romanticImageUrls, funnyImageUrl,
  isRomanticNumber, isFunnyNumber, useHeartEffect,
  SettingsWarningModal,
} from "./components/EasterEggs";
import styles from "./assets/styles/App.module.css";
import { validateInput, buildLimits, buildCacheKey } from "./utils/calcLogic";

const defaultState = {
  num1: "", //当前数量
  num2: "", //目标数量
  result: "", //两者相差
  error1: "", // num1错误信息
  error2: "", // num2错误信息
  history: [], //计算历史记录
  differenceError: "", //差值错误信息
  calcError: "", // 计算结果错误（显示在ResultArea）
  calcMeta: null, // { fromCache: bool, elapsed: number } 计算元信息
  pathCache: [], //计算出来的路径缓存
  currentPathIndex: 0, //路径索引
  clickCount: 0, // 路径切换次数
  isCalculating: false,
  settingsDirty: false,
  settings: {
    allow3Star: true,
    allow2Star: true,
    allowMaterial: true,
    allowStore20: true,
    allowStore10: true,
    allowStore70: true,
    allowStore2000: true,
    allowStore5000: true,
    allowCE: true,
    allowExt25: true,
    allowTrade: true,
    allowUpgradeOnly0: false,
    allowUpgradeOnly1: false,
    allowUpgradeOnly2: false,
    allowUpgradeOnlyFor1: false,
    allowOrundumsGreen: false,
    allowOrundumsDevice: false,
  },
  upgrade0Count: "",
  upgrade1Count: "",
  upgrade2Count: "",
  sanityCount: "",
  trade2Count: "",
  trade3Count: "",
  trade4Count: "",
  trade5Count: "",
};

// 默认设置按钮的初始状态
const freshDefaults = {
  allowStore10: false,
  allowStore20: false,
  allowStore70: false,
  allowStore2000: false,
  allowStore5000: false,
  allowExt25: false,
  allowUpgradeOnly0: true,
  allowUpgradeOnly1: true,
  allowUpgradeOnly2: true,
  allowUpgradeOnlyFor1: true,
};

// 迁移旧版 disable/enable 键名到 allow 键名
const migrateSettings = (settings) => {
  if (!settings || !("disable3Star" in settings)) return settings;
  return {
    allow3Star: !settings.disable3Star,
    allow2Star: !settings.disable2Star,
    allowMaterial: !settings.disableMaterial,
    allowStore20: !settings.disableStore20,
    allowStore10: !settings.disableStore10,
    allowStore70: !settings.disableStore70,
    allowStore2000: !settings.disableStore2000,
    allowStore5000: !settings.disableStore5000,
    allowCE: !settings.disableCE,
    allowExt25: !settings.disableExt25,
    allowTrade: !settings.disableTrade,
    allowUpgradeOnly0: !!settings.enableUpgradeOnly0,
    allowUpgradeOnly1: !!settings.enableUpgradeOnly1,
    allowUpgradeOnly2: !!settings.enableUpgradeOnly2,
    allowUpgradeOnlyFor1: !!settings.enableUpgradeOnlyFor1,
    allowOrundumsGreen: false,
    allowOrundumsDevice: false,
  };
};

const PERSISTED_KEYS = [
  "settings",
  "num1",
  "num2",
  "upgrade0Count",
  "upgrade1Count",
  "upgrade2Count",
  "sanityCount",
  "trade2Count",
  "trade3Count",
  "trade4Count",
  "trade5Count",
];

const getInitialState = () => {
  const saved = localStorage.getItem("calculatorState");
  if (saved) {
    const parsed = JSON.parse(saved);
    const restored = { ...defaultState };
    for (const key of PERSISTED_KEYS) {
      if (key in parsed) restored[key] = parsed[key];
    }
    restored.settings = { ...defaultState.settings, ...migrateSettings(restored.settings) };
    return restored;
  }
  return {
    ...defaultState,
    settings: { ...defaultState.settings, ...freshDefaults },
  };
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_NUM":
      return {
        ...state,
        [action.field]: action.value,
        [`error${action.field.slice(-1)}`]: "",
      };
    case "CLEAR_LMD_INPUT":
      return {
        ...state,
        [action.field]: "",
        [`error${action.field.slice(-1)}`]: "",
        differenceError: "",
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
    case "SET_CALC_ERROR":
      return {
        ...state,
        calcError: action.value,
      };
    case "SET_CALC_META":
      return {
        ...state,
        calcMeta: action.value,
      };
    case "SET_PATHS":
      return {
        ...state,
        pathCache: action.paths,
        currentPathIndex: 0,
        clickCount: 0,
        settingsDirty: false,
      };
    case "APPEND_HISTORY":
      return {
        ...state,
        history: [...state.history.slice(-10), action.entry],
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
        settingsDirty: true,
      };
    case "CHANGE_PATH":
      return {
        ...state,
        currentPathIndex:
          (state.currentPathIndex + action.delta + state.pathCache.length) %
          state.pathCache.length,
        clickCount: state.clickCount + 1,
      };
    case "SET_UPGRADE_COUNT":
      return {
        ...state,
        [action.field]: action.value,
        settingsDirty: true,
      };
    case "SWAP_NUMS":
      return {
        ...state,
        num1: state.num2,
        num2: state.num1,
        error1: "",
        error2: "",
      };
    case "RESET_INPUTS":
      return {
        ...state,
        num1: "",
        num2: "",
        result: "",
        error1: "",
        error2: "",
        differenceError: "",
        upgrade0Count: "",
        upgrade1Count: "",
        upgrade2Count: "",
        sanityCount: "",
        trade2Count: "",
        trade3Count: "",
        trade4Count: "",
        trade5Count: "",
        pathCache: [],
        currentPathIndex: 0,
        clickCount: 0,
      };
    case "RESET_SETTINGS":
      return {
        ...state,
        settings: { ...defaultState.settings, ...freshDefaults },
        upgrade0Count: "",
        upgrade1Count: "",
        upgrade2Count: "",
        sanityCount: "",
        trade2Count: "",
        trade3Count: "",
        trade4Count: "",
        trade5Count: "",
        settingsDirty: true,
      };
    default:
      return state;
  }
};

// 检查本地缓存
const checkCache = (cacheKey) => {
  const cached = localStorage.getItem(`pathCache_${cacheKey}`);
  if (!cached) return null;
  try {
    const paths = JSON.parse(cached);
    if (paths && paths.length > 0) return paths;
    localStorage.removeItem(`pathCache_${cacheKey}`);
  } catch {
    localStorage.removeItem(`pathCache_${cacheKey}`);
  }
  return null;
};

// 调用计算 API（带超时，对齐后端 15s + 网络余量）
const callAPI = (difference, settings, limits, num2Val) =>
  Promise.race([
    Transmission(difference, settings, limits, num2Val),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("计算超时,请重试")), 18000)
    ),
  ]);

// 格式化错误信息
const formatError = (error) => {
  if (error.isNetworkError) return error.message;
  if (error.status) {
    const map = {
      400: `输入错误: ${error.message}`,
      429: `请求过于频繁: ${error.message}`,
      503: `服务器繁忙，请稍后再试`,
      504: `计算超时: ${error.message}`,
      500: `服务器内部错误: ${error.message}. 如果问题持续，请联系管理员。`,
    };
    return map[error.status] || `请求失败: ${error.message} (代码: ${error.status})`;
  }
  return error.message ? `发生错误: ${error.message}` : "发生未知错误，请稍后再试。";
};

// 管理路径缓存（最多5条）
const managePathCache = (newKey) => {
  const cacheQueue = JSON.parse(localStorage.getItem("pathCacheQueue") || "[]");
  if (!cacheQueue.includes(newKey)) {
    cacheQueue.push(newKey);
    if (cacheQueue.length > 5) {
      localStorage.removeItem(`pathCache_${cacheQueue.shift()}`);
    }
    localStorage.setItem("pathCacheQueue", JSON.stringify(cacheQueue));
  }
};

// 主计算组件
const MainCalculator = ({ onAssistantEgg }) => {
  const [state, dispatch] = useReducer(reducer, getInitialState());
  const [showModal, setShowModal] = useState(false);
  const [heartsElement, triggerHeart] = useHeartEffect();
  const { setCalculating } = useCursorState();

  useEffect(() => {
    const toSave = {};
    for (const key of PERSISTED_KEYS) toSave[key] = state[key];
    localStorage.setItem("calculatorState", JSON.stringify(toSave));
  }, [
    state.settings,
    state.num1,
    state.num2,
    state.upgrade0Count,
    state.upgrade1Count,
    state.upgrade2Count,
    state.sanityCount,
    state.trade2Count,
    state.trade3Count,
    state.trade4Count,
    state.trade5Count,
  ]);

  // 同步计算状态到光标 context
  useEffect(() => {
    setCalculating(state.isCalculating);
  }, [state.isCalculating, setCalculating]);

  //处理弹窗逻辑
  useEffect(() => {
    if (state.settings.allowUpgradeOnlyFor1) {
      const { allowUpgradeOnly0, allowUpgradeOnly1, allowUpgradeOnly2 } =
        state.settings;
      if (!allowUpgradeOnly0 && !allowUpgradeOnly1 && !allowUpgradeOnly2) {
        setShowModal(true);
      }
    }
  }, [
    state.settings.allowUpgradeOnlyFor1,
    state.settings.allowUpgradeOnly0,
    state.settings.allowUpgradeOnly1,
    state.settings.allowUpgradeOnly2,
  ]);

  const handleToggleChange = useCallback(
    (key) => {
      dispatch({ type: "TOGGLE_SETTING", key });
    },
    []
  );

  const handleResetSettings = useCallback(() => {
    dispatch({ type: "RESET_SETTINGS" });
  }, []);

  const handleSwapNums = useCallback(() => {
    dispatch({ type: "SWAP_NUMS" });
  }, []);

  const handleResetInputs = useCallback(() => {
    dispatch({ type: "RESET_INPUTS" });
  }, []);

  const handleClearLmdInput = useCallback((field) => {
    dispatch({ type: "CLEAR_LMD_INPUT", field });
  }, []);

  // 优化后的输入验证
  const handleInputChange = useCallback((e, field) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      dispatch({ type: "SET_NUM", field, value: "" });
      return;
    }

    const numValue = parseInt(value, 10);
    if (numValue > 999999999) {
      dispatch({
        type: "SET_ERROR",
        field: `error${field.slice(-1)}`,
        value: "这么多龙门币可以分我一点吗？",
      });
      return;
    }
    dispatch({ type: "SET_NUM", field, value: numValue.toString() });
  }, []);

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

  // 主体计算逻辑
  const handleCalculate = useCallback(
    async (event) => {
      // 彩蛋检测
      if (isRomanticNumber(state.num2)) {
        triggerHeart(event);
        onAssistantEgg?.({
          imageUrl: romanticImageUrls[Math.floor(Math.random() * romanticImageUrls.length)],
          type: "romantic",
        });
      } else if (isFunnyNumber(state.num2)) {
        onAssistantEgg?.({
          imageUrl: funnyImageUrl,
          type: "funny",
        });
      } else {
        onAssistantEgg?.(null);
      }

      // 输入验证
      const validation = validateInput(state.num1, state.num2);
      if (validation.error) {
        dispatch({ type: "SET_ERROR", field: "differenceError", value: validation.error });
        if (state.num1 && state.num2) dispatch({ type: "SET_RESULT", value: "" });
        return;
      }

      const { difference, num1Val, num2Val } = validation;
      dispatch({ type: "SET_ERROR", field: "differenceError", value: "" });
      dispatch({ type: "SET_CALC_ERROR", value: "" });
      dispatch({ type: "SET_CALC_META", value: null });
      dispatch({ type: "SET_RESULT", value: difference.toString() });
      dispatch({ type: "SET_CALCULATING", value: true });
      dispatch({ type: "SET_PATHS", paths: [] });

      const limits = buildLimits(state);
      const cacheKey = buildCacheKey(difference, state.settings, limits);
      const t0 = performance.now();

      // 检查缓存
      const cachedPaths = checkCache(cacheKey);
      if (cachedPaths) {
        dispatch({ type: "SET_PATHS", paths: cachedPaths });
        dispatch({ type: "SET_CALC_META", value: { fromCache: true, elapsed: 0 } });
        dispatch({ type: "SET_CALCULATING", value: false });
        dispatch({ type: "APPEND_HISTORY", entry: { path: cachedPaths[0], timestamp: new Date().toLocaleString(), initialLMD: num1Val } });
        return;
      }

      // 调用 API
      try {
        const paths = await callAPI(difference, state.settings, limits, num2Val);
        const elapsed = Math.round(performance.now() - t0);
        if (!paths || paths.length === 0) {
          dispatch({ type: "SET_CALC_ERROR", value: "计算完成，但未找到满足条件的路径方案。" });
          dispatch({ type: "SET_PATHS", paths: [] });
        } else {
          localStorage.setItem(`pathCache_${cacheKey}`, JSON.stringify(paths));
          managePathCache(cacheKey);
          dispatch({ type: "SET_CALC_META", value: { fromCache: false, elapsed } });
        }
        dispatch({ type: "SET_PATHS", paths });
        dispatch({ type: "APPEND_HISTORY", entry: { path: paths[0], timestamp: new Date().toLocaleString(), initialLMD: num1Val } });
      } catch (error) {
        dispatch({ type: "SET_CALC_ERROR", value: formatError(error) });
        dispatch({ type: "SET_PATHS", paths: [] });
        dispatch({ type: "APPEND_HISTORY", entry: `计算失败: ${formatError(error)}` });
      } finally {
        dispatch({ type: "SET_CALCULATING", value: false });
      }
    },
    [
      state.num1,
      state.num2,
      state.settings,
      state.upgrade0Count,
      state.upgrade1Count,
      state.upgrade2Count,
      state.sanityCount,
      state.trade2Count,
      state.trade3Count,
      state.trade4Count,
      state.trade5Count,
      onAssistantEgg,
    ]
  );

  return (
    <>
      <div className={styles['input-area']}>
        <div className={styles['main-container']}>
          <div className={styles['main-content-container']}>
            <InputPanel
              state={state}
              styles={styles}
              handleInputChange={handleInputChange}
              handleUpgradeCountChange={handleUpgradeCountChange}
              handleCalculate={handleCalculate}
              onSwap={handleSwapNums}
              onResetInputs={handleResetInputs}
              onClearLmdInput={handleClearLmdInput}
              settingsDirty={state.settingsDirty}
            />
            <SettingsPanel
              settings={state.settings}
              onToggle={handleToggleChange}
              onReset={handleResetSettings}
              styles={styles}
            />
          </div>
          <ResultArea
            state={state}
            styles={styles}
            calcError={state.calcError}
            calcMeta={state.calcMeta}
          />
        </div>
      </div>

      {showModal && (
        <SettingsWarningModal
          settings={state.settings}
          onClose={() => setShowModal(false)}
          styles={styles}
        />
      )}
      {heartsElement}
    </>
  );
};

const AppContent = () => {
  const [assistantEgg, setAssistantEgg] = useState(null);

  const handleAssistantEgg = useCallback((payload) => {
    if (!payload?.imageUrl) {
      setAssistantEgg(null);
      return;
    }
    setAssistantEgg({ ...payload, id: Date.now() });
  }, []);

  return (
    <Layout
      assistantEgg={assistantEgg}
      onAssistantEggClose={() => setAssistantEgg(null)}
    >
      <Suspense fallback={<div style={{ textAlign: "center", padding: "2rem" }}>加载中…</div>}>
        <Routes>
          <Route path="/" element={<MainCalculator onAssistantEgg={handleAssistantEgg} />} />
          <Route path="/note" element={<NotePage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

const App = () => (
  <CursorProvider>
    <Router>
      <AppContent />
    </Router>
  </CursorProvider>
);

export default App;
