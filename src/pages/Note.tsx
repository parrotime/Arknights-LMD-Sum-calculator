import { Trans, useTranslation } from "react-i18next";
import styles from "../assets/styles/Note.module.css";


function NotePage() {
  const { t } = useTranslation(["note", "calculator"]);

  return (
    <>
      <div className={styles['main-note-content']}>
        <div className={styles['note-page']}>
          <div className={styles['note-title-bar']}>
            <h1>{t("title")}</h1>
            <p>OPERATION NOTES</p>
          </div>

          <section className={styles['rule-grid']} aria-label={t("rules")}>
            <article className={styles['rule-card']}>
              <div className={styles['rule-header']}>
                <span className={styles['rule-code']}>NOTE 01</span>
                <h2>{t("input.title")}</h2>
              </div>
              <div className={styles['rule-body']}>
                <p>
                  {t("input.range")}
                  <br />
                  {t("input.difference")}
                </p>
              </div>
            </article>

            <article className={styles['rule-card']}>
              <div className={styles['rule-header']}>
                <span className={styles['rule-code']}>NOTE 02</span>
                <h2>{t("steps.title")}</h2>
              </div>
              <div className={styles['rule-body']}>
                <p>{t("steps.example")}</p>
                <p>{t("steps.correct")}</p>
                <p>{t("steps.incorrect")}</p>
              </div>
            </article>

            <article className={styles['rule-card']}>
              <div className={styles['rule-header']}>
                <span className={styles['rule-code']}>NOTE 03</span>
                <h2>{t("settings.title", {
                  setting: t("settings.options.allowUpgradeOnlyFor1.text", { ns: "calculator" }),
                })}</h2>
              </div>
              <div className={styles['rule-body']}>
                <p>{t("settings.description")}</p>
              </div>
            </article>

            <article className={styles['rule-card']}>
              <div className={styles['rule-header']}>
                <span className={styles['rule-code']}>NOTE 04</span>
                <h2>{t("experience.title")}</h2>
              </div>
              <div className={styles['rule-body']}>
                <div className={styles.formula}>
                  <Trans t={t} ns="note" i18nKey="experience.formula" components={{ sub: <sub /> }} />
                </div>
                <p>{t("experience.explanation")}</p>
                <p>{t("experience.crossLevel")}</p>
                <p>
                  <Trans
                    t={t}
                    ns="note"
                    i18nKey="experience.source"
                    components={{
                      reference: <a
                        href="https://ngabbs.com/read.php?tid=16847042"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles['external-link3']}
                      />,
                    }}
                  />
                </p>
  
                <p>{t("experience.rounding")}</p>
                <p>{t("experience.example")}</p>
                <p>{t("experience.reminder")}</p>
    
              </div>
            </article>
          </section>
        </div>
      </div>
    </>
  );
}

export default NotePage;
