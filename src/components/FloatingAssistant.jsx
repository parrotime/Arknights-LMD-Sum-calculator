import React, { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD = 5;
const BUTTON_SIZE = 64;
const BUBBLE_WIDTH = 252;
const BUBBLE_GAP = 14;

const getDefaultPos = () => ({
  x: window.innerWidth - 24 - BUTTON_SIZE,
  y: window.innerHeight - 24 - BUTTON_SIZE,
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

const FloatingAssistant = ({ assistantEgg, onAssistantEggClose }) => {
  const [scrollDir, setScrollDir] = useState("down");
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [assistantClosing, setAssistantClosing] = useState(false);
  const assistantClosingRef = useRef(false);

  const btnRef = useRef(null);
  const dragState = useRef(null);
  const [btnPos, setBtnPos] = useState(() => loadBtnPos() || getDefaultPos());
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      const threshold = window.innerHeight * 0.5;
      setScrollDir(window.scrollY < threshold ? "down" : "up");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeAssistantBubble = useCallback(() => {
    if (!assistantEgg || assistantClosingRef.current) return;
    assistantClosingRef.current = true;
    setAssistantClosing(true);
    window.setTimeout(() => {
      setAssistantVisible(false);
      setAssistantClosing(false);
      assistantClosingRef.current = false;
      onAssistantEggClose?.();
    }, 320);
  }, [assistantEgg, onAssistantEggClose]);

  useEffect(() => {
    if (!assistantEgg) {
      setAssistantVisible(false);
      setAssistantClosing(false);
      assistantClosingRef.current = false;
      return undefined;
    }

    setAssistantVisible(true);
    setAssistantClosing(false);
    assistantClosingRef.current = false;
    const timer = window.setTimeout(() => {
      closeAssistantBubble();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [assistantEgg, closeAssistantBubble]);

  const handleScrollBtn = useCallback(() => {
    if (scrollDir === "down") {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [scrollDir]);

  useEffect(() => {
    const onResize = () => {
      setBtnPos(prev => {
        const btn = btnRef.current;
        const w = btn ? btn.offsetWidth : BUTTON_SIZE;
        const h = btn ? btn.offsetHeight : BUTTON_SIZE;
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
    const w = btn ? btn.offsetWidth : BUTTON_SIZE;
    const h = btn ? btn.offsetHeight : BUTTON_SIZE;
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

  const bubblePlacement = btnPos.x + BUTTON_SIZE + BUBBLE_GAP + BUBBLE_WIDTH > window.innerWidth
    ? "left"
    : "right";
  const assistantBubbleStyle = {
    top: Math.min(Math.max(btnPos.y - 112, 72), Math.max(window.innerHeight - 260, 72)),
    left: bubblePlacement === "right"
      ? btnPos.x + BUTTON_SIZE + BUBBLE_GAP
      : Math.max(btnPos.x - BUBBLE_WIDTH - BUBBLE_GAP, 8),
  };

  return (
    <>
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
        {scrollDir === "down"
          ? <><span>前往</span><span>底部</span></>
          : <><span>返回</span><span>顶部</span></>}
      </button>

      {assistantVisible && assistantEgg?.imageUrl && (
        <div
          className={`assistant-bubble assistant-bubble-${bubblePlacement}${assistantClosing ? " closing" : ""}`}
          style={assistantBubbleStyle}
          role="status"
          aria-live="polite"
        >
          <button
            type="button"
            className="assistant-bubble-close"
            onClick={closeAssistantBubble}
            aria-label="关闭助手提示"
          >
            ×
          </button>
          <p className="assistant-bubble-text">
            {assistantEgg.type === "funny"
              ? "检测到一串很特别的数字。"
              : "博士，我好像发现了一点小惊喜。"}
          </p>
          <div className="assistant-bubble-image-wrap">
            <img
              src={assistantEgg.imageUrl}
              alt="彩蛋"
              className="assistant-bubble-image"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingAssistant;
