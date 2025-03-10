import React from 'react';
import '../../src/assets/styles/About.css';
//import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";

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
              <div className="notice-title">关于版本v1.0.0</div>
              <div className="notice-content">
                1.
                本网站是网站作者入门前端三件套和react的一个练习项目，仍存在不足之处，欢迎提出改进意见。
                <br />
                2. 如果遇到问题，请通过B站私信反馈
                <a
                  href="https://space.bilibili.com/32772539"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  网站作者B站主页
                </a>
                <br />
                3. 网站源码：
                <a
                  href="https://space.bilibili.com/32772539"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  网站作者github项目页面？？？？？？？
                </a>
                <br />
                4. 本网站中所有数据与图片均来自于官网，如有侵权，请联系删除。
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
                ，也就是熟知的 https://cedric341561.gitee.io/777/ （现已失效）
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
                ※备注：差值限制基于当前算法复杂度设定（v1.0.0），后续版本可能优化计算效率
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;