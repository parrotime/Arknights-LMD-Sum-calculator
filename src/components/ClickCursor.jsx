import { useEffect, useRef, useCallback } from "react";
import "../assets/styles/ClickCursor.css";

const ClickCursor = ({ isCalculating = false }) => {
  const cursorRef = useRef(null);
  const innerRef = useRef(null);
  const posRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef(null);
  const visibleRef = useRef(false);
  const draggingRef = useRef(false);
  const mouseDownRef = useRef(false);

  // 光标热点偏移：旋转30°后尖端相对div左上角的位置
  const HOTSPOT_X = 21;
  const HOTSPOT_Y = -3;

  const updatePosition = useCallback(() => {
    if (cursorRef.current) {
      cursorRef.current.style.transform =
        `translate3d(${posRef.current.x - HOTSPOT_X}px, ${posRef.current.y - HOTSPOT_Y}px, 0)`;
    }
    rafRef.current = null;
  }, []);

  const showCursor = useCallback(() => {
    if (!visibleRef.current && cursorRef.current) {
      cursorRef.current.style.opacity = "1";
      visibleRef.current = true;
    }
  }, []);

  const hideCursor = useCallback(() => {
    if (visibleRef.current && cursorRef.current) {
      cursorRef.current.style.opacity = "0";
      visibleRef.current = false;
    }
  }, []);

  const enterDragging = useCallback(() => {
    if (!draggingRef.current) {
      draggingRef.current = true;
      hideCursor();
      document.body.classList.add("custom-cursor-dragging");
    }
  }, [hideCursor]);

  const exitDragging = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      document.body.classList.remove("custom-cursor-dragging");
      showCursor();
    }
  }, [showCursor]);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e) => {
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;

      if (mouseDownRef.current) {
        // 鼠标按下拖动中，检测是否有选区
        const sel = window.getSelection();
        if (sel && sel.toString().length > 0) {
          enterDragging();
        }
      } else if (draggingRef.current) {
        // 鼠标已松开但还处于 dragging 状态 → 恢复
        exitDragging();
      }

      if (!draggingRef.current) {
        showCursor();
      }

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updatePosition);
      }
    };

    const onLeave = () => hideCursor();
    const onEnter = () => { if (!draggingRef.current) showCursor(); };

    const onDown = () => {
      mouseDownRef.current = true;
      if (innerRef.current) innerRef.current.classList.add("pressing");
    };

    const onUp = () => {
      mouseDownRef.current = false;
      if (innerRef.current) innerRef.current.classList.remove("pressing");
      // 无条件尝试退出 dragging
      exitDragging();
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    document.body.classList.add("custom-cursor-active");

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.body.classList.remove("custom-cursor-active");
      document.body.classList.remove("custom-cursor-dragging");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updatePosition, showCursor, hideCursor, enterDragging, exitDragging]);

  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  return (
    <div ref={cursorRef} className={`click-cursor${isCalculating ? " calculating" : ""}`} style={{ opacity: 0 }}>
      <div ref={innerRef} className="click-cursor-inner" />
    </div>
  );
};

export default ClickCursor;
