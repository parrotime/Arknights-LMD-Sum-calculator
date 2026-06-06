import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, WheelEvent } from "react";
import styles from "../assets/styles/InputPanel.module.css";

const DRAG_STEP_PX = 18;
const MOBILE_TAP_MOVE_LIMIT_PX = 8;

type WheelValue = string | number;

interface LimitWheelInputProps {
  value?: string | number | null;
  min?: number;
  max?: number;
  placeholder?: string;
  ariaLabel?: string;
  onChange: (value: string) => void;
}

interface DragState {
  active: boolean;
  y: number;
  carry: number;
}

interface TapIntentState {
  active: boolean;
  pointerId: number | null;
  x: number;
  y: number;
  moved: boolean;
}

const formatWheelValue = (value: WheelValue) => (value === "" ? "AUTO" : String(value));
const formatClosedValue = (value: WheelValue, placeholder: string) => (value === "" ? placeholder : String(value));

const wrapIndex = (value: number, length: number) => ((value % length) + length) % length;

const LimitWheelInput = ({
  value,
  min = 0,
  max = 10,
  placeholder = "不限",
  ariaLabel,
  onChange,
}: LimitWheelInputProps) => {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const dragRef = useRef<DragState>({ active: false, y: 0, carry: 0 });
  const tapIntentRef = useRef<TapIntentState>({ active: false, pointerId: null, x: 0, y: 0, moved: false });
  const currentIndexRef = useRef(0);
  const optionsRef = useRef<WheelValue[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [motionKey, setMotionKey] = useState(0);

  const options = useMemo(() => ["", ...Array.from({ length: max - min + 1 }, (_, index) => min + index)], [min, max]);
  const normalizedValue = value === undefined || value === null ? "" : value;
  const currentIndex = Math.max(0, options.findIndex((item) => String(item) === String(normalizedValue)));

  useEffect(() => {
    currentIndexRef.current = currentIndex;
    optionsRef.current = options;
  }, [currentIndex, options]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ark-native-cursor", { detail: { active: isOpen } }));

    return () => {
      window.dispatchEvent(new CustomEvent("ark-native-cursor", { detail: { active: false } }));
    };
  }, [isOpen]);

  const setByIndex = useCallback((nextIndex: number) => {
    const availableOptions = optionsRef.current;
    if (!availableOptions.length) return;

    const wrappedIndex = wrapIndex(nextIndex, availableOptions.length);
    const nextValue = availableOptions[wrappedIndex];

    currentIndexRef.current = wrappedIndex;
    onChange(nextValue === "" ? "" : String(nextValue));
    setMotionKey((key) => key + 1);
  }, [onChange]);

  const stepBy = useCallback((delta: number) => {
    if (!delta) return;
    setByIndex(currentIndexRef.current + delta);
  }, [setByIndex]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    const wheelTarget = rootRef.current;
    if (!wheelTarget) return undefined;

    const handleNativeWheel = (event: globalThis.WheelEvent) => {
      if (!isOpen) return;
      event.preventDefault();
      event.stopPropagation();
      stepBy(event.deltaY > 0 ? 1 : -1);
    };

    wheelTarget.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => wheelTarget.removeEventListener("wheel", handleNativeWheel);
  }, [isOpen, stepBy]);

  const getRelativeOption = (offset: number) => {
    const nextIndex = wrapIndex(currentIndex + offset, options.length);
    return options[nextIndex];
  };

  const nativeCursorProps = isOpen
    ? {
        "data-native-cursor": "true",
        "data-native-cursor-mode": isDragging ? "grabbing" : "grab",
      }
    : {};

  const handlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    const isTouchPointer = event.pointerType === "touch";

    if (isTouchPointer && !isOpen) {
      tapIntentRef.current = {
        active: true,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!isOpen) {
      setIsOpen(true);
      event.currentTarget.focus();
      return;
    }

    dragRef.current = { active: true, y: event.clientY, carry: 0 };
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const tapIntent = tapIntentRef.current;
    if (tapIntent.active && tapIntent.pointerId === event.pointerId) {
      const deltaX = event.clientX - tapIntent.x;
      const deltaY = event.clientY - tapIntent.y;
      if (Math.hypot(deltaX, deltaY) > MOBILE_TAP_MOVE_LIMIT_PX) {
        tapIntentRef.current = { ...tapIntent, moved: true };
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag.active) return;

    event.stopPropagation();
    const deltaY = event.clientY - drag.y + drag.carry;
    const steps = Math.trunc(deltaY / DRAG_STEP_PX);
    if (steps === 0) return;

    stepBy(-steps);
    drag.y = event.clientY;
    drag.carry = deltaY - steps * DRAG_STEP_PX;
  };

  const handlePointerEnd = (event: PointerEvent<HTMLSpanElement>) => {
    const tapIntent = tapIntentRef.current;
    if (tapIntent.active && tapIntent.pointerId === event.pointerId) {
      tapIntentRef.current = { active: false, pointerId: null, x: 0, y: 0, moved: false };

      if (!tapIntent.moved) {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(true);
        event.currentTarget.focus();
      }

      return;
    }

    event.stopPropagation();
    dragRef.current = { active: false, y: 0, carry: 0 };
    setIsDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handleWheel = (event: WheelEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleOptionPointerDown = (event: PointerEvent<HTMLSpanElement>, delta: number) => {
    event.preventDefault();
    event.stopPropagation();
    stepBy(delta);
    rootRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((open) => !open);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      stepBy(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      stepBy(1);
    }
  };

  return (
    <span
      ref={rootRef}
      {...nativeCursorProps}
      className={`${styles['limit-wheel']} ${isOpen ? styles['limit-wheel-open'] : ""}`}
      role="spinbutton"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={normalizedValue === "" ? "后端默认上限" : String(normalizedValue)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
    >
      {isOpen && <span className={styles['limit-wheel-hit-area']} data-native-cursor="true" data-native-cursor-mode={isDragging ? "grabbing" : "grab"} aria-hidden="true" />}
      {!isOpen ? (
        <span className={styles['limit-wheel-closed']}>{formatClosedValue(normalizedValue, placeholder)}</span>
      ) : (
        <span className={styles['limit-wheel-picker']}>
          <span
            className={`${styles['limit-wheel-option']} ${styles['limit-wheel-option-muted']} ${styles['limit-wheel-option-prev']}`}
            role="button"
            aria-label="选择上一个数量"
            data-native-cursor="true"
            data-native-cursor-mode={isDragging ? "grabbing" : "grab"}
            onPointerDown={(event) => handleOptionPointerDown(event, -1)}
          >
            <span className={`${styles['limit-wheel-direction']} ${styles['limit-wheel-direction-up']}`} aria-hidden="true" />
            <span>{formatWheelValue(getRelativeOption(-1))}</span>
          </span>
          <span
            key={motionKey}
            className={`${styles['limit-wheel-option']} ${styles['limit-wheel-option-active']}`}
          >
            {formatWheelValue(normalizedValue)}
          </span>
          <span
            className={`${styles['limit-wheel-option']} ${styles['limit-wheel-option-muted']} ${styles['limit-wheel-option-next']}`}
            role="button"
            aria-label="选择下一个数量"
            data-native-cursor="true"
            data-native-cursor-mode={isDragging ? "grabbing" : "grab"}
            onPointerDown={(event) => handleOptionPointerDown(event, 1)}
          >
            <span className={`${styles['limit-wheel-direction']} ${styles['limit-wheel-direction-down']}`} aria-hidden="true" />
            <span>{formatWheelValue(getRelativeOption(1))}</span>
          </span>
        </span>
      )}
    </span>
  );
};

export default LimitWheelInput;
