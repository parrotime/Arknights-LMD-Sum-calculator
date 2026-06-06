import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { CalculatorSettings } from "../types/calculator";
import panelStyles from "../assets/styles/PanelFrame.module.css";
import styles from "../assets/styles/SettingsPanel.module.css";

type SettingKey = keyof CalculatorSettings;
type SettingsLayout = "sanity" | "base" | "token" | "operator";
type SettingsPanelStyles = typeof styles;

interface SettingOption {
  text: string;
  key: SettingKey;
  highlight: string;
  helpText?: ReactNode[];
}

interface SettingGroup {
  title: string;
  code: string;
  icon: string;
  layout: SettingsLayout;
  items: SettingOption[];
}

interface HelpPopoverStyle extends CSSProperties {
  "--setting-help-arrow-left": string;
  "--setting-help-arrow-edge": "top" | "bottom";
}

interface SettingsPanelProps {
  settings: CalculatorSettings;
  onToggle: (key: SettingKey) => void;
  onReset: () => void;
}

const settingsOptions: SettingOption[] = [
  { text: "允许使用理智三星通关", key: "allow3Star", highlight: "三星通关" },
  { text: "允许使用理智二星通关", key: "allow2Star", highlight: "二星通关" },
  { text: "允许通过25理智剿灭获取250龙门币", key: "allowExt25", highlight: "剿灭作战" },
  { text: "允许使用龙门币副本(CE系列关卡)", key: "allowCE", highlight: "CE龙门币副本" },
  { text: "允许使用加工站合成精英材料", key: "allowMaterial", highlight: "精英材料合成" },
  { text: "允许使用贸易站售卖赤金", key: "allowTrade", highlight: "赤金售卖" },
  { text: "允许使用绿土搓玉生产源石碎片", key: "allowOrundumsGreen", highlight: "绿土搓玉" },
  { text: "允许使用装置搓玉生产源石碎片", key: "allowOrundumsDevice", highlight: "装置搓玉" },
  { text: "允许使用活动商店1代币换10龙门币", key: "allowStore10", highlight: "1代币换10龙门币" },
  { text: "允许使用活动商店1代币换20龙门币", key: "allowStore20", highlight: "1代币换20龙门币" },
  { text: "允许使用危机合约1代币换70龙门币", key: "allowStore70", highlight: "1代币换70龙门币" },
  { text: "允许使用活动商店5代币换2000龙门币", key: "allowStore2000", highlight: "5代币换2000龙门币" },
  { text: "允许使用活动商店7代币换5000龙门币", key: "allowStore5000", highlight: "7代币换5000龙门币" },
  { text: "允许连续多次对精零1级干员进行升级", key: "allowUpgradeOnly0", highlight: "升级精零1级干员" },
  { text: "允许连续多次对精一1级干员进行升级", key: "allowUpgradeOnly1", highlight: "升级精一1级干员" },
  { text: "允许连续多次对精二1级干员进行升级", key: "allowUpgradeOnly2", highlight: "升级精二1级干员" },
  {
    text: "只允许连续多次对精零/一/二1级干员进行升级",
    key: "allowUpgradeOnlyFor1",
    highlight: "只升级精零/一/二1级干员",
    helpText: [
      "请注意：",
      <>这个设置的目的是<span className="setting-popover-keyword">排除</span>升级<span className="setting-popover-keyword">不是等级为1级</span>的干员，</>,
      "因此当这个按钮开启时，",
      "请确保其他三个升级开关中，至少有一个为开启状态。",
    ],
  },
];

const groups: SettingGroup[] = [
  {
    title: "理智使用设置",
    code: "SANITY USAGE SETTINGS",
    icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/AP_GAMEPLAY.webp",
    layout: "sanity",
    items: settingsOptions.slice(0, 4),
  },
  {
    title: "基建相关设置",
    code: "BASE INFRASTRUCTURE SETTINGS",
    icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/premium_material_issue_voucher.webp",
    layout: "base",
    items: settingsOptions.slice(4, 8),
  },
  {
    title: "代币使用设置",
    code: "TOKEN USAGE SETTINGS",
    icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/act2mainss_token_courage.webp",
    layout: "token",
    items: settingsOptions.slice(8, 13),
  },
  {
    title: "干员相关设置",
    code: "OPERATOR SETTINGS",
    icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/sprite_exp_card_t4.webp",
    layout: "operator",
    items: settingsOptions.slice(13),
  },
];

const renderSettingText = (text: string, highlight: string | undefined, styles: SettingsPanelStyles): ReactNode => {
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

const SettingsPanel = ({ settings, onToggle, onReset }: SettingsPanelProps) => {
  const [openHelpKey, setOpenHelpKey] = useState<SettingKey | null>(null);
  const [helpPopoverStyle, setHelpPopoverStyle] = useState<HelpPopoverStyle | null>(null);
  const [resetAnimating, setResetAnimating] = useState(false);
  const helpTriggerRefs = useRef<Partial<Record<SettingKey, HTMLButtonElement>>>({});
  const helpPopoverRef = useRef<HTMLSpanElement | null>(null);
  const isMobileHelpLayout = useCallback(() => (
    window.matchMedia("(max-width: 900px)").matches || window.matchMedia("(pointer: coarse)").matches
  ), []);

  const updateHelpPopoverPosition = useCallback(() => {
    if (!openHelpKey || !isMobileHelpLayout()) {
      setHelpPopoverStyle(null);
      return;
    }

    const trigger = helpTriggerRefs.current[openHelpKey];
    const popover = helpPopoverRef.current;
    if (!trigger || !popover) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const popoverWidth = Math.min(352, Math.max(0, window.innerWidth - 32));
    const popoverLeft = (window.innerWidth - popoverWidth) / 2;
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const arrowLeft = Math.min(Math.max(triggerCenter - popoverLeft, 16), popoverWidth - 16);
    const spaceAbove = triggerRect.top;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const shouldPlaceBelow = spaceAbove < popoverRect.height + 18 && spaceBelow > spaceAbove;
    const top = shouldPlaceBelow
      ? Math.max(12, Math.min(window.innerHeight - popoverRect.height - 12, triggerRect.bottom + 10))
      : Math.max(12, triggerRect.top - popoverRect.height - 10);

    setHelpPopoverStyle({
      top: `${top}px`,
      visibility: "visible",
      "--setting-help-arrow-left": `${arrowLeft}px`,
      "--setting-help-arrow-edge": shouldPlaceBelow ? "top" : "bottom",
    });
  }, [isMobileHelpLayout, openHelpKey]);

  useEffect(() => {
    setHelpPopoverStyle(null);
    if (!openHelpKey) return undefined;

    const frame = requestAnimationFrame(updateHelpPopoverPosition);
    window.addEventListener("scroll", updateHelpPopoverPosition, { passive: true });
    window.addEventListener("resize", updateHelpPopoverPosition);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateHelpPopoverPosition);
      window.removeEventListener("resize", updateHelpPopoverPosition);
    };
  }, [openHelpKey, updateHelpPopoverPosition]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (isMobileHelpLayout()) return;

      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('[data-setting-help-root="true"]')) {
        setOpenHelpKey(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMobileHelpLayout]);

  const handleResetClick = () => {
    setResetAnimating(true);
    onReset();
  };

  return (
    <div className={`${panelStyles['content-panel']} ${styles['right-panel']}`}>
      <div className={`${panelStyles['title-bar']} ${styles['settings-title-bar']}`}>
        <h1>// [02] 计算配置</h1>
        <p className={panelStyles['title-code']}>CALCULATION CONFIGURATION</p>
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
            src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/clean.webp"
            alt=""
            aria-hidden="true"
            decoding="async"
          />
        </button>
      </div>

      <div className={styles['toggle-wrapper']}>
        <div className={styles['settings-grid']}>
          {groups.map(({ title, code, icon, layout, items }) => (
            <section className={`${styles['settings-card']} ${styles[`settings-card-${layout}`]}`} key={title}>
                  <div className={styles['settings-card-header']}>
                    <img
                      className={styles['settings-card-icon']}
                      src={icon}
                      alt=""
                      aria-hidden="true"
                      decoding="async"
                    />
                    <div className={styles['settings-card-title']}>
                      <span className={styles['settings-card-title-main']}>{title}</span>
                      <span className={styles['settings-card-title-code']}>{code}</span>
                    </div>
                  </div>

                  <div className={styles['settings-card-options']}>
                    {items.map(({ text, key, highlight, helpText }) => {
                      const switchControl = (
                        <label className={styles['toggle-switch']}>
                          <input
                            type="checkbox"
                            checked={settings[key]}
                            onChange={() => onToggle(key)}
                          />
                          <span className={styles.slider} />
                        </label>
                      );

                      const helpControl = helpText && (
                        <span className={styles['setting-help-root']} data-setting-help-root="true">
                          <button
                            type="button"
                            className={styles['setting-help-trigger']}
                            ref={(node) => {
                              if (node) {
                                helpTriggerRefs.current[key] = node;
                              } else {
                                delete helpTriggerRefs.current[key];
                              }
                            }}
                            aria-label="查看设置说明"
                            aria-expanded={openHelpKey === key}
                            onClick={() => setOpenHelpKey((currentKey) => (currentKey === key ? null : key))}
                            onMouseEnter={() => setOpenHelpKey(key)}
                          >
                            ?
                          </button>
                          {openHelpKey === key && (
                            <span
                              className={styles['setting-help-popover']}
                              ref={helpPopoverRef}
                              style={helpPopoverStyle || undefined}
                            >
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
                      );

                      if (helpText) {
                        return (
                          <React.Fragment key={key}>
                            <div className={`${styles['advanced-rule-header']} ${styles['toggle-text']}`}>
                              <span className={styles['advanced-rule-badge']}>ADVANCED</span>
                              {helpControl}
                            </div>
                            <div className={`${styles['toggle-container']} ${styles['toggle-container-advanced']}`}>
                              <div className={styles['toggle-text']}>
                                {renderSettingText(text, highlight, styles)}
                              </div>
                              <div className={styles['setting-mobile-summary']}>
                                <span className={styles['setting-mobile-keyword']}>
                                  <span className={styles['setting-text-highlight']}>{highlight || text}</span>
                                </span>
                                <span className={styles['setting-mobile-desc']}>{text}</span>
                              </div>
                              {switchControl}
                            </div>
                          </React.Fragment>
                        );
                      }

                      return (
                        <div className={styles['toggle-container']} key={key}>
                          <div className={styles['toggle-text']}>
                            {renderSettingText(text, highlight, styles)}
                          </div>
                          <div className={styles['setting-mobile-summary']}>
                            <span className={styles['setting-mobile-keyword']}>
                              <span className={styles['setting-text-highlight']}>{highlight || text}</span>
                            </span>
                            <span className={styles['setting-mobile-desc']}>{text}</span>
                          </div>
                          {switchControl}
                        </div>
                      );
                    })}
                  </div>
                </section>
          ))}
        </div>

      </div>
    </div>
  );
};

export default SettingsPanel;
