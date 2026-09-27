"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

const clampZoom = (value: number) => Math.max(1, Math.min(3, value));

export default function CanvasViewport({
  children,
  onNavigate,
  aspectRatio = 1.5,
}: {
  children: ReactNode;
  aspectRatio?: number;
  onNavigate: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<{ left: number; top: number } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    distance: number;
    zoom: number;
    anchorX: number;
    anchorY: number;
  } | null>(null);
  const pan = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = viewport.current;
    if (el && pendingScroll.current) {
      el.scrollLeft = pendingScroll.current.left;
      el.scrollTop = pendingScroll.current.top;
      pendingScroll.current = null;
    }
  }, [zoom]);

  const changeZoom = (value: number) => {
    const el = viewport.current;
    const next = clampZoom(value);
    if (el && next !== zoom) {
      pendingScroll.current = {
        left:
          ((el.scrollLeft + el.clientWidth / 2) * next) / zoom -
          el.clientWidth / 2,
        top:
          ((el.scrollTop + el.clientHeight / 2) * next) / zoom -
          el.clientHeight / 2,
      };
    }
    setZoom(next);
  };

  const start = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewport.current;
    if (!el || event.button !== 0) return;
    if (event.pointerType === "touch") {
      touches.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      if (touches.current.size === 2) {
        event.preventDefault();
        event.stopPropagation();
        onNavigate();
        pan.current = null;
        const [a, b] = [...touches.current.values()];
        const rect = el.getBoundingClientRect();
        gesture.current = {
          distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          zoom,
          anchorX: (el.scrollLeft + (a.x + b.x) / 2 - rect.left) / zoom,
          anchorY: (el.scrollTop + (a.y + b.y) / 2 - rect.top) / zoom,
        };
        for (const id of touches.current.keys()) el.setPointerCapture(id);
        return;
      }
    }
    if (panMode) {
      event.preventDefault();
      event.stopPropagation();
      onNavigate();
      pan.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: el.scrollLeft,
        top: el.scrollTop,
      };
      el.setPointerCapture(event.pointerId);
    }
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewport.current;
    if (!el) return;
    if (touches.current.has(event.pointerId))
      touches.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    if (gesture.current && touches.current.size >= 2) {
      event.preventDefault();
      event.stopPropagation();
      const [a, b] = [...touches.current.values()];
      const rect = el.getBoundingClientRect();
      const next = clampZoom(
        (gesture.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
          gesture.current.distance,
      );
      const scroll = {
        left: gesture.current.anchorX * next - ((a.x + b.x) / 2 - rect.left),
        top: gesture.current.anchorY * next - ((a.y + b.y) / 2 - rect.top),
      };
      if (next === zoom) {
        el.scrollLeft = scroll.left;
        el.scrollTop = scroll.top;
      } else {
        pendingScroll.current = scroll;
        setZoom(next);
      }
    } else if (pan.current?.id === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      el.scrollLeft = pan.current.left - (event.clientX - pan.current.x);
      el.scrollTop = pan.current.top - (event.clientY - pan.current.y);
    }
  };

  const finish = (event: ReactPointerEvent<HTMLDivElement>) => {
    touches.current.delete(event.pointerId);
    if (touches.current.size < 2) gesture.current = null;
    if (pan.current?.id === event.pointerId) pan.current = null;
    if (viewport.current?.hasPointerCapture(event.pointerId))
      viewport.current.releasePointerCapture(event.pointerId);
  };

  return (
    <>
      <div
        className="canvasZoomControls"
        role="group"
        aria-label="Canvas view controls"
      >
        <button
          type="button"
          aria-label="Zoom out"
          disabled={zoom <= 1}
          onClick={() => changeZoom(zoom - 0.25)}
        >
          −
        </button>
        <label>
          Zoom{" "}
          <input
            aria-label="Canvas zoom"
            type="range"
            min="100"
            max="300"
            step="1"
            value={Math.round(zoom * 100)}
            onChange={(event) => changeZoom(Number(event.target.value) / 100)}
          />
        </label>
        <span className="canvasZoomValue" aria-hidden="true">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={zoom >= 3}
          onClick={() => changeZoom(zoom + 0.25)}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            changeZoom(1);
            setPanMode(false);
            if (viewport.current) viewport.current.scrollTo(0, 0);
          }}
        >
          Fit scene
        </button>
        <button
          type="button"
          aria-pressed={panMode}
          onClick={() => setPanMode(!panMode)}
        >
          Move canvas
        </button>
      </div>
      <p className="canvasZoomHint">
        {panMode
          ? "Drag to move the view. Turn off Move canvas to edit objects."
          : "Pinch with two fingers to zoom. Use Move canvas to pan."}{" "}
        Zoom changes only your editing view.
      </p>
      <div
        ref={viewport}
        style={{
          aspectRatio,
          maxWidth:
            aspectRatio < 1.5
              ? `min(100%, calc(75vh * ${aspectRatio}))`
              : undefined,
        }}
        className={`canvasViewport${panMode ? " isPanning" : ""}`}
        aria-label="Scene viewport"
        onPointerDownCapture={start}
        onPointerMoveCapture={move}
        onPointerUpCapture={finish}
        onPointerCancelCapture={finish}
        onClickCapture={(event) => {
          if (panMode) event.stopPropagation();
        }}
      >
        <div className="canvasZoomContent" style={{ width: `${zoom * 100}%` }}>
          {children}
        </div>
      </div>
    </>
  );
}
