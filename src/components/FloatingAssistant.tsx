import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { AssistantEggPayload, AssistantEggType } from "../types/calculator";

const DRAG_THRESHOLD = 5;
const DESKTOP_BUTTON_SIZE = 64;
const MOBILE_BUTTON_SIZE = 52;
const DESKTOP_BUBBLE_WIDTH = 300;
const MOBILE_BUBBLE_WIDTH = 260;
const MOBILE_MIN_SIDE_BUBBLE_WIDTH = 212;
const DESKTOP_BUBBLE_GAP = 14;
const MOBILE_BUBBLE_GAP = 10;
const MOBILE_EDGE_THRESHOLD = 28;
const BUBBLE_SCREEN_MARGIN = 8;
const MOBILE_VIEWPORT_QUERY = "(max-width: 800px)";
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

type RobotMood = keyof typeof ROBOT_ICONS;
type ScrollDirection = Extract<RobotMood, "down" | "up">;
type DragLean = "left" | "right" | "center";
type BubblePlacement = "left" | "right" | "top" | "bottom";

interface Position {
  x: number;
  y: number;
}

interface DragState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  traveledDistance: number;
  fastDragDetected: boolean;
  pointerId: number;
  originX: number;
  originY: number;
}

interface AssistantMessageObject {
  text: string;
  kaomoji: string;
}

type AssistantMessage = string | AssistantMessageObject;

interface AssistantBubbleStyle extends CSSProperties {
  "--assistant-pointer-left"?: string;
  "--assistant-pointer-top"?: string;
}

interface FloatingAssistantProps {
  assistantEgg: AssistantEggPayload | null;
  onAssistantEggClose?: () => void;
}

const prefersReducedMotion = (): boolean => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
const requestIdle = (callback: IdleRequestCallback): number => {
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(callback, { timeout: 2500 });
  }
  return window.setTimeout(callback, 1200);
};
const cancelIdle = (id: number): void => {
  if (typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(id);
    return;
  }
  window.clearTimeout(id);
};

const isMobileViewport = (): boolean =>
  window.matchMedia?.(MOBILE_VIEWPORT_QUERY)?.matches ?? window.innerWidth <= 800;

const getButtonSize = (): number => isMobileViewport() ? MOBILE_BUTTON_SIZE : DESKTOP_BUTTON_SIZE;

const getBubbleWidth = (): number => isMobileViewport() ? MOBILE_BUBBLE_WIDTH : DESKTOP_BUBBLE_WIDTH;

const getBubbleGap = (): number => isMobileViewport() ? MOBILE_BUBBLE_GAP : DESKTOP_BUBBLE_GAP;

const getDefaultPos = (): Position => ({
  x: window.innerWidth - (isMobileViewport() ? 16 : 24) - getButtonSize(),
  y: window.innerHeight - (isMobileViewport() ? 18 : 24) - getButtonSize(),
});

const clampPosition = (pos: Position, buttonSize = getButtonSize()): Position => ({
  x: Math.min(Math.max(pos.x, 0), window.innerWidth - buttonSize),
  y: Math.min(Math.max(pos.y, 0), window.innerHeight - buttonSize),
});

const getTitleAnchorPos = (): Position => {
  const anchor = document.querySelector(TITLE_ANCHOR_SELECTOR);
  if (!anchor) return getDefaultPos();
  const rect = anchor.getBoundingClientRect();
  const titleBar = anchor.closest("div");
  const titleCode = titleBar?.querySelector("p");
  const titleCodeRect = titleCode?.getBoundingClientRect();
  const groupTop = rect.top;
  const groupBottom = titleCodeRect ? titleCodeRect.bottom : rect.bottom;
  const buttonSize = getButtonSize();
  return clampPosition({
    x: rect.right + 14,
    y: groupTop + (groupBottom - groupTop) / 2 - buttonSize / 2,
  }, buttonSize);
};

const getInitialAssistantPos = (): Position => isMobileViewport() ? getDefaultPos() : getTitleAnchorPos();

const getAssistantMessage = (type?: AssistantEggType | "dizzy"): AssistantMessage => {
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

const FloatingAssistant = ({ assistantEgg, onAssistantEggClose }: FloatingAssistantProps) => {
  const [scrollDir, setScrollDir] = useState<ScrollDirection>("down");
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const [welcomeClosing, setWelcomeClosing] = useState(false);
  const [dragEggVisible, setDragEggVisible] = useState(false);
  const [dragEggClosing, setDragEggClosing] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [assistantClosing, setAssistantClosing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [scrollTravelMood, setScrollTravelMood] = useState<ScrollDirection | null>(null);
  const welcomeClosingRef = useRef(false);
  const dragEggClosingRef = useRef(false);
  const lastFastDragAtRef = useRef(0);
  const assistantClosingRef = useRef(false);
  const scrollTravelTargetRef = useRef<ScrollDirection | null>(null);
  const scrollTravelTimerRef = useRef<number | undefined>(undefined);
  const robotPressRef = useRef<HTMLSpanElement | null>(null);
  const robotClickAnimationRef = useRef<Animation | null>(null);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const dragState = useRef<DragState | null>(null);
  const [btnPos, setBtnPos] = useState(() => getInitialAssistantPos());
  const [isDragging, setIsDragging] = useState(false);
  const [dragLean, setDragLean] = useState<DragLean>("center");
  const isDraggingRef = useRef(false);

  const triggerRobotClickPulse = useCallback(() => {
    const robotPress = robotPressRef.current;
    if (!robotPress?.animate || prefersReducedMotion()) return;

    robotClickAnimationRef.current?.cancel();
    const animation = robotPress.animate(
      [
        { transform: "scale(1)", offset: 0 },
        { transform: "scale(0.9)", offset: 0.42 },
        { transform: "scale(1.04)", offset: 0.74 },
        { transform: "scale(1)", offset: 1 },
      ],
      {
        duration: 360,
        easing: "cubic-bezier(0.2, 0.9, 0.18, 1.08)",
      }
    );

    robotClickAnimationRef.current = animation;
    const clearAnimation = () => {
      if (robotClickAnimationRef.current === animation) {
        robotClickAnimationRef.current = null;
      }
    };
    animation.addEventListener("finish", clearAnimation, { once: true });
    animation.addEventListener("cancel", clearAnimation, { once: true });
  }, []);

  useEffect(() => () => {
    robotClickAnimationRef.current?.cancel();
  }, []);

  useEffect(() => {
    const immediateIcon = new Image();
    immediateIcon.decoding = "async";
    immediateIcon.src = ROBOT_ICONS.smile;

    const idleId = requestIdle(() => {
      Object.entries(ROBOT_ICONS)
        .filter(([mood]) => mood !== "smile")
        .forEach(([, src]) => {
          const img = new Image();
          img.decoding = "async";
          img.src = src;
        });
    });

    return () => cancelIdle(idleId);
  }, []);

  useEffect(() => {
    if (!assistantEgg?.imageUrl) return;
      const img = new Image();
      img.decoding = "async";
      img.src = assistantEgg.imageUrl;
  }, [assistantEgg?.imageUrl]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const timer = window.requestAnimationFrame(() => {
      setBtnPos(getInitialAssistantPos());
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
    }, assistantEgg.duration ?? 5000);
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
        const buttonSize = getButtonSize();
        const w = btn ? btn.offsetWidth : buttonSize;
        const h = btn ? btn.offsetHeight : buttonSize;
        const x = Math.min(Math.max(prev.x, 0), window.innerWidth - w);
        const y = Math.min(Math.max(prev.y, 0), window.innerHeight - h);
        return { x, y };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
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

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
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
    const buttonSize = getButtonSize();
    const w = btn ? btn.offsetWidth : buttonSize;
    const h = btn ? btn.offsetHeight : buttonSize;
    const x = Math.min(Math.max(dragState.current.originX + dx, 0), window.innerWidth - w);
    const y = Math.min(Math.max(dragState.current.originY + dy, 0), window.innerHeight - h);
    setBtnPos({ x, y });
  }, []);

  const resetPointerDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>, shouldClick = false) => {
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

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    resetPointerDrag(e, true);
  }, [resetPointerDrag]);

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    resetPointerDrag(e, false);
  }, [resetPointerDrag]);

  const assistantMessage = assistantEgg?.message ?? getAssistantMessage(assistantEgg?.type);
  const dragEggMessage = getAssistantMessage("dizzy");
  const showAssistantBubble = assistantVisible && !!assistantEgg;
  const showDragBubble = dragEggVisible && !showAssistantBubble;
  const showWelcomeBubble = welcomeVisible && !showAssistantBubble && !showDragBubble;
  const isEasterEggBubble = showAssistantBubble && assistantEgg?.type !== "recalculate";
  const robotMood = ((): RobotMood => {
    if (showDragBubble) return "dizzy";
    if (isDragging) return "cute";
    if (scrollTravelMood) return scrollTravelMood;
    if (isEasterEggBubble) return "cute";
    if (showWelcomeBubble || showAssistantBubble) return "smile";
    if (isPointerActive || isHovering) return scrollDir;
    return "smile";
  })();
  const robotIcon = ROBOT_ICONS[robotMood] ?? ROBOT_ICONS.smile;

  useEffect(() => {
    if (!robotIcon || robotIcon === ROBOT_ICONS.smile) return;
    const img = new Image();
    img.decoding = "async";
    img.src = robotIcon;
  }, [robotIcon]);

  const activeMessage = showDragBubble ? dragEggMessage : assistantMessage;
  const buttonSize = getButtonSize();
  const bubbleWidth = getBubbleWidth();
  const bubbleGap = getBubbleGap();
  const bubbleHasImage = showAssistantBubble && assistantEgg?.imageUrl;
  const estimatedBubbleHeight = bubbleHasImage ? (isMobileViewport() ? 220 : 252) : (isMobileViewport() ? 78 : 86);
  const assistantCenterY = btnPos.y + buttonSize / 2;
  const assistantCenterX = btnPos.x + buttonSize / 2;
  const mobileViewport = isMobileViewport();
  const spaceLeft = btnPos.x - bubbleGap - BUBBLE_SCREEN_MARGIN;
  const spaceRight = window.innerWidth - (btnPos.x + buttonSize + bubbleGap) - BUBBLE_SCREEN_MARGIN;
  const isNearLeftEdge = btnPos.x <= MOBILE_EDGE_THRESHOLD;
  const isNearRightEdge = window.innerWidth - (btnPos.x + buttonSize) <= MOBILE_EDGE_THRESHOLD;
  const canUseLeftBubble = spaceLeft >= MOBILE_MIN_SIDE_BUBBLE_WIDTH;
  const canUseRightBubble = spaceRight >= MOBILE_MIN_SIDE_BUBBLE_WIDTH;
  const bubblePlacement: BubblePlacement = (() => {
    if (!mobileViewport) {
      return btnPos.x + buttonSize + bubbleGap + bubbleWidth > window.innerWidth ? "left" : "right";
    }
    if (isNearRightEdge && canUseLeftBubble) return "left";
    if (isNearLeftEdge && canUseRightBubble) return "right";
    return btnPos.y - estimatedBubbleHeight - bubbleGap >= 72 ? "top" : "bottom";
  })();
  const resolvedBubbleWidth = mobileViewport && (bubblePlacement === "left" || bubblePlacement === "right")
    ? Math.min(bubbleWidth, Math.max(
      MOBILE_MIN_SIDE_BUBBLE_WIDTH,
      bubblePlacement === "left" ? spaceLeft : spaceRight
    ))
    : bubbleWidth;
  const assistantBubbleTop = bubblePlacement === "top"
    ? Math.max(72, btnPos.y - estimatedBubbleHeight - bubbleGap)
    : bubblePlacement === "bottom"
      ? Math.min(btnPos.y + buttonSize + bubbleGap, Math.max(window.innerHeight - estimatedBubbleHeight - 16, 72))
      : Math.min(
        Math.max(assistantCenterY - estimatedBubbleHeight / 2, 72),
        Math.max(window.innerHeight - estimatedBubbleHeight - 16, 72)
      );
  const assistantBubbleLeft = (() => {
    if (bubblePlacement === "right") return btnPos.x + buttonSize + bubbleGap;
    if (bubblePlacement === "left") return Math.max(btnPos.x - resolvedBubbleWidth - bubbleGap, BUBBLE_SCREEN_MARGIN);
    return Math.min(
      Math.max(assistantCenterX - resolvedBubbleWidth / 2, BUBBLE_SCREEN_MARGIN),
      Math.max(window.innerWidth - resolvedBubbleWidth - BUBBLE_SCREEN_MARGIN, BUBBLE_SCREEN_MARGIN)
    );
  })();
  const assistantBubbleStyle: AssistantBubbleStyle = {
    top: assistantBubbleTop,
    left: assistantBubbleLeft,
    width: resolvedBubbleWidth,
  };
  if (bubblePlacement === "top" || bubblePlacement === "bottom") {
    const bubblePointerLeft = Math.min(
      Math.max(assistantCenterX - assistantBubbleLeft, 22),
      resolvedBubbleWidth - 22
    );
    assistantBubbleStyle["--assistant-pointer-left"] = `${bubblePointerLeft}px`;
  } else {
    const bubblePointerTop = Math.min(
      Math.max(
        assistantCenterY - assistantBubbleTop,
        22
      ),
      bubbleHasImage ? (mobileViewport ? 140 : 158) : estimatedBubbleHeight - 22
    );
    assistantBubbleStyle["--assistant-pointer-top"] = `${bubblePointerTop}px`;
  }

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
            ref={robotPressRef}
            className="assistant-robot-press"
          >
            <img
              src={robotIcon}
              alt=""
              className="assistant-robot-icon"
              draggable="false"
              decoding="async"
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
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingAssistant;
