"use client";

import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) return true;

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  return target.closest('[contenteditable="true"]') !== null;
}

export default function MobileZoomLock() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const EDGE_GUARD_PX = 32;
    const HORIZONTAL_SWIPE_THRESHOLD = 8;

    let lastTouchEnd = 0;
    let trackingSingleTouch = false;
    let startedFromEdge = false;
    let startX = 0;
    let startY = 0;

    const listenerOptions: AddEventListenerOptions = { passive: false };

    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isEditableTarget(event.target)) {
        trackingSingleTouch = false;
        startedFromEdge = false;
        return;
      }

      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startedFromEdge =
        startX <= EDGE_GUARD_PX ||
        startX >= window.innerWidth - EDGE_GUARD_PX;
      trackingSingleTouch = true;
    };

    const preventPinchAndEdgeSwipe = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
        return;
      }

      if (!trackingSingleTouch || !startedFromEdge || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > HORIZONTAL_SWIPE_THRESHOLD && absX > absY) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!isEditableTarget(event.target)) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }

      trackingSingleTouch = false;
      startedFromEdge = false;
    };

    const handleTouchCancel = () => {
      trackingSingleTouch = false;
      startedFromEdge = false;
    };

    document.addEventListener("gesturestart", preventGesture, listenerOptions);
    document.addEventListener("gesturechange", preventGesture, listenerOptions);
    document.addEventListener("gestureend", preventGesture, listenerOptions);
    document.addEventListener("touchstart", handleTouchStart, listenerOptions);
    document.addEventListener("touchmove", preventPinchAndEdgeSwipe, listenerOptions);
    document.addEventListener("touchend", handleTouchEnd, listenerOptions);
    document.addEventListener("touchcancel", handleTouchCancel, listenerOptions);

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", preventPinchAndEdgeSwipe);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, []);

  return null;
}
