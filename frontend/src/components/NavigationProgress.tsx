"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPathname = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      completionRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
      prevPathname.current = pathname;
    }
    return () => {
      if (completionRef.current) clearTimeout(completionRef.current);
    };
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a[href]");
      if (!target) return;
      const href = (target as HTMLAnchorElement).getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto")) return;
      if (href !== pathname) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (completionRef.current) clearTimeout(completionRef.current);
        setVisible(true);
        setProgress(15);
        let p = 15;
        timerRef.current = setInterval(() => {
          p = Math.min(p + Math.random() * 12, 80);
          setProgress(p);
          if (p >= 80 && timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }, 200);
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[2px] pointer-events-none"
      style={{
        width: `${progress}%`,
        transition: progress === 100 ? "width 200ms ease-out" : "width 200ms linear",
        background: "linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa)",
        boxShadow: "0 0 10px rgba(59,130,246,0.9), 0 0 20px rgba(59,130,246,0.5)",
      }}
    />
  );
}
