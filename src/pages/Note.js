import React from "react";
import "../../src/assets/styles/Note.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";


const requireImages = require.context(
  "../assets/images/",
  false,
  /note\d+\.png$/
);
const images = [];
for (let i = 1; i <= 11; i++) {
  images.push(requireImages(`./note${i}.png`));
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
                1. 输入要求：两个非负整数（0 或正整数）
                <br />
                2. 差值限制：|数值1 - 数值2| ≤ 1000（当前版本限制）
                <br />
                3. 输入示例：
                <br />
                &nbsp;&nbsp;&nbsp;✓ 有效输入：300 与 800 | 500 与 500 | 0 与
                1000
                <br />
                &nbsp;&nbsp;&nbsp;✗ 无效输入：-50 | 1500 与 300 | 非整数
                <br />
                4. 系统处理：当输入超出有效范围时，将提示错误信息
                <br />
                ※备注：差值限制基于当前算法复杂度设定（v1.0.0），后续版本可能优化计算效率
              </div>
            </div>

            {/* 注意事项 2 */}
            <div className="notice-item">
              <div className="notice-title">使用作战记录的注意事项</div>
              <div className="notice-content">
                1.
                可以给干员同时使用多个作战记录，但是请注意不要让干员得到升级（即「跨级现象」）。
                <br />
                2.
                只使用一个作战记录时，如果发生跨级现象，则不需要考虑跨级影响，因为相关数据已经提前设定好了。
                <br />
                3. 龙门币消耗与经验计算公式：
                <br />
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
                  href="https://ngabbs.com/read.php?tid=16847042&rand=227"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  ​干员升级经验及龙门币消耗成本统计(收束测试)
                </a>
                <br />
                4.图片直观说明：
                <br />
                对于只使用一个作战记录时，发生跨级现象是正常的，不需要考虑跨级的影响，因为相关数据已经提前设定好了。
                <br />
                <div className="image-gallery">
                  <div className="image-item">
                    <img src={images[0]} alt="示例图片1" />
                    <span className="image-caption">初始值</span>
                  </div>
                  <div className="image-item">
                    <img src={images[1]} alt="示例图片2" />
                    <span className="image-caption">
                      只使用一个基础作战记录，发生正常的跨级现象
                    </span>
                  </div>
                  <div className="image-item">
                    <img src={images[2]} alt="示例图片3" />
                    <span className="image-caption">
                      只使用一个初级作战记录，发生正常的跨级现象
                    </span>
                  </div>
                </div>

                <br />
                对于只使用一个作战记录时，发生跨级现象是正常的，不需要考虑跨级的影响，因为相关数据已经提前设定好了。
                <br />
                <div className="image-gallery">
                  <div className="image-item">
                    <img src={images[6]} alt="示例图片1" />
                    <span className="image-caption">初始值</span>
                  </div>
                  <div className="image-item">
                    <img src={images[10]} alt="示例图片2" />
                    <span className="image-caption">
                      只使用一个初级作战记录，发生正常的跨级现象
                    </span>
                  </div>
                  <div className="image-item">
                    <img src={images[9]} alt="示例图片3" />
                    <span className="image-caption">
                      这里使用多个初级作战记录，发生跨级现象，导致误差
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 注意事项 3 - 带图片 */}
            <div className="notice-item">
              <div className="notice-title">使用原则</div>
              <div className="notice-content">
                1.
                单次使用多个记录时，需确保干员经验值不跨越等级阈值（即避免「升级临界」状态）。
                <br />
                2. 单记录使用时若触发升级，系统将自动应用预设的跨级补偿算法。
                <br />
                以下是示例图片：
                <br />

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotePage;
