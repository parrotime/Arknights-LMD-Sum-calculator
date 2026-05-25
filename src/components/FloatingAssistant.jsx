import React, { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD = 5;
const BUTTON_SIZE = 64;
const BUBBLE_WIDTH = 300;
const BUBBLE_GAP = 14;
const BUBBLE_POINTER_SIZE = 18;
const WELCOME_MESSAGE = "博士你好，点击我可以快速到达网页底部或者回到顶部哦";
const FAST_DRAG_SPEED_THRESHOLD = 1.5;
const FAST_DRAG_MIN_DISTANCE_RATIO = 1.5;
const FAST_DRAG_COOLDOWN = 8000;
const TITLE_ANCHOR_SELECTOR = '[data-assistant-anchor="main-title"]';
const ROBOT_ICONS = {
  cute: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/r_cute.webp",
  default: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/r_default.webp",
  dizzy: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/r_dizzy.webp",
  down: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/r_down.webp",
  up: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/r_up.webp",
  smile: "https://ark-lmd.oss-cn-beijing.aliyuncs.com/r_smile.webp",
};
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

const getDefaultPos = () => ({
  x: window.innerWidth - 24 - BUTTON_SIZE,
  y: window.innerHeight - 24 - BUTTON_SIZE,
});

const clampPosition = (pos) => ({
  x: Math.min(Math.max(pos.x, 0), window.innerWidth - BUTTON_SIZE),
  y: Math.min(Math.max(pos.y, 0), window.innerHeight - BUTTON_SIZE),
});

const getTitleAnchorPos = () => {
  const anchor = document.querySelector(TITLE_ANCHOR_SELECTOR);
  if (!anchor) return getDefaultPos();
  const rect = anchor.getBoundingClientRect();
  const titleBar = anchor.closest("div");
  const titleCode = titleBar?.querySelector("p");
  const titleCodeRect = titleCode?.getBoundingClientRect();
  const groupTop = rect.top;
  const groupBottom = titleCodeRect ? titleCodeRect.bottom : rect.bottom;
  return clampPosition({
    x: rect.right + 14,
    y: groupTop + (groupBottom - groupTop) / 2 - BUTTON_SIZE / 2,
  });
};

const getAssistantMessage = (type) => {
  if (type === "recalculate") return "计算设置发生变化，请注意重新计算";
  if (type === "dizzy") {
    return {
      text: "博士快停下，我要晕掉了",
      kaomoji: "(@︿@)",
    };
  }
  if (type === "funny") {
    return {
      text: "有几个臭钱很了不起呀",
      kaomoji: "ヽ(#`Д´)ﾉ",
    };
  }
  if (type === "sami325") return "呼呼呼！";
  if (type === "typhoon799") return "检测到799信号，萨米地区气压异常";
  if (type === "zc325") return "苦也，这也言周";
  if (type === "memory350234") return "博士，往日种种，你还记得吗...";
  if (type === "romantic") {
    return "计算器终端已收到一份特殊心意。\n祝博士和喜欢的干员都能迎来好天气。";
  }
  return "给心心";
};

const FloatingAssistant = ({ assistantEgg, onAssistantEggClose }) => {
  const [scrollDir, setScrollDir] = useState("down");
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const [welcomeClosing, setWelcomeClosing] = useState(false);
  const [dragEggVisible, setDragEggVisible] = useState(false);
  const [dragEggClosing, setDragEggClosing] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [assistantClosing, setAssistantClosing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [scrollTravelMood, setScrollTravelMood] = useState(null);
  const [clickPulseId, setClickPulseId] = useState(0);
  const welcomeClosingRef = useRef(false);
  const dragEggClosingRef = useRef(false);
  const lastFastDragAtRef = useRef(0);
  const assistantClosingRef = useRef(false);
  const scrollTravelTargetRef = useRef(null);
  const scrollTravelTimerRef = useRef(null);

  const btnRef = useRef(null);
  const dragState = useRef(null);
  const [btnPos, setBtnPos] = useState(() => getTitleAnchorPos());
  const [isDragging, setIsDragging] = useState(false);
  const [dragLean, setDragLean] = useState("center");
  const isDraggingRef = useRef(false);

  const triggerRobotClickPulse = useCallback(() => {
    setClickPulseId((current) => current + 1);
  }, []);

  useEffect(() => {
    Object.values(ROBOT_ICONS).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const timer = window.requestAnimationFrame(() => {
      setBtnPos(getTitleAnchorPos());
    });
    return () => window.cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const threshold = window.innerHeight * 0.5;
      setScrollDir(window.scrollY < threshold ? "down" : "up");
      if (!scrollTravelTargetRef.current) return;
      const maxScroll = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      ) - window.innerHeight;
      const target = scrollTravelTargetRef.current === "down" ? maxScroll : 0;
      const reachedTarget = Math.abs(window.scrollY - target) <= 4;
      if (reachedTarget) {
        scrollTravelTargetRef.current = null;
        window.clearTimeout(scrollTravelTimerRef.current);
        scrollTravelTimerRef.current = window.setTimeout(() => {
          setScrollTravelMood(null);
        }, 260);
        return;
      }
      window.clearTimeout(scrollTravelTimerRef.current);
      scrollTravelTimerRef.current = window.setTimeout(() => {
        scrollTravelTargetRef.current = null;
        setScrollTravelMood(null);
      }, 260);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(scrollTravelTimerRef.current);
    };
  }, []);

  const closeWelcomeBubble = useCallback(() => {
    if (!welcomeVisible || welcomeClosingRef.current) return;
    welcomeClosingRef.current = true;
    setWelcomeClosing(true);
    window.setTimeout(() => {
      setWelcomeVisible(false);
      setWelcomeClosing(false);
      welcomeClosingRef.current = false;
    }, 320);
  }, [welcomeVisible]);

  useEffect(() => {
    if (!welcomeVisible || assistantEgg) return undefined;
    const timer = window.setTimeout(() => {
      closeWelcomeBubble();
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [assistantEgg, closeWelcomeBubble, welcomeVisible]);

  const closeDragEggBubble = useCallback(() => {
    if (!dragEggVisible || dragEggClosingRef.current) return;
    dragEggClosingRef.current = true;
    setDragEggClosing(true);
    window.setTimeout(() => {
      setDragEggVisible(false);
      setDragEggClosing(false);
      dragEggClosingRef.current = false;
    }, 320);
  }, [dragEggVisible]);

  useEffect(() => {
    if (!dragEggVisible || assistantEgg) return undefined;
    const timer = window.setTimeout(() => {
      closeDragEggBubble();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [assistantEgg, closeDragEggBubble, dragEggVisible]);

  const showDragEggBubble = useCallback(() => {
    const now = performance.now();
    if (now - lastFastDragAtRef.current < FAST_DRAG_COOLDOWN) return;
    lastFastDragAtRef.current = now;
    setWelcomeVisible(false);
    setWelcomeClosing(false);
    welcomeClosingRef.current = false;
    setDragEggVisible(true);
    setDragEggClosing(false);
    dragEggClosingRef.current = false;
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
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    triggerRobotClickPulse();
    setScrollTravelMood(scrollDir);
    scrollTravelTargetRef.current = scrollDir;
    window.clearTimeout(scrollTravelTimerRef.current);
    scrollTravelTimerRef.current = window.setTimeout(() => {
      scrollTravelTargetRef.current = null;
      setScrollTravelMood(null);
    }, behavior === "auto" ? 320 : 2200);
    if (scrollDir === "down") {
      window.scrollTo({ top: document.body.scrollHeight, behavior });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  }, [scrollDir, triggerRobotClickPulse]);

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
    setIsPointerActive(true);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: performance.now(),
      traveledDistance: 0,
      fastDragDetected: false,
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
    const horizontalMove = e.clientX - dragState.current.lastX;
    if (Math.abs(horizontalMove) >= 1.5) {
      setDragLean(horizontalMove < 0 ? "left" : "right");
    }
    const now = performance.now();
    const moveDistance = Math.hypot(
      e.clientX - dragState.current.lastX,
      e.clientY - dragState.current.lastY
    );
    const elapsed = Math.max(now - dragState.current.lastTime, 1);
    dragState.current.traveledDistance += moveDistance;
    if (
      dragState.current.traveledDistance >= window.innerWidth * FAST_DRAG_MIN_DISTANCE_RATIO &&
      moveDistance / elapsed >= FAST_DRAG_SPEED_THRESHOLD
    ) {
      dragState.current.fastDragDetected = true;
    }
    dragState.current.lastX = e.clientX;
    dragState.current.lastY = e.clientY;
    dragState.current.lastTime = now;
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
    const fastDragDetected = dragState.current.fastDragDetected;
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
      if (fastDragDetected) {
        showDragEggBubble();
      }
    }
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragLean("center");
    setIsPointerActive(false);
  }, [handleScrollBtn, showDragEggBubble]);

  const onPointerUp = useCallback((e) => {
    resetPointerDrag(e, true);
  }, [resetPointerDrag]);

  const onPointerCancel = useCallback((e) => {
    resetPointerDrag(e, false);
  }, [resetPointerDrag]);

  const assistantMessage = assistantEgg?.message ?? getAssistantMessage(assistantEgg?.type);
  const dragEggMessage = getAssistantMessage("dizzy");
  const showAssistantBubble = assistantVisible && !!assistantEgg;
  const showDragBubble = dragEggVisible && !showAssistantBubble;
  const showWelcomeBubble = welcomeVisible && !showAssistantBubble && !showDragBubble;
  const isEasterEggBubble = showAssistantBubble && assistantEgg?.type !== "recalculate";
  const robotMood = (() => {
    if (showDragBubble) return "dizzy";
    if (isDragging) return "cute";
    if (scrollTravelMood) return scrollTravelMood;
    if (isEasterEggBubble) return "cute";
    if (showWelcomeBubble || showAssistantBubble) return "smile";
    if (isPointerActive || isHovering) return scrollDir;
    return "smile";
  })();
  const robotIcon = ROBOT_ICONS[robotMood] ?? ROBOT_ICONS.smile;
  const activeMessage = showDragBubble ? dragEggMessage : assistantMessage;
  const bubblePlacement = btnPos.x + BUTTON_SIZE + BUBBLE_GAP + BUBBLE_WIDTH > window.innerWidth
    ? "left"
    : "right";
  const bubbleHasImage = showAssistantBubble && assistantEgg?.imageUrl;
  const estimatedBubbleHeight = bubbleHasImage ? 252 : 86;
  const assistantCenterY = btnPos.y + BUTTON_SIZE / 2;
  const assistantBubbleStyle = {
    top: Math.min(
      Math.max(assistantCenterY - estimatedBubbleHeight / 2, 72),
      Math.max(window.innerHeight - estimatedBubbleHeight - 16, 72)
    ),
    left: bubblePlacement === "right"
      ? btnPos.x + BUTTON_SIZE + BUBBLE_GAP
      : Math.max(btnPos.x - BUBBLE_WIDTH - BUBBLE_GAP, 8),
  };
  const bubblePointerTop = Math.min(
    Math.max(
      btnPos.y + BUTTON_SIZE / 2 - assistantBubbleStyle.top,
      22
    ),
    bubbleHasImage ? 158 : estimatedBubbleHeight - 22
  );
  assistantBubbleStyle["--assistant-pointer-top"] = `${bubblePointerTop}px`;

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className={`back-to-top${isDragging ? " dragging" : ""} drag-${dragLean}`}
        style={{ left: btnPos.x, top: btnPos.y }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerEnter={() => setIsHovering(true)}
        onPointerLeave={() => setIsHovering(false)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          handleScrollBtn();
        }}
        aria-label={scrollDir === "down" ? "前往页面底部" : "返回页面顶部"}
        aria-describedby={(showWelcomeBubble || showDragBubble || showAssistantBubble) ? "assistant-bubble-message" : undefined}
        title="可拖动"
      >
        <span className="assistant-robot-idle" aria-hidden="true">
          <span
            key={clickPulseId}
            className={`assistant-robot-press${clickPulseId > 0 ? " clicked" : ""}`}
          >
            <img
              src={robotIcon}
              alt=""
              className="assistant-robot-icon"
              draggable="false"
            />
          </span>
        </span>
      </button>

      {(showWelcomeBubble || showDragBubble || showAssistantBubble) && (
        <div
          className={`assistant-bubble assistant-bubble-${bubblePlacement}${(showWelcomeBubble ? welcomeClosing : showDragBubble ? dragEggClosing : assistantClosing) ? " closing" : ""}`}
          style={assistantBubbleStyle}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <button
            type="button"
            className="assistant-bubble-close"
            onClick={showWelcomeBubble ? closeWelcomeBubble : showDragBubble ? closeDragEggBubble : closeAssistantBubble}
            aria-label="关闭助手提示"
          >
            ×
          </button>
          <p id="assistant-bubble-message" className="assistant-bubble-text">
            {showWelcomeBubble ? (
              WELCOME_MESSAGE
            ) : typeof activeMessage === "string" ? (
              activeMessage
            ) : (
              <>
                <span>{activeMessage.text}</span>
                <span className="assistant-bubble-kaomoji">{activeMessage.kaomoji}</span>
              </>
            )}
          </p>
          {showAssistantBubble && assistantEgg.imageUrl && (
            <div className="assistant-bubble-image-wrap">
              <img
                src={assistantEgg.imageUrl}
                alt="彩蛋"
                className="assistant-bubble-image"
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingAssistant;
