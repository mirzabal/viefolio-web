"use client";

import { useEffect, useRef } from "react";

/* Scroll reveal for the landing page. IntersectionObserver rather than
   framer-motion so the marketing pages ship no animation library, and
   `animation-timeline: view()` because Safari/Firefox don't support it yet.
   The motion itself lives in .reveal (globals.css), so reduced-motion is
   handled in one place. Fires once — re-animating on scroll-back is noise. */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No IntersectionObserver (or a prerendered crawler): show it, don't hide content.
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.visible = "true";
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.visible = "true";
          io.disconnect();
        }
      },
      { rootMargin: "-80px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
