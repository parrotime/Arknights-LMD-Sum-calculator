import React, { useState } from "react";
import styles from "../assets/styles/Note.module.css";

const imageGroups = [
  {
    code: "CASE 01",
    title: "单个作战记录发生跨级",
    summary: "只使用一个作战记录时，发生跨级现象是正常情况，相关数据已经提前设定。",
    images: [
      {
        src: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note1.webp",
        zoom: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note3.webp",
        caption: "初始值",
      },
      {
        src: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note2.webp",
        zoom: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note3.webp",
        caption: "只使用一个基础作战记录，发生正常的跨级现象",
      },
      {
        src: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note3.webp",
        zoom: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note3.webp",
        caption: "只使用一个初级作战记录，发生正常的跨级现象",
      },
    ],
  },
  {
    code: "CASE 02",
    title: "连续使用导致跨级误差",
    summary: "如果对同一个干员连续使用多个作战记录，可能因为跨级导致实际龙门币消耗与预期不同。",
    images: [
      {
        src: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note7.webp",
        zoom: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note7.webp",
        caption: "初始值",
      },
      {
        src: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note11.webp",
        zoom: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note11.webp",
        caption: "只使用一个初级作战记录，没有发生跨级现象",
      },
      {
        src: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note10.webp",
        zoom: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note10.webp",
        caption: "连续对同一干员使用多个初级作战记录，发生跨级现象",
      },
    ],
  },
  {
    code: "CASE 03",
    title: "小数累计导致消耗偏差",
    summary: "游戏内实际存在小数计算，但界面只显示整数部分，因此 N 次使用不一定等于 N × 单次消耗。",
    images: [
      {
        src: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note12.webp",
        zoom: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note12.webp",
        caption: "只使用 1 个基础作战记录，消耗 188 龙门币",
      },
      {
        src: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note13.webp",
        zoom: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note13.webp",
        caption: "连续使用 2 个基础作战记录，消耗 376 龙门币",
      },
      {
        src: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note14.webp",
        zoom: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note14.webp",
        caption: "连续使用 3 个基础作战记录，消耗 563 龙门币",
      },
    ],
  },
];

function NotePage() {
  const [zoomedImage, setZoomedImage] = useState(null);

  const handleImageClick = (imageSrc) => {
    setZoomedImage(imageSrc);
  };

  const handleOverlayClick = () => {
    setZoomedImage(null);
  };

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
                  1. 输入要求：两个[0,99999999]之间的整数
                  <br />
                  2. 差值限制：|数值1 - 数值2| ≤ 5000（当前版本限制）
                </p>
              </div>
            </article>

            <article className={styles['rule-card']}>
              <div className={styles['rule-header']}>
                <span className={styles['rule-code']}>NOTE 02</span>
                <h2>一般情况下不要让干员升级</h2>
              </div>
              <div className={styles['rule-body']}>
                <p>
                  可以给干员使用多个作战记录，但是请注意不要让干员得到升级。
                </p>
                <p>
                  例如给某”精一40级”干员使用一个作战记录后，再同时且连续使用一个作战记录导致干员升到”精一41级”，这是会产生误差的，
                  关于这个误差的形成原因可参见下面的详细介绍。
                </p>
              </div>
            </article>

            <article className={styles['rule-card']}>
              <div className={styles['rule-header']}>
                <span className={styles['rule-code']}>NOTE 03</span>
                <h2>关于”允许连续多次对精零/一/二1级干员进行升级”开关</h2>
              </div>
              <div className={styles['rule-body']}>
                <p>
                  在右侧设置区选择打开”允许连续多次对精零/一/二1级干员进行升级”的开关时，如果发生跨级现象，则不需要考虑跨级影响，因为相关数据已经提前设定好了。
                </p>
                <p>
                  这里考虑到实际情况，玩家可能并没有那么多精一1级干员和精二1级干员，因此可以在左侧面板对应位置输入数据对使用数量进行限制，当然也可以空着不填，这种情况下默认最多出现10次，即
                  “允许连续多次对精零1级干员进行升级”步骤，”允许连续多次对精一1级干员进行升级”步骤和”允许连续多次对精二1级干员进行升级”步骤分别最多使用10次。
                </p>
              </div>
            </article>

            <article className={styles['rule-card']}>
              <div className={styles['rule-header']}>
                <span className={styles['rule-code']}>NOTE 04</span>
                <h2>龙门币消耗与经验计算公式</h2>
              </div>
              <div className={styles['rule-body']}>
                <div className={styles.formula}>
                  龙门币消耗 = Σ<sub>i</sub>(Δ经验<sub>i</sub> × X<sub>i</sub>)
                </div>
                <p>
                  解释：某级别升下一级所需的全部经验乘以 X，即为该级别升到下一级所需的龙门币。
                </p>
                <p>
                  跨级别的升级所需龙门币 = 前一级部分经验 × 前一级 X1 + 后一级部分经验 × 后一级 X2。
                </p>
                <p>
                  具体公式介绍可参考：
                  <a
                    href="https://ngabbs.com/read.php?tid=16847042"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['external-link3']}
                  >
                    干员升级经验及龙门币消耗成本统计(收束测试)
                  </a>
                </p>
              </div>
            </article>
          </section>

          <section className={styles['case-section']} aria-label="案例说明">
            <div className={styles['section-title']}>
              <span>案例说明</span>
              <small>CASE FILES</small>
            </div>

            <article className={styles['case-intro']}>
              <p>
                游戏中每次升级计算所得消耗龙门币其实带有小数，但实际界面只显示并消耗整数部分。
                因此会出现“使用 1 次作战记录消耗 20 龙门币，连续使用 2 次作战记录消耗 41 龙门币”的情况。
              </p>
              <p>
                为了防止产生误差，本网页在同一条路径中，对于通过
                ”使用作战记录”消耗龙门币的步骤，每个步骤中只能同时使用 1 次，但同一条路径中可以出现多次该步骤。
              </p>
            </article>

            {imageGroups.map((group) => (
              <article className={styles['case-card']} key={group.code}>
                <div className={styles['case-copy']}>
                  <span className={styles['case-code']}>{group.code}</span>
                  <h2>{group.title}</h2>
                  <p>{group.summary}</p>
                </div>
                <div className={styles['image-gallery']}>
                  {group.images.map((image) => (
                    <button
                      className={styles['image-item']}
                      type="button"
                      key={image.src}
                      onClick={() => handleImageClick(image.zoom)}
                    >
                      <img src={image.src} alt={image.caption} loading="lazy" />
                      <span className={styles['image-caption']}>{image.caption}</span>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>

      {zoomedImage && (
        <div className={styles['image-overlay']} onClick={handleOverlayClick}>
          <img src={zoomedImage} alt="放大图片" className={styles['zoomed-image']} />
        </div>
      )}
    </>
  );
}

export default NotePage;
