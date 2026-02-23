import React from "react";

const settingsOptions = [
  { text: "允许使用理智三星通关", key: "allow3Star" },
  { text: "允许使用理智二星通关", key: "allow2Star" },
  { text: "允许代理剿灭25理智获取250龙门币", key: "allowExt25" },
  { text: "允许使用龙门币副本(CE系列关卡)", key: "allowCE" },
  { text: "允许使用基建物品合成", key: "allowMaterial" },
  { text: "允许使用贸易站售卖赤金", key: "allowTrade" },
  { text: "允许使用活动商店1代币换10龙门币", key: "allowStore10" },
  { text: "允许使用活动商店1代币换20龙门币", key: "allowStore20" },
  { text: "允许使用危机合约1代币换70龙门币", key: "allowStore70" },
  { text: "允许使用活动商店5代币换2000龙门币", key: "allowStore2000" },
  { text: "允许使用活动商店7代币换5000龙门币", key: "allowStore5000" },
  { text: "允许连续多次对精零1级干员进行升级", key: "allowUpgradeOnly0" },
  { text: "允许连续多次对精一1级干员进行升级", key: "allowUpgradeOnly1" },
  { text: "允许连续多次对精二1级干员进行升级", key: "allowUpgradeOnly2" },
  { text: "只允许连续多次对精零/精一/精二1级干员进行升级", key: "allowUpgradeOnlyFor1" },
];

const groups = [
  { title: "使用理智", items: settingsOptions.slice(0, 4) },
  { title: "基建", items: settingsOptions.slice(4, 6) },
  { title: "使用代币", items: settingsOptions.slice(6, 11) },
  { title: "干员升级", items: settingsOptions.slice(11) },
];

const SettingsPanel = ({ settings, onToggle, styles }) => (
  <div className={`${styles['content-panel']} ${styles['right-panel']}`}>
    <div className={styles['title-bar']}>
      <h1>设置区域</h1>
    </div>

    <div className={styles['toggle-wrapper']}>
      {groups.map(({ title, items }) => (
        <React.Fragment key={title}>
          <h4 className={styles['settings-group-title']}>{title}</h4>
          {items.map(({ text, key }) => (
            <div className={styles['toggle-container']} key={key}>
              <div className={styles['toggle-text']}>{text}</div>
              <label className={styles['toggle-switch']}>
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={() => onToggle(key)}
                />
                <span className={styles.slider} />
              </label>
            </div>
          ))}
        </React.Fragment>
      ))}

      <p className={styles['settings-footer-note']}>
        请注意当"只允许..."按钮开启时，请确保其他三个升级开关中至少有一个为开启状态。
      </p>
    </div>
  </div>
);

export default SettingsPanel;
