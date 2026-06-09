import React from "react";
import styles from "../assets/styles/Note.module.css";


function NotePage() {
  return (
    <>
      <div className={styles['main-note-content']}>
        <div className={styles['note-page']}>
          <div className={styles['note-title-bar']}>
            <h1>注意事项</h1>
            <p>OPERATION NOTES</p>
          </div>

          <section className={styles['rule-grid']} aria-label="规则说明">
            <article className={styles['rule-card']}>
              <div className={styles['rule-header']}>
                <span className={styles['rule-code']}>NOTE 01</span>
                <h2>龙门币数值输入规范</h2>
              </div>
              <div className={styles['rule-body']}>
                <p>
                  1. 请输入 0 到 99999999 之间的整数（如果你的龙门币多于1亿，可以试试只计算尾数）
                  <br />
                  2. 目标龙门币与当前龙门币差值应该小于等于±5000（当前版本限制）
                </p>
              </div>
            </article>

            <article className={styles['rule-card']}>
              <div className={styles['rule-header']}>
                <span className={styles['rule-code']}>NOTE 02</span>
                <h2>请跟随步骤的提示进行操作，不要擅自对同一位干员进行多次重复操作</h2>
              </div>
              <div className={styles['rule-body']}>
                <p>
                  如果步骤是“连续对1名精零1级干员使用6个基础作战记录（×2次）”
                </p>
                <p>
                  请博士找到2位精零1级干员，每位干员分别投喂6个基础作战记录（一共12个）便可得到目标值。
                </p>
                <p>
                  而不要为了图方便，对同一位干员连续投喂两轮6个基础作战记录（一共12个），这会导致误差发生。具体的误差发生原因请查看后文。
                </p>
              </div>
            </article>

            <article className={styles['rule-card']}>
              <div className={styles['rule-header']}>
                <span className={styles['rule-code']}>NOTE 03</span>
                <h2>关于“允许连续多次对精零/一/二1级干员进行升级”开关</h2>
              </div>
              <div className={styles['rule-body']}>
                <p>
                  这个设置的目的是排除升级“不是等级为1级”的干员，因此当这个按钮开启时，请确保其他三个升级设置开关中，至少有一个为开启状态。
                </p>
              </div>
            </article>

            <article className={styles['rule-card']}>
              <div className={styles['rule-header']}>
                <span className={styles['rule-code']}>NOTE 04</span>
                <h2>龙门币消耗与各级所需经验值之间是非线性关系</h2>
              </div>
              <div className={styles['rule-body']}>
                <div className={styles.formula}>
                  龙门币消耗 = Σ<sub>i</sub>(Δ经验<sub>i</sub> × X<sub>i</sub>)
                </div>
                <p>
                  【解释】从某一级升级到下一级所需的全部经验乘以龙门币消耗系数 X，计算得到从该级升级到下一级所需的龙门币数量。
                </p>
                <p>
                  【跨级别情况】升级所需龙门币 = 前一级部分经验 × 前一级系数 X1 + 后一级部分经验 × 后一级系数 X2。
                </p>
                <p>
                  具体公式介绍请参见NGA帖子：
                  <a
                    href="https://ngabbs.com/read.php?tid=16847042"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['external-link3']}
                  >
                    干员升级经验及龙门币消耗成本统计(收束测试)
                  </a>
                </p>
  
                <p>
                  在游戏中根据这个公式，每次升级计算出消耗的龙门币数量实际上带有小数（例如计算得到需要消耗 114.514 龙门币），但呈现给玩家的实际界面只显示且只消耗整数部分龙门币（实际消耗 114 龙门币）。
                </p>
                <p>
                  简单来说，就是会出现类似于“使用 1 次作战记录消耗 20 龙门币，而连续使用 2 次作战记录消耗 41 龙门币”的情况。
                </p>
                <p>
                  因此在查看计算得到的方案中，对于通过“使用作战记录”消耗龙门币的步骤，
                  请跟随步骤提示依次进行操作，防止因出现上述小数点问题导致发生误差。
                </p>
    
              </div>
            </article>
          </section>
        </div>
      </div>
    </>
  );
}

export default NotePage;
