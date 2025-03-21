import React from 'react';
import '../../src/assets/styles/About.css';
//import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HashRouter as Router, Link } from "react-router-dom";

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
    behavior: "smooth"
  });
};

function AboutPage() {
  return (
    <div className="app-container">
      <Sidebar />

      {/* 返回顶部按钮 */}
      <button className="back-to-top" onClick={scrollToTop}>
        ↑ 返回顶部
      </button>

      <div className="main-note-content">
        <div className="note-page">
          <h1>关于（测试阶段版本）</h1>

          <div className="notice-list">
            {/* 注意事项 1 */}
            <div className="notice-item">
              <div className="notice-title">关于版本v1.0</div>
              <div className="notice-content">
                1.
                本网页是作者入门前端三件套和react框架的一个练习项目，没有什么技术含量，存在不足之处，欢迎提出改进意见orz
                <br />
                2. 如果遇到问题，请通过B站私信反馈
                <a
                  href="https://space.bilibili.com/32772539"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  网页作者B站主页
                </a>
                <br />
                3. 网页源码：
                <a
                  href="https://github.com/parrotime/Arknights-LMD-Sum-calculator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  github项目源码
                </a>
                <br />
                4. 本网页中所有数据与图片均来自于
                <a
                  href="https://prts.wiki/w/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                 PRTS wiki 
                </a>
                官网，如有侵权，请联系删除。
                <br />
                5. 参考文献：
                <br />
                （1）
                <a
                  href="https://bbs.nga.cn/read.php?tid=21247901"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  公招需要花费龙门币时代的另一位作者的凑数计算器NGA帖子
                </a>
                ，也就是熟知的 https://cedric341561.gitee.io/777/
                （似乎已经失效）
                <br />
                （2）
                <a
                  href="https://ngabbs.com/read.php?tid=16847042"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  ​干员升级经验及龙门币消耗成本统计(收束测试)
                </a>
                <br />
              </div>

              <div className="notice-title">声明</div>
              <div className="notice-content">
                网页所涉及的游戏《明日方舟》相关的名称、数据、素材等均为其各自所有者的资产，仅供识别。
                <br />
                网页内使用的游戏图片素材、文本，仅用于介绍与说明，其版权均属于上海鹰角网络科技有限公司。
                <br />
                本项目为无偿开源项目，以便于明日方舟玩家能够凑出想要的龙门币数量，仅用于学习交流使用
                <br />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;