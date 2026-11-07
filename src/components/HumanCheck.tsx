import React, { useEffect, useRef } from 'react';

// Cloudflare Turnstile: xác minh người thật trước khi đặt xe / tra cứu (máy chủ kiểm lại bằng TURNSTILE_SECRET_KEY).
// Chưa đặt VITE_TURNSTILE_SITE_KEY thì không hiện gì và không chặn.
const SITE_KEY = (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || '';
export const HUMAN_CHECK_ENABLED = Boolean(SITE_KEY);

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
const loadScript = () =>
  (scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject();
    };
    document.head.appendChild(s);
  }));

interface HumanCheckProps {
  onToken: (token: string) => void;
  // Tăng số này để lấy token mới (mỗi token Turnstile chỉ dùng được một lần)
  resetSignal?: number;
}

export const HumanCheck: React.FC<HumanCheckProps> = ({ onToken, resetSignal }) => {
  const el = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !el.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(el.current, {
          sitekey: SITE_KEY,
          language: 'vi',
          size: 'flexible',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [onToken]);

  useEffect(() => {
    if (!resetSignal || !widgetId.current) return;
    window.turnstile?.reset(widgetId.current);
    onToken('');
  }, [resetSignal, onToken]);

  if (!SITE_KEY) return null;
  return <div ref={el} />;
};
