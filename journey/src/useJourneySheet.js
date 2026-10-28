import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const SHEET_HEIGHTS = [183, 470, 748];

// All distances use the 375 × 812 design canvas, including on scaled phones.
export function useJourneySheet(snap, setSnap) {
  const ref = useRef(null);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const [dragHeight, setDragHeight] = useState(null);
  const [headerHeight, setHeaderHeight] = useState(122);
  useLayoutEffect(() => {
    const content = ref.current?.querySelector(".situation-full");
    if (!content) return;
    const measure = () =>
      setHeaderHeight(Math.max(122, Math.ceil(content.scrollHeight) + 51));
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    gesture.current = null;
    setDragHeight(null);
  }, [snap]);
  const height = dragHeight ?? SHEET_HEIGHTS[snap];
  const reveal = Math.max(0, Math.min(1, (height - SHEET_HEIGHTS[0]) / 150));
  const clamp = (n) => Math.max(183, Math.min(748, n));
  const events = {
    onPointerDown(event) {
      if (!event.isPrimary || event.button !== 0) return;
      const scale =
        ref.current.closest(".device").getBoundingClientRect().width / 375;
      gesture.current = {
        pointer: event.pointerId,
        y: event.clientY,
        height,
        scale,
        lastY: event.clientY,
        time: event.timeStamp,
        velocity: 0,
        moved: false,
      };
      suppressClick.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event) {
      const g = gesture.current;
      if (!g || g.pointer !== event.pointerId) return;
      const delta = (g.y - event.clientY) / g.scale;
      if (Math.abs(delta) > 4) g.moved = true;
      if (!g.moved) return;
      const elapsed = event.timeStamp - g.time;
      if (elapsed > 0)
        g.velocity = (g.lastY - event.clientY) / g.scale / elapsed;
      g.time = event.timeStamp;
      g.lastY = event.clientY;
      setDragHeight(clamp(g.height + delta));
    },
    onPointerUp(event) {
      const g = gesture.current;
      if (!g || g.pointer !== event.pointerId) return;
      gesture.current = null;
      if (g.moved) {
        const current = clamp(g.height + (g.y - event.clientY) / g.scale);
        const velocity = event.timeStamp - g.time < 100 ? g.velocity : 0;
        const projected = clamp(
          current + Math.max(-180, Math.min(180, velocity * 120)),
        );
        const nearest = SHEET_HEIGHTS.reduce(
          (best, h, i) =>
            Math.abs(h - projected) < Math.abs(SHEET_HEIGHTS[best] - projected)
              ? i
              : best,
          0,
        );
        suppressClick.current = true;
        setSnap(nearest);
      }
      setDragHeight(null);
    },
    onPointerCancel() {
      gesture.current = null;
      setDragHeight(null);
    },
    onLostPointerCapture() {
      if (gesture.current) {
        gesture.current = null;
        setDragHeight(null);
      }
    },
    onClick(event) {
      if (suppressClick.current) {
        event.preventDefault();
        suppressClick.current = false;
        return;
      }
      setSnap(snap === 2 ? 0 : 2);
    },
    onKeyDown(event) {
      const next = {
        ArrowUp: Math.min(2, snap + 1),
        ArrowDown: Math.max(0, snap - 1),
        Home: 0,
        End: 2,
      }[event.key];
      if (next !== undefined) {
        event.preventDefault();
        setSnap(next);
      }
    },
  };
  return {
    ref,
    events,
    reveal,
    dragging: dragHeight !== null,
    style: {
      "--sheet-height": `${height}px`,
      "--reveal": reveal,
      "--sheet-inset": `${10 * (1 - reveal)}px`,
      "--sheet-footer": `${95 * (1 - reveal)}px`,
      "--situation-height": `${28 + (headerHeight - 28) * reveal}px`,
      "--summary-height": `${60 * (1 - reveal)}px`,
    },
  };
}
