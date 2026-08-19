"use client";

import { useEffect, useRef } from "react";

/* Dialog behaviour in one place: body scroll lock, focus moved into the
   dialog and trapped there, focus restored on close, and Escape when the
   dialog is dismissable. Overlays used to implement Escape individually
   and nothing else — so a modal left the page scrolling behind it and
   keyboard focus outside the dialog. */
export function useDialog(onClose: () => void, { closeOnEscape = true } = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    ref.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (closeOnEscape) onClose();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [onClose, closeOnEscape]);

  return ref;
}
