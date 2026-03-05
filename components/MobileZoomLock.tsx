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

    let lastTouchEnd = 0;
    const listenerOptions: AddEventListenerOptions = { passive: false };

    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    const preventPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    const preventDoubleTapZoom = (event: TouchEvent) => {
      if (isEditableTarget(event.target)) return;

      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener("gesturestart", preventGesture, listenerOptions);
    document.addEventListener("gesturechange", preventGesture, listenerOptions);
    document.addEventListener("gestureend", preventGesture, listenerOptions);
    document.addEventListener("touchmove", preventPinch, listenerOptions);
    document.addEventListener("touchend", preventDoubleTapZoom, listenerOptions);

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchmove", preventPinch);
      document.removeEventListener("touchend", preventDoubleTapZoom);
    };
  }, []);

  return null;
}
