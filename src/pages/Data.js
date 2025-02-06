import React from 'react';
import '../../src/assets/styles/Data.css';
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

  
function DataPage() {
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



    <div className='main-data-content'>
      <div className="data-page">
        <h1>数据部分</h1>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
        <p>这里是数据部分的内容。</p>
      </div>

    </div>


    </div>
    

  );
}

export default DataPage;