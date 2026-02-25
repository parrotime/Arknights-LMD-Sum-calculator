import React, { useCallback, useState, useEffect } from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", text: "计算主页" },
  { to: "/note", text: "注意事项" },
  { to: "/data", text: "数据部分" },
  { to: "/about", text: "关于" },
];

const Layout = ({ children }) => {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const [scrollDir, setScrollDir] = useState("down");

  useEffect(() => {
    const onScroll = () => {
      const threshold = window.innerHeight * 0.5;
      setScrollDir(window.scrollY < threshold ? "down" : "up");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleScrollBtn = useCallback(() => {
    if (scrollDir === "down") {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [scrollDir]);

  return (
    <div className="app-container">
      <nav className="top-nav">
        <div className="nav-inner">
          <div className="nav-brand">
            <img src="/LMD.webp" alt="龙门币" className="nav-brand-icon" />
            龙门币凑数计算器
          </div>
          <div className="nav-links">
            {navItems.map(({ to, text }) => (
              <NavLink to={to} end={to === "/"} className="nav-item" key={to}>
                {text}
              </NavLink>
            ))}
          </div>
          <button
            className="theme-toggle"
            onClick={() => setDark(d => !d)}
            aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
            title={dark ? "浅色模式" : "深色模式"}
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </nav>

      <button className="back-to-top" onClick={handleScrollBtn}>
        {scrollDir === "down" ? "↓ 前往底部" : "↑ 返回顶部"}
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
