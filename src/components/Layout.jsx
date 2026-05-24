import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import ClickCursor from "./ClickCursor";
import { useCursorState } from "./CursorContext";
import FloatingAssistant from "./FloatingAssistant";

const navItems = [
  { to: "/", text: "计算主页" },
  { to: "/note", text: "注意事项" },
  { to: "/data", text: "数据部分" },
  { to: "/about", text: "关于" },
];

const loadTheme = () => {
  const saved = localStorage.getItem("theme");
  return saved ? saved === "dark" : true;
};

const Layout = ({ children, assistantEgg, onAssistantEggClose }) => {
  const { isCalculating } = useCursorState();
  const [dark, setDark] = useState(loadTheme);
  const [themeToggleAnimating, setThemeToggleAnimating] = useState(false);
  const location = useLocation();
  const isMaintenancePage = location.pathname.startsWith("/maintenance");
  const isAdminDashboardPage = location.pathname.startsWith("/admin-dashboard");
  const navLinksRef = useRef(null);
  const navItemRefs = useRef({});
  const [navIndicator, setNavIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const updateNavIndicator = useCallback(() => {
    const container = navLinksRef.current;
    if (!container) return;

    const activeItem = navItems.find(({ to }) =>
      to === "/" ? location.pathname === "/" : location.pathname.startsWith(to)
    );
    const activeNode = activeItem ? navItemRefs.current[activeItem.to] : null;
    if (!activeNode) {
      setNavIndicator(prev => prev.ready ? { ...prev, ready: false } : prev);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const itemRect = activeNode.getBoundingClientRect();
    const sideInset = 18;
    const next = {
      left: itemRect.left - containerRect.left + sideInset,
      width: Math.max(itemRect.width - sideInset * 2, 0),
      ready: true,
    };

    setNavIndicator(prev =>
      prev.left === next.left && prev.width === next.width && prev.ready === next.ready
        ? prev
        : next
    );
  }, [location.pathname]);

  useLayoutEffect(() => {
    updateNavIndicator();
  }, [updateNavIndicator]);

  useEffect(() => {
    const onResize = () => updateNavIndicator();
    window.addEventListener("resize", onResize);
    document.fonts?.ready?.then(updateNavIndicator);
    return () => window.removeEventListener("resize", onResize);
  }, [updateNavIndicator]);

  const handleThemeToggle = useCallback(() => {
    setThemeToggleAnimating(false);
    requestAnimationFrame(() => setThemeToggleAnimating(true));
    setDark(d => !d);
  }, []);

  return (
    <div className="app-container">
      <ClickCursor isCalculating={isCalculating} />
      <nav className="top-nav">
        <div className="nav-inner">
          <div className="nav-brand">
            <img src="/LMD.webp" alt="龙门币" className="nav-brand-icon" />
            龙门币凑数计算器
          </div>
          <div className="nav-links" ref={navLinksRef}>
            {navItems.map(({ to, text }) => (
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                aria-label={`前往${text}`}
                ref={(node) => {
                  if (node) navItemRefs.current[to] = node;
                  else delete navItemRefs.current[to];
                }}
                key={to}
              >
                {text}
              </NavLink>
            ))}
            <span
              className={`nav-indicator${navIndicator.ready ? " ready" : ""}`}
              style={{
                width: navIndicator.width,
                transform: `translateX(${navIndicator.left}px)`,
              }}
              aria-hidden="true"
            />
          </div>
          <button
            className="theme-toggle"
            onClick={handleThemeToggle}
            aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
            title={dark ? "浅色模式" : "深色模式"}
          >
            <img
              className={`theme-toggle-icon ${dark ? "theme-toggle-icon-day" : "theme-toggle-icon-night"} ${themeToggleAnimating ? "theme-toggle-icon-active" : ""}`}
              src={
                dark
                  ? "https://ark-lmd.oss-cn-beijing.aliyuncs.com/day_mod.webp"
                  : "https://ark-lmd.oss-cn-beijing.aliyuncs.com/night_mod.webp"
              }
              alt=""
              aria-hidden="true"
              onAnimationEnd={() => setThemeToggleAnimating(false)}
            />
          </button>
        </div>
      </nav>

      {!isMaintenancePage && !isAdminDashboardPage && (
        <FloatingAssistant
          assistantEgg={assistantEgg}
          onAssistantEggClose={onAssistantEggClose}
        />
      )}

      {children}

      <div className="footer">
        <a target="_blank" rel="noreferrer noopener" className="footer-link">
          鄂ICP备2025105560号-1
        </a>
        <a className="footer-link">
          © 2025~2026 龙门币凑数计算器（https://ark-lmd.top）
        </a>
      </div>
    </div>
  );
};

export default Layout;
