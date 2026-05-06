import React, { useEffect, useState } from "react";

const settingsOptions = [
  { text: "允许使用理智三星通关", key: "allow3Star", highlight: "三星通关" },
  { text: "允许使用理智二星通关", key: "allow2Star", highlight: "二星通关" },
  { text: "允许代理剿灭25理智获取250龙门币", key: "allowExt25", highlight: "代理剿灭" },
  { text: "允许使用龙门币副本(CE系列关卡)", key: "allowCE", highlight: "龙门币副本" },
  { text: "允许合成精英材料", key: "allowMaterial", highlight: "精英材料" },
  { text: "允许使用贸易站售卖赤金", key: "allowTrade", highlight: "售卖赤金" },
  { text: "允许使用绿土搓玉生产源石碎片", key: "allowOrundumsGreen", highlight: "绿土搓玉" },
  { text: "允许使用装置搓玉生产源石碎片", key: "allowOrundumsDevice", highlight: "装置搓玉" },
  { text: "允许使用活动商店1代币换10龙门币", key: "allowStore10", highlight: "1代币换10龙门币" },
  { text: "允许使用活动商店1代币换20龙门币", key: "allowStore20", highlight: "1代币换20龙门币" },
  { text: "允许使用危机合约1代币换70龙门币", key: "allowStore70", highlight: "1代币换70龙门币" },
  { text: "允许使用活动商店5代币换2000龙门币", key: "allowStore2000", highlight: "5代币换2000龙门币" },
  { text: "允许使用活动商店7代币换5000龙门币", key: "allowStore5000", highlight: "7代币换5000龙门币" },
  { text: "允许连续多次对精零1级干员进行升级", key: "allowUpgradeOnly0", highlight: "精零1级" },
  { text: "允许连续多次对精一1级干员进行升级", key: "allowUpgradeOnly1", highlight: "精一1级" },
  { text: "允许连续多次对精二1级干员进行升级", key: "allowUpgradeOnly2", highlight: "精二1级" },
  {
    text: "只允许连续多次对精零/精一/精二1级干员进行升级",
    key: "allowUpgradeOnlyFor1",
    highlight: "1级干员",
    helpText: [
      "请注意：",
      <>这个设置的目的是<span className="setting-popover-keyword">排除</span>升级<span className="setting-popover-keyword">不是等级为1级</span>的干员，</>,
      "因此当这个按钮开启时，",
      "请确保其他三个升级开关中，至少有一个为开启状态，",
    ],
  },
];

const groups = [
  {
    title: "理智使用设置",
    code: "SANITY USAGE SETTINGS",
    icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/AP_GAMEPLAY.webp",
    column: "left",
    items: settingsOptions.slice(0, 4),
  },
  {
    title: "基建相关设置",
    code: "BASE INFRASTRUCTURE SETTINGS",
    icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/premium_material_issue_voucher.webp",
    column: "right",
    items: settingsOptions.slice(4, 8),
  },
  {
    title: "代币使用设置",
    code: "TOKEN USAGE SETTINGS",
    icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/act2mainss_token_courage.webp",
    column: "left",
    items: settingsOptions.slice(8, 13),
  },
  {
    title: "干员相关设置",
    code: "OPERATOR SETTINGS",
    icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/sprite_exp_card_t4.webp",
    column: "right",
    items: settingsOptions.slice(13),
  },
];

const columns = [
  groups.filter((group) => group.column === "left"),
  groups.filter((group) => group.column === "right"),
];

const renderSettingText = (text, highlight, styles) => {
  if (!highlight || !text.includes(highlight)) {
    return text;
  }

  const [before, after] = text.split(highlight);

  return (
    <>
      {before}
      <span className={styles['setting-text-highlight']}>{highlight}</span>
      {after}
    </>
  );
};

const SettingsPanel = ({ settings, onToggle, onReset, styles }) => {
  const [openHelpKey, setOpenHelpKey] = useState(null);
  const [resetAnimating, setResetAnimating] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!event.target.closest('[data-setting-help-root="true"]')) {
        setOpenHelpKey(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleResetClick = () => {
    setResetAnimating(true);
    onReset();
  };

  return (
    <div className={`${styles['content-panel']} ${styles['right-panel']}`}>
      <div className={`${styles['title-bar']} ${styles['settings-title-bar']}`}>
        <h1>// [02] 计算配置</h1>
        <p className={styles['title-code']}>CALCULATION CONFIGURATION</p>
        <button
          type="button"
          className={`${styles['reset-settings-btn']} ${resetAnimating ? styles['reset-settings-btn-active'] : ''}`}
          onClick={handleResetClick}
          onAnimationEnd={() => setResetAnimating(false)}
          title="恢复默认设置"
          aria-label="恢复默认设置"
        >
          <img
            className={styles['reset-settings-icon']}
            src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/reset.webp"
            alt=""
            aria-hidden="true"
          />
        </button>
      </div>

      <div className={styles['toggle-wrapper']}>
        <div className={styles['settings-grid']}>
          {columns.map((columnGroups, columnIndex) => (
            <div className={styles['settings-column']} key={columnIndex}>
              {columnGroups.map(({ title, code, icon, items }) => (
                <section className={styles['settings-card']} key={title}>
                  <div className={styles['settings-card-header']}>
                    <img
                      className={styles['settings-card-icon']}
                      src={icon}
                      alt=""
                      aria-hidden="true"
                    />
                    <div className={styles['settings-card-title']}>
                      <span className={styles['settings-card-title-main']}>{title}</span>
                      <span className={styles['settings-card-title-code']}>{code}</span>
                    </div>
                  </div>

                  <div className={styles['settings-card-options']}>
                    {items.map(({ text, key, highlight, helpText }) => (
                      <div className={styles['toggle-container']} key={key}>
                        <div className={styles['toggle-text']}>
                          {renderSettingText(text, highlight, styles)}
                          {helpText && (
                            <span className={styles['setting-help-root']} data-setting-help-root="true">
                              <button
                                type="button"
                                className={styles['setting-help-trigger']}
                                aria-label="查看设置说明"
                                aria-expanded={openHelpKey === key}
                                onClick={() => setOpenHelpKey(openHelpKey === key ? null : key)}
                              >
                                ?
                              </button>
                              {openHelpKey === key && (
                                <span className={styles['setting-help-popover']}>
                                  <button
                                    type="button"
                                    className={styles['setting-help-close']}
                                    aria-label="关闭设置说明"
                                    onClick={() => setOpenHelpKey(null)}
                                  >
                                    ×
                                  </button>
                                  {helpText.map((line, index) => (
                                    <span key={index}>{line}</span>
                                  ))}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
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
                  </div>
                </section>
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default SettingsPanel;
