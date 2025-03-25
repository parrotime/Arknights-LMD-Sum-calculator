import React, { useState } from "react";
import "../../src/assets/styles/Note.css";
//import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";

const requireImages = require.context(
  "../assets/images/",
  false,
  /note\d+\.webp$/
);

const images = [];
for (let i = 1; i <= 14; i++) {
  images.push(requireImages(`./note${i}.webp`));
}

// Sidebar 组件保持不变
const Sidebar = () => (
  <div className="sidebar">
    <div className="sidebar-title">凑数计算器</div>
    <div className="sidebar-box">
      <Link to="/">计算主页</Link>
    </div>
    <div className="sidebar-box">
      <Link to="/note">注意事项</Link>
    </div>
    <div className="sidebar-box">
      <Link to="/data">数据部分</Link>
    </div>
    <div className="sidebar-box">
      <Link to="/about">关于</Link>
    </div>
  </div>
);

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

function NotePage() {

  const [zoomedImage, setZoomedImage] = useState(null); // 管理放大图片的状态

  // 点击图片时显示放大图片
  const handleImageClick = (imageSrc) => {
    setZoomedImage(imageSrc); // 设置当前放大的图片
  };

  // 点击遮罩层关闭放大图片
  const handleOverlayClick = () => {
    setZoomedImage(null); // 清除放大图片状态
  };

  return (
    <div className="app-container">
      <Sidebar />

      {/* 返回顶部按钮 */}
      <button className="back-to-top" onClick={scrollToTop}>
        ↑ 返回顶部
      </button>

      <div className="main-note-content">
        <div className="note-page">
          <h1>注意事项</h1>

          <div className="notice-list">
            {/* 注意事项 1 */}
            <div className="notice-item">
              <div className="notice-title">龙门币数值输入规范</div>
              <div className="notice-content">
                1. 输入要求：两个[0,99999999]之间的非负整数（0 或正整数）
                <br />
                2. 差值限制：|数值1 - 数值2| ≤ 5000（当前版本限制）
                <br />
                3. 系统处理：当输入超出有效范围时，将提示错误信息
                <br />
                ※备注：差值限制基于当前算法复杂度设定（v1.0），后续版本可能优化计算效率
              </div>
            </div>

            {/* 注意事项 2 */}
            <div className="notice-item">
              <div className="notice-title">使用作战记录的注意事项</div>
              <div className="notice-content">
                <h3>1.不要让干员升级</h3>
                可以给干员使用多个作战记录，但是请注意不要让干员得到升级（比方说给某精一40级干员使用一个作战记录后，再同时且连续使用一个作战记录导致干员升到精一41级，这是会产生误差的）。
                <br />
                <br />
                <h3>2.关于“允许连续多次对精零/一/二1级干员进行升级”开关</h3>
                当且仅当使用一个作战记录时,或者在设置区选择打开“允许连续多次对精零/一/二1级干员进行升级”的开关时，如果发生跨级现象，则不需要考虑跨级影响，因为相关数据已经提前设定好了。
                <br />
                这里考虑到实际情况，玩家可能并没有那么多精一1级干员和精二1级干员，因此这里设定了在每一条路径中，“允许连续多次对精零1级干员进行升级”步骤最多出现10次，“允许连续多次对精一1级干员进行升级”步骤最多出现5次，“允许连续多次对精二1级干员进行升级”步骤最多出现3次。
                <br />
                <br />
                <h3>3. 龙门币消耗与经验计算公式</h3>
                <div className="formula">
                  龙门币消耗 = Σ<sub>i</sub>(Δ经验<sub>i</sub> × X<sub>i</sub>)
                </div>
                解释：某级别升下一级所需的全部经验乘以 X ,
                即为该级别升到下一级所需的龙门币
                <br />
                跨级别的升级所需龙门币 = 前一级部分经验 × 前一级 X +
                后一级部分经验 × 后一级 X .
                <br />
                具体公式介绍请参见这个NGA帖子：
                <a
                  href="https://ngabbs.com/read.php?tid=16847042"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                干员升级经验及龙门币消耗成本统计(收束测试)
                </a>
                <br />
                <br />
                <h3>4.小数点问题</h3>
                在游戏中，每次升级计算所得消耗龙门币的数量其实是带小数的，但在实际游戏中只显示并且消耗了整数部分的龙门币。
                因此会出现例如“使用1次XX作战记录消耗20龙门币，连续使用2次XX作战记录消耗41（并不是20*2=40）龙门币”的误差情况。
                为了防止产生误差，本网页设计在一条路径中，对于通过“使用作战记录”消耗龙门币的步骤，每个步骤中只能同时使用
                1
                次，但同一条路径中可以出现多次该步骤。目的是提醒使用者，在消耗龙门币时，每个干员每次最好只使用一个作战记录，而不要同时连续使用。
                <br />
                <br />
                <h3>5.图片直观说明：</h3>
                对于只使用一个作战记录时，发生跨级现象是正常的，不需要考虑跨级的影响，因为相关数据已经提前设定好了。
                <br />
                例子解释1：假设本次计算路径中某个步骤是“通过【1】次使用【精零1级基础作战记录】，【花费】
                【61】个龙门币
                ”虽然使用后会升级到2级，但是这里的数据是提前设置好的，因此可以按照计算所得步骤，直接对干员使用1个绿色作战记录。
                <br />
                例子解释2：假设本次计算路径中某个步骤是“通过【1】次使用【精零1级初级作战记录】，【花费】
                【125】个龙门币
                ”虽然使用后会升级到4级，但是这里的数据是提前设置好的，因此可以按照计算所得步骤，直接对干员使用1个绿色作战记录。
                <br />
                <div className="image-gallery">
                  <div className="image-item">
                    <img
                      src={images[0]}
                      alt="示例图片1"
                      onClick={() => handleImageClick(images[0])}
                      style={{ cursor: "pointer" }}
                    />
                    <span className="image-caption">初始值</span>
                  </div>
                  <div className="image-item">
                    <img
                      src={images[1]}
                      alt="示例图片2"
                      onClick={() => handleImageClick(images[1])}
                      style={{ cursor: "pointer" }}
                    />
                    <span className="image-caption">
                      只使用一个基础作战记录，发生正常的跨级现象
                    </span>
                  </div>
                  <div className="image-item">
                    <img
                      src={images[2]}
                      alt="示例图片3"
                      onClick={() => handleImageClick(images[2])}
                      style={{ cursor: "pointer" }}
                    />
                    <span className="image-caption">
                      只使用一个初级作战记录，发生正常的跨级现象
                    </span>
                  </div>
                </div>
                <br />
                对于同时使用多个作战记录时，如果发生跨级现象，那么这会引起误差。
                <br />
                例子解释：假设本次计算路径中某个步骤是
                <br />
                “通过【1】次使用【精一15级初级作战记录】，【花费】
                【222】个龙门币 ”<br />
                这里按照计算所得步骤只使用1个15级初级作战记录，消耗222个龙门币。
                <br />
                <br />
                但是假设某次计算路径中出现有两个相同的步骤，例如
                <br />
                “步骤一：通过【1】次使用【精一15级初级作战记录】，【花费】
                【222】个龙门币 ”
                <br />
                “步骤二：通过【1】次使用【精一15级初级作战记录】，【花费】
                【222】个龙门币 ”
                <br />
                这个时候就不要图方便，逮着同一个干员连续使用2个初级作战记录，因为这样会导致干员从15级升到16级，花费的龙门币从预期的222*2=444变为445，产生了误差。
                所以这时候最好是找2个精一15级的干员各使用1个初级作战记录，这样能保证最终消耗的龙门币数量是222*2=444。
                <br />
                <div className="image-gallery">
                  <div className="image-item">
                    <img
                      src={images[6]}
                      alt="示例图片1"
                      onClick={() => handleImageClick(images[6])}
                      style={{ cursor: "pointer" }}
                    />
                    <span className="image-caption">初始值</span>
                  </div>
                  <div className="image-item">
                    <img
                      src={images[10]}
                      alt="示例图片2"
                      onClick={() => handleImageClick(images[10])}
                      style={{ cursor: "pointer" }}
                    />
                    <span className="image-caption">
                      只使用一个初级作战记录，没有发生跨级现象
                    </span>
                  </div>
                  <div className="image-item">
                    <img
                      src={images[9]}
                      alt="示例图片3"
                      onClick={() => handleImageClick(images[9])}
                      style={{ cursor: "pointer" }}
                    />
                    <span className="image-caption">
                      这里使用多个初级作战记录，发生跨级现象，导致误差（从15级跳到了16级）
                    </span>
                  </div>
                </div>
                <br />
                当使用1个作战记录时，假设会消耗A龙门币，但是
                当连续使用N个作战记录，有时候并不是对应消耗N*A个龙门币，
                
                <br />
                因此作者提前设置在同一条路径中每个关于“使用作战记录”的步骤只会使用1次，但是这个步骤会重复出现，以此提醒每次只同时使用1个作战记录，不要连续使用。不要为了图方便同时连续使用多个作战记录
                <br />
                <div className="image-gallery">
                  <div className="image-item">
                    <img
                      src={images[11]}
                      alt="示例图片1"
                      onClick={() => handleImageClick(images[11])}
                      style={{ cursor: "pointer" }}
                    />
                    <span className="image-caption">
                      只使用1个基础作战记录，消耗188数量的龙门币
                    </span>
                  </div>
                  <div className="image-item">
                    <img
                      src={images[12]}
                      alt="示例图片2"
                      onClick={() => handleImageClick(images[12])}
                      style={{ cursor: "pointer" }}
                    />
                    <span className="image-caption">
                      连续使用2个基础作战记录，消耗376数量的龙门币
                    </span>
                  </div>
                  <div className="image-item">
                    <img
                      src={images[13]}
                      alt="示例图片3"
                      onClick={() => handleImageClick(images[13])}
                      style={{ cursor: "pointer" }}
                    />
                    <span className="image-caption">
                      连续使用3个基础作战记录，消耗563数量的龙门币，并不是预期的188*3=562个龙门币
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 注意事项 3 - 带图片 */}
            <div className="notice-item">
              <div className="notice-title">orz</div>
              <div className="notice-content"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 遮罩层，用于显示放大图片 */}
      {zoomedImage && (
        <div className="image-overlay" onClick={handleOverlayClick}>
          <img src={zoomedImage} alt="放大图片" className="zoomed-image" />
        </div>
      )}
    </div>
  );
}

export default NotePage;
