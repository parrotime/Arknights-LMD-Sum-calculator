import React, { useState, useCallback } from "react";

// 彩蛋图片
export const romanticImageUrls = [
  "https://ark-lmd.oss-cn-beijing.aliyuncs.com/rosmontis1.webp",
  "https://ark-lmd.oss-cn-beijing.aliyuncs.com/rosmontis2.webp",
  "https://ark-lmd.oss-cn-beijing.aliyuncs.com/rosmontis3.webp",
  "https://ark-lmd.oss-cn-beijing.aliyuncs.com/rosmontis4.webp",
];
export const funnyImageUrl = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/114514.webp";

// 检测函数
const isPowerOfTen = (n) => {
  if (n <= 0) return false;
  const log = Math.log10(n);
  return Math.abs(log - Math.round(log)) < 1e-10;
};

export const isRomanticNumber = (numStr) => {
  if (!numStr || typeof numStr !== "string") return false;
  if (/^(520|1314)+$/.test(numStr)) return true;
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num === 0) return false;
  if (num >= 520 && num % 520 === 0 && isPowerOfTen(num / 520)) return true;
  if (num >= 1314 && num % 1314 === 0 && isPowerOfTen(num / 1314)) return true;
  return false;
};

export const isFunnyNumber = (numStr) => {
  if (!numStr || typeof numStr !== "string") return false;
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num === 0) return false;
  if (num >= 114514 && num % 114514 === 0 && isPowerOfTen(num / 114514)) return true;
  if (num >= 1919810 && num % 1919810 === 0 && isPowerOfTen(num / 1919810)) return true;
  return false;
};

// 爱心特效 hook
let heartId = 0;
export const useHeartEffect = () => {
  const [hearts, setHearts] = useState([]);
  const triggerHeart = useCallback((event) => {
    const id = ++heartId;
    setHearts((prev) => [...prev, { id, x: event.clientX, y: event.clientY }]);
  }, []);
  const heartsElement = hearts.map(({ id, x, y }) => (
    <div
      key={id}
      className="love-heart"
      style={{ left: `${x}px`, top: `${y}px` }}
      onAnimationEnd={() => setHearts((prev) => prev.filter((h) => h.id !== id))}
    >
      ❤️
    </div>
  ));
  return [heartsElement, triggerHeart];
};

// 设置警告弹窗
export const SettingsWarningModal = ({ settings, onClose, styles }) => (
  <div className={styles["modal-overlay"]}>
    <div className={styles["modal-content"]}>
      <h3>提醒</h3>
      <p>
        您已开启"只允许连续多次对精零/精一/精二1级干员进行升级"开关，请检查以下开关至少有一个是打开的，否则无法计算出结果。当前开关状态：
      </p>
      <div>
        <p>允许连续多次对精零1级干员进行升级：{settings.allowUpgradeOnly0 ? "已开启" : "未开启"}</p>
        <p>允许连续多次对精一1级干员进行升级：{settings.allowUpgradeOnly1 ? "已开启" : "未开启"}</p>
        <p>允许连续多次对精二1级干员进行升级：{settings.allowUpgradeOnly2 ? "已开启" : "未开启"}</p>
      </div>
      <button onClick={onClose}>关闭</button>
    </div>
  </div>
);

// 彩蛋弹窗
export const BonusModal = ({ show, onClose, styles }) => (
  <div className={`${styles["modal-overlay"]} ${show ? styles.show : ""}`}>
    {show && (
      <div className={`${styles["modal-content"]} ${styles["bonus-modal"]}`}>
        <img
          src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/rosmontis5.webp"
          alt="Bonus"
          className={styles["bonus-image"]}
        />
        <p className={styles["bonus-text"]}>
          迷迭香发现你点了好多次按钮，她提醒你记得休息一下
        </p>
        <button onClick={onClose}>关闭</button>
      </div>
    )}
  </div>
);
