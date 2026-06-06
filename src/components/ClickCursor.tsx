import { useEffect, useRef, useCallback } from "react";
import "../assets/styles/ClickCursor.css";

const FINE_POINTER_QUERY = "(pointer: fine)";
const TEXT_CURSOR_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"])',
  "textarea",
  "select",
  '[contenteditable="true"]',
  '[contenteditable=""]',
].join(",");
const NATIVE_CURSOR_ZONE_SELECTOR = [
  TEXT_CURSOR_SELECTOR,
  '[data-native-cursor="true"]',
  ".back-to-top",
].join(",");
const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");
const DISABLED_SELECTOR = [
  "button:disabled",
  "input:disabled",
  "select:disabled",
  "textarea:disabled",
  '[aria-disabled="true"]',
].join(",");

interface ClickCursorProps {
  isCalculating?: boolean;
}

type NativeCursorEvent = CustomEvent<{ active?: boolean }>;

const getElementTarget = (target: EventTarget | null): Element | null => (
  target instanceof Element ? target : null
);

const ClickCursor = ({ isCalculating = false }: ClickCursorProps) => {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number | null>(null);
  const visibleRef = useRef(false);
  const nativeCursorRef = useRef(false);
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

  const enterNativeCursor = useCallback(() => {
    if (!nativeCursorRef.current) {
      nativeCursorRef.current = true;
      hideCursor();
      document.body.classList.add("custom-cursor-native");
    }
  }, [hideCursor]);

  const exitNativeCursor = useCallback(() => {
    if (nativeCursorRef.current) {
      nativeCursorRef.current = false;
      document.body.classList.remove("custom-cursor-native");
      showCursor();
    }
  }, [showCursor]);

  const updateCursorAffordance = useCallback((target: EventTarget | null) => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const element = getElementTarget(target);
    const disabled = Boolean(element?.closest(DISABLED_SELECTOR));
    const dragTarget = Boolean(element?.closest(".back-to-top"));
    const interactive = Boolean(element?.closest(INTERACTIVE_SELECTOR));

    cursor.classList.toggle("disabled", disabled);
    cursor.classList.toggle("drag-target", dragTarget && !disabled);
    cursor.classList.toggle("interactive", interactive && !dragTarget && !disabled);
  }, []);

  const resetInteraction = useCallback(() => {
    mouseDownRef.current = false;
    if (innerRef.current) innerRef.current.classList.remove("pressing");
    document.body.classList.remove("custom-cursor-dragging");
    exitNativeCursor();
  }, [exitNativeCursor]);

  useEffect(() => {
    if (window.matchMedia(FINE_POINTER_QUERY).matches === false) return;

    const onPointerMove = (e: PointerEvent) => {
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;
      updateCursorAffordance(e.target);

      const element = getElementTarget(e.target);
      const overNativeTarget = Boolean(element?.closest(NATIVE_CURSOR_ZONE_SELECTOR));
      let selectingText = false;
      if (mouseDownRef.current) {
        const sel = window.getSelection();
        selectingText = Boolean(sel && sel.toString().length > 0);
        if (selectingText) {
          document.body.classList.add("custom-cursor-dragging");
        }
      } else {
        document.body.classList.remove("custom-cursor-dragging");
      }

      if (overNativeTarget || selectingText) {
        enterNativeCursor();
      } else {
        exitNativeCursor();
      }

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updatePosition);
      }
    };

    const onLeave = () => hideCursor();
    const onEnter = (e: PointerEvent) => {
      updateCursorAffordance(e.target);
      if (!nativeCursorRef.current) showCursor();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      mouseDownRef.current = true;
      updateCursorAffordance(e.target);
      if (!nativeCursorRef.current && innerRef.current) {
        innerRef.current.classList.add("pressing");
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      mouseDownRef.current = false;
      if (innerRef.current) innerRef.current.classList.remove("pressing");
      document.body.classList.remove("custom-cursor-dragging");
      updateCursorAffordance(e.target);
    };

    const onNativeCursorRequest = (e: Event) => {
      const event = e as NativeCursorEvent;
      if (event.detail?.active) {
        enterNativeCursor();
      } else {
        exitNativeCursor();
      }
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", resetInteraction);
    window.addEventListener("ark-native-cursor", onNativeCursorRequest);
    window.addEventListener("blur", resetInteraction);
    window.addEventListener("contextmenu", resetInteraction);
    document.body.classList.add("custom-cursor-active");

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", resetInteraction);
      window.removeEventListener("ark-native-cursor", onNativeCursorRequest);
      window.removeEventListener("blur", resetInteraction);
      window.removeEventListener("contextmenu", resetInteraction);
      document.body.classList.remove("custom-cursor-active");
      document.body.classList.remove("custom-cursor-native");
      document.body.classList.remove("custom-cursor-dragging");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    updatePosition,
    showCursor,
    hideCursor,
    enterNativeCursor,
    exitNativeCursor,
    updateCursorAffordance,
    resetInteraction,
  ]);

  if (typeof window !== "undefined" && window.matchMedia(FINE_POINTER_QUERY).matches === false) {
    return null;
  }

  return (
    <div ref={cursorRef} className={`click-cursor${isCalculating ? " calculating" : ""}`} style={{ opacity: 0 }}>
      <div ref={innerRef} className="click-cursor-inner" />
    </div>
  );
};

export default ClickCursor;
