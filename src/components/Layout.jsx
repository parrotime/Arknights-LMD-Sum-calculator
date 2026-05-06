import React, { useCallback, useState, useEffect, useLayoutEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import ClickCursor from "./ClickCursor";
import { useCursorState } from "./CursorContext";

const navItems = [
  { to: "/", text: "计算主页" },
  { to: "/note", text: "注意事项" },
  { to: "/data", text: "数据部分" },
  { to: "/about", text: "关于" },
];

const DRAG_THRESHOLD = 5;

const getDefaultPos = () => ({
  x: window.innerWidth - 24 - 64,
  y: window.innerHeight - 24 - 64,
});

const loadBtnPos = () => {
  try {
    const saved = localStorage.getItem("scrollBtnPos");
    if (saved) {
      const pos = JSON.parse(saved);
      if (typeof pos.x === "number" && typeof pos.y === "number") return pos;
    }
  } catch {}
  return null;
};

const loadTheme = () => {
  const saved = localStorage.getItem("theme");
  return saved ? saved === "dark" : true;
};

const Layout = ({ children }) => {
  const { isCalculating } = useCursorState();
  const [dark, setDark] = useState(loadTheme);
  const location = useLocation();
  const navLinksRef = useRef(null);
  const navItemRefs = useRef({});
  const [navIndicator, setNavIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const [scrollDir, setScrollDir] = useState("down");

  const updateNavIndicator = useCallback(() => {
    const container = navLinksRef.current;
    if (!container) return;

    const activeItem = navItems.find(({ to }) =>
      to === "/" ? location.pathname === "/" : location.pathname.startsWith(to)
    );
    const activeNode = activeItem ? navItemRefs.current[activeItem.to] : null;
    if (!activeNode) return;

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

  // 拖拽逻辑
  const btnRef = useRef(null);
  const dragState = useRef(null);
  const [btnPos, setBtnPos] = useState(() => loadBtnPos() || getDefaultPos());
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  // 窗口resize时把按钮限制在可视区内
  useEffect(() => {
    const onResize = () => {
      setBtnPos(prev => {
        const btn = btnRef.current;
        const w = btn ? btn.offsetWidth : 120;
        const h = btn ? btn.offsetHeight : 40;
        const x = Math.min(Math.max(prev.x, 0), window.innerWidth - w);
        const y = Math.min(Math.max(prev.y, 0), window.innerHeight - h);
        return { x, y };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    const btn = btnRef.current;
    if (!btn) return;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      originX: btnPos.x,
      originY: btnPos.y,
    };
    isDraggingRef.current = false;
    btn.setPointerCapture(e.pointerId);
  }, [btnPos]);

  const onPointerMove = useCallback((e) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (!isDraggingRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      isDraggingRef.current = true;
      setIsDragging(true);
    }
    if (!isDraggingRef.current) return;
    const btn = btnRef.current;
    const w = btn ? btn.offsetWidth : 120;
    const h = btn ? btn.offsetHeight : 40;
    const x = Math.min(Math.max(dragState.current.originX + dx, 0), window.innerWidth - w);
    const y = Math.min(Math.max(dragState.current.originY + dy, 0), window.innerHeight - h);
    setBtnPos({ x, y });
  }, []);

  const resetPointerDrag = useCallback((e, shouldClick = false) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const pointerId = dragState.current.pointerId;
    dragState.current = null;
    const btn = btnRef.current;
    if (btn?.hasPointerCapture?.(pointerId)) {
      btn.releasePointerCapture(pointerId);
    }

    if (shouldClick && Math.hypot(dx, dy) <= DRAG_THRESHOLD) {
      handleScrollBtn();
    } else {
      setBtnPos(prev => {
        localStorage.setItem("scrollBtnPos", JSON.stringify(prev));
        return prev;
      });
    }
    isDraggingRef.current = false;
    setIsDragging(false);
  }, [handleScrollBtn]);

  const onPointerUp = useCallback((e) => {
    resetPointerDrag(e, true);
  }, [resetPointerDrag]);

  const onPointerCancel = useCallback((e) => {
    resetPointerDrag(e, false);
  }, [resetPointerDrag]);

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
            onClick={() => setDark(d => !d)}
            aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
            title={dark ? "浅色模式" : "深色模式"}
          >
            <img
              className="theme-toggle-icon"
              src={
                dark
                  ? "https://ark-lmd.oss-cn-beijing.aliyuncs.com/day_mod.webp"
                  : "https://ark-lmd.oss-cn-beijing.aliyuncs.com/night_mod.webp"
              }
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
      </nav>

      <button
        ref={btnRef}
        className={`back-to-top${isDragging ? " dragging" : ""}`}
        style={{ left: btnPos.x, top: btnPos.y }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        title="可拖动"
      >
        {scrollDir === "down" ? <><span>前往</span><span>底部</span></> : <><span>返回</span><span>顶部</span></>}
      </button>

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
