import React, { useCallback } from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", text: "计算主页" },
  { to: "/note", text: "注意事项" },
  { to: "/data", text: "数据部分" },
  { to: "/about", text: "关于" },
];

const Layout = ({ children }) => {
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-title">凑数计算器</div>
        {navItems.map(({ to, text }) => (
          <div className="sidebar-box" key={to}>
            <NavLink to={to} end={to === "/"}>
              {text}
            </NavLink>
          </div>
        ))}
      </div>

      <button className="back-to-top" onClick={scrollToTop}>
        ↑ 返回顶部
      </button>

      {children}

      <div className="footer">
        <a target="_blank" rel="noreferrer noopener" className="footer-link">
          鄂ICP备2025105560号-1
        </a>
        <a className="footer-link">
          © 2025 龙门币凑数计算器（https://ark-lmd.top）
        </a>
      </div>
    </div>
  );
};

export default Layout;
