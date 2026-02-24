import React, { useState } from "react";
import styles from "../assets/styles/Note.module.css";

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
          <h1>注意事项</h1>

          <div className={styles['notice-list']}>
            <div className={styles['notice-item']}>
              <div className={styles['notice-title']}>龙门币数值输入规范</div>
              <div className={styles['notice-content']}>
                1. 输入要求：两个[0,99999999]之间的整数
                <br />
                2. 差值限制：|数值1 - 数值2| ≤ 5000（当前版本限制）
              </div>
            </div>

            <div className={styles['notice-item']}>
              <div className={styles['notice-title']}>一般情况下不要让干员升级</div>
              <div className={styles['notice-content']}>
                <p>
                  可以给干员使用多个作战记录，但是请注意不要让干员得到升级。
                </p>
                <p>
                  例如给某”精一40级”干员使用一个作战记录后，再同时且连续使用一个作战记录导致干员升到”精一41级”，这是会产生误差的，
                  关于这个误差的形成原因可参见下面的详细介绍。
                </p>
              </div>
            </div>

            <div className={styles['notice-item']}>
              <div className={styles['notice-title']}>关于”允许连续多次对精零/一/二1级干员进行升级”开关</div>
              <div className={styles['notice-content']}>
                <p>
                  在右侧设置区选择打开”允许连续多次对精零/一/二1级干员进行升级”的开关时，如果发生跨级现象，则不需要考虑跨级影响，因为相关数据已经提前设定好了。
                </p>
                <p>
                  这里考虑到实际情况，玩家可能并没有那么多精一1级干员和精二1级干员，因此可以在左侧面板对应位置输入数据对使用数量进行限制，当然也可以空着不填，这种情况下默认最多出现10次，即
                  “允许连续多次对精零1级干员进行升级”步骤，”允许连续多次对精一1级干员进行升级”步骤和”允许连续多次对精二1级干员进行升级”步骤分别最多使用10次。
                </p>
              </div>
            </div>

            <div className={styles['notice-item']}>
              <div className={styles['notice-title']}>龙门币消耗与经验计算公式</div>
              <div className={styles['notice-content']}>
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
                  具体公式介绍请参见这个NGA帖子：
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
            </div>

            <div className={styles['notice-item']}>
              <div className={styles['notice-title']}>小数点问题与图片说明</div>
              <div className={styles['notice-content']}>
                <p>
                  在游戏中，每次升级计算所得消耗龙门币的数量其实是带小数的，但在实际游戏中只显示并且消耗了整数部分的龙门币。
                  因此会出现例如”使用1次XX作战记录消耗20龙门币，连续使用2次XX作战记录消耗41（并不是20*2=40）龙门币”的误差情况。
                  为了防止产生误差，本网页设计在一条路径中，对于通过”使用作战记录”消耗龙门币的步骤，每个步骤中只能同时使用
                  1次，但同一条路径中可以出现多次该步骤。目的是提醒在消耗龙门币时，每个干员每次最好只使用一个作战记录，而不要同时连续使用。
                </p>
                <p>
                  对于只使用一个作战记录时，发生跨级现象是正常的，不需要考虑跨级的影响，因为相关数据已经提前设定好了。
                </p>
                <p>
                  例子解释1：假设本次计算路径中某个步骤是”通过【1】次使用【精零1级基础作战记录】，【花费】【61】个龙门币”
                  虽然使用后会升级到2级，但是这里的数据是提前设置好的，因此可以按照计算所得步骤，直接对干员使用1个绿色作战记录。
                </p>
                <p>
                  例子解释2：假设本次计算路径中某个步骤是”通过【1】次使用【精零1级初级作战记录】，【花费】【125】个龙门币”
                  虽然使用后会升级到4级，但是这里的数据是提前设置好的，因此可以按照计算所得步骤，直接对干员使用1个绿色作战记录。
                </p>
                <div className={styles['image-gallery']}>
                  <div className={styles['image-item']}>
                    <img
                      src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/note1.webp"
                      alt="示例图片1"
                      onClick={() =>
                        handleImageClick(
                          "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note3.webp"
                        )
                      }
                      loading="lazy" style={{ cursor: "pointer" }}
                    />
                    <span className={styles['image-caption']}>初始值</span>
                  </div>
                  <div className={styles['image-item']}>
                    <img
                      src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/note2.webp"
                      alt="示例图片2"
                      onClick={() =>
                        handleImageClick(
                          "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note3.webp"
                        )
                      }
                      loading="lazy" style={{ cursor: "pointer" }}
                    />
                    <span className={styles['image-caption']}>
                      只使用一个基础作战记录，发生正常的跨级现象
                    </span>
                  </div>
                  <div className={styles['image-item']}>
                    <img
                      src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/note3.webp"
                      alt="示例图片3"
                      onClick={() =>
                        handleImageClick(
                          "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note3.webp"
                        )
                      }
                      loading="lazy" style={{ cursor: "pointer" }}
                    />
                    <span className={styles['image-caption']}>
                      只使用一个初级作战记录，发生正常的跨级现象
                    </span>
                  </div>
                </div>
                <p>
                  对于同时使用多个作战记录时，如果发生跨级现象，那么这会引起误差。
                </p>
                <p>
                  例子解释：假设本次计算路径中某个步骤是”通过【1】次使用【精一15级初级作战记录】，【花费】【222】个龙门币”，这里按照计算所得步骤只使用1个15级初级作战记录，消耗222个龙门币。
                </p>
                <p>
                  但是假如某次计算路径中出现有两个相同的步骤，例如”步骤一：通过【1】次使用【精一15级初级作战记录】，【花费】【222】个龙门币”和”步骤二：通过【1】次使用【精一15级初级作战记录】，【花费】【222】个龙门币”，
                  这个时候就不要图方便，逮着同一个干员连续使用2个初级作战记录，因为这样会导致干员从15级升到16级，花费的龙门币从预期的222*2=444变为445，产生了误差。
                  所以这时候最好是找2个精一15级的干员各使用1个初级作战记录，这样能保证最终消耗的龙门币数量是222*2=444。
                </p>
                <div className={styles['image-gallery']}>
                  <div className={styles['image-item']}>
                    <img
                      src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/note7.webp"
                      alt="示例图片1"
                      onClick={() =>
                        handleImageClick(
                          "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note7.webp"
                        )
                      }
                      loading="lazy" style={{ cursor: "pointer" }}
                    />
                    <span className={styles['image-caption']}>初始值</span>
                  </div>
                  <div className={styles['image-item']}>
                    <img
                      src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/note11.webp"
                      alt="示例图片2"
                      onClick={() =>
                        handleImageClick(
                          "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note11.webp"
                        )
                      }
                      loading="lazy" style={{ cursor: "pointer" }}
                    />
                    <span className={styles['image-caption']}>
                      只使用一个初级作战记录，没有发生跨级现象
                    </span>
                  </div>
                  <div className={styles['image-item']}>
                    <img
                      src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/note10.webp"
                      alt="示例图片3"
                      onClick={() =>
                        handleImageClick(
                          "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note10.webp"
                        )
                      }
                      loading="lazy" style={{ cursor: "pointer" }}
                    />
                    <span className={styles['image-caption']}>
                      这里连续对同一干员使用多个初级作战记录，发生跨级现象，导致误差（从15级跳到了16级）
                    </span>
                  </div>
                </div>
                <p>
                  当使用1个作战记录时，假设会消耗A龙门币，但是当连续使用N个作战记录，有时候并不是对应消耗N*A个龙门币。
                </p>
                <p>
                  因此作者提前设置在同一条路径中每个关于”使用作战记录”的步骤只会使用1次，但是这个步骤会重复出现，以此提醒每次只同时使用1个作战记录，不要连续使用。
                  不要为了图方便对同一干员同时连续使用多个作战记录。
                </p>
                <div className={styles['image-gallery']}>
                  <div className={styles['image-item']}>
                    <img
                      src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/note12.webp"
                      alt="示例图片1"
                      onClick={() =>
                        handleImageClick(
                          "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note12.webp"
                        )
                      }
                      loading="lazy" style={{ cursor: "pointer" }}
                    />
                    <span className={styles['image-caption']}>
                      只使用1个基础作战记录，消耗188数量的龙门币
                    </span>
                  </div>
                  <div className={styles['image-item']}>
                    <img
                      src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/note13.webp"
                      alt="示例图片2"
                      onClick={() =>
                        handleImageClick(
                          "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note13.webp"
                        )
                      }
                      loading="lazy" style={{ cursor: "pointer" }}
                    />
                    <span className={styles['image-caption']}>
                      连续使用2个基础作战记录，消耗376数量的龙门币
                    </span>
                  </div>
                  <div className={styles['image-item']}>
                    <img
                      src="https://ark-lmd.oss-cn-beijing.aliyuncs.com/note14.webp"
                      alt="示例图片3"
                      onClick={() =>
                        handleImageClick(
                          "https://ark-lmd.oss-cn-beijing.aliyuncs.com/note14.webp"
                        )
                      }
                      loading="lazy" style={{ cursor: "pointer" }}
                    />
                    <span className={styles['image-caption']}>
                      连续使用3个基础作战记录，消耗563数量的龙门币，并不是预期的188*3=562个龙门币
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles['notice-item']}>
              <div className={styles['notice-title']}>orz</div>
              <div className={styles['notice-content']}></div>
            </div>
          </div>
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
