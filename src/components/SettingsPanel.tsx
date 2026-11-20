import React, { useCallback, useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { CSSProperties, ReactNode } from "react";
import type { CalculatorSettings } from "../types/calculator";
import panelStyles from "../assets/styles/PanelFrame.module.css";
import styles from "../assets/styles/SettingsPanel.module.css";

type SettingKey = keyof CalculatorSettings;
type SettingsLayout = "sanity" | "base" | "token" | "operator";
type SettingsPanelStyles = typeof styles;

interface SettingGroup {
  code: string;
  icon: string;
  layout: SettingsLayout;
  items: SettingKey[];
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

const settingsOptions: SettingKey[] = [
  "allow3Star", "allow2Star", "allowExt25", "allowCE",
  "allowMaterial", "allowTrade", "allowOrundumsGreen", "allowOrundumsDevice",
  "allowStore10", "allowStore20", "allowStore70", "allowStore2000", "allowStore5000",
  "allowUpgradeOnly0", "allowUpgradeOnly1", "allowUpgradeOnly2", "allowUpgradeOnlyFor1",
];

const groups: SettingGroup[] = [
  {
    code: "SANITY USAGE SETTINGS",
    icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/AP_GAMEPLAY.webp",
    layout: "sanity",
    items: settingsOptions.slice(0, 4),
  },
  {
    code: "BASE INFRASTRUCTURE SETTINGS",
    icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/premium_material_issue_voucher.webp",
    layout: "base",
    items: settingsOptions.slice(4, 8),
  },
  {
    code: "TOKEN USAGE SETTINGS",
    icon: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/act2mainss_token_courage.webp",
    layout: "token",
    items: settingsOptions.slice(8, 13),
  },
  {
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
  const { t, i18n } = useTranslation("calculator");
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
  }, [openHelpKey, updateHelpPopoverPosition, i18n.resolvedLanguage]);

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
        <h1>// [02] {t("settings.title")}</h1>
        <p className={panelStyles['title-code']}>CALCULATION CONFIGURATION</p>
        <button
          type="button"
          className={`${styles['reset-settings-btn']} ${resetAnimating ? styles['reset-settings-btn-active'] : ''}`}
          onClick={handleResetClick}
          onAnimationEnd={() => setResetAnimating(false)}
          title={t("settings.reset")}
          aria-label={t("settings.reset")}
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
          {groups.map(({ code, icon, layout, items }) => (
            <section className={`${styles['settings-card']} ${styles[`settings-card-${layout}`]}`} key={layout}>
                  <div className={styles['settings-card-header']}>
                    <img
                      className={styles['settings-card-icon']}
                      src={icon}
                      alt=""
                      aria-hidden="true"
                      decoding="async"
                    />
                    <div className={styles['settings-card-title']}>
                      <span className={styles['settings-card-title-main']}>{t(`settings.groups.${layout}`)}</span>
                      <span className={styles['settings-card-title-code']}>{code}</span>
                    </div>
                  </div>

                  <div className={styles['settings-card-options']}>
                    {items.map((key) => {
                      const text = t(`settings.options.${key}.text`);
                      const highlight = t(`settings.options.${key}.highlight`);
                      const helpText = key === "allowUpgradeOnlyFor1" ? [
                        t("settings.help.notice"),
                        <Trans
                          t={t}
                          i18nKey="settings.help.explanation"
                          components={{ keyword: <span className="setting-popover-keyword" /> }}
                        />,
                        t("settings.help.requirement"),
                      ] : undefined;
                      const switchControl = (
                        <label className={styles['toggle-switch']}>
                          <input
                            type="checkbox"
                            checked={settings[key]}
                            aria-label={text}
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
                            aria-label={t("settings.showHelp")}
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
                                aria-label={t("settings.closeHelp")}
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
