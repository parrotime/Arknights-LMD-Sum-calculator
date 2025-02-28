import React from 'react';
import '../../src/assets/styles/About.css';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

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
      <button 
        className="back-to-top"
        onClick={scrollToTop}
      >
        ↑ 返回顶部
      </button>


    <div className='main-note-content'>
      <div className="about-page">
        <h1>注意事项</h1>
        <ul>
          <li>请确保输入的数字在 0 到 1000 之间。</li>
          <li>计算结果可能会受到算法限制，请参考路径提示。</li>
          <li>如果步数过多，请尝试调整输入值。</li>

        </ul>

      </div>
    </div>
</div>
  );
}

export default AboutPage;