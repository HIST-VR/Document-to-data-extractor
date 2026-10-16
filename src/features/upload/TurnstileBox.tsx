import { useEffect, useRef } from "react";
import { activeTheme } from "../../lib/prefs";

let loader: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loader = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return loader;
}

export function TurnstileBox({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const node = holder.current;
    if (!node) return undefined;
    let cancelled = false;
    let widgetId: string | null = null;

    void loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile || !holder.current) return;
        widgetId = window.turnstile.render(holder.current, {
          sitekey: siteKey,
          theme: activeTheme(),
          callback: (token) => {
            if (!cancelled) onTokenRef.current(token);
          },
          "expired-callback": () => {
            if (!cancelled) onTokenRef.current(null);
          },
          "error-callback": () => {
            if (!cancelled) onTokenRef.current(null);
          },
        });
      })
      .catch(() => {
        if (!cancelled) onTokenRef.current(null);
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return <div ref={holder} className="min-h-11" />;
}
