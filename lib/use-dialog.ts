"use client";

import { useEffect, useRef } from "react";

/* Dialog behaviour in one place: body scroll lock, focus moved into the
   dialog and trapped there, focus restored on close, and Escape when the
   dialog is dismissable. Overlays used to implement Escape individually
   and nothing else — so a modal left the page scrolling behind it and
   keyboard focus outside the dialog. */
/* Ref-counted so stacked dialogs (lightbox over a detail modal) and effect
   re-runs can't capture "hidden" as the value to restore and leave the page
   permanently unscrollable. */
let lockCount = 0;
let savedOverflow = "";

function lockScroll() {
  if (lockCount++ === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}

function unlockScroll() {
  if (--lockCount <= 0) {
    lockCount = 0;
    document.body.style.overflow = savedOverflow;
  }
}

export function useDialog(onClose: () => void, { closeOnEscape = true } = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockScroll();
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
      unlockScroll();
      previouslyFocused?.focus();
    };
  }, [onClose, closeOnEscape]);

  return ref;
}
