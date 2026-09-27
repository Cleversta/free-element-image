"use client";
import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    freelementAnalyticsFilter?: (
      type: string,
      payload: Record<string, unknown>,
    ) => Record<string, unknown> | false;
  }
}
export default function Analytics() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    window.freelementAnalyticsFilter = (_type, payload) => {
      if (/^\/(admin|manage)(\/|$)/.test(location.pathname)) return false;
      return payload;
    };
    setReady(true);
  }, []);
  if (!ready) return null;
  return (
    <Script
      src="https://cloud.umami.is/script.js"
      data-website-id="3fe95ba5-2c12-4bc1-9a65-4e1f9cff06de"
      data-domains="freelementimages.site,www.freelementimages.site"
      data-exclude-search="true"
      data-exclude-hash="true"
      data-do-not-track="true"
      data-before-send="freelementAnalyticsFilter"
      strategy="afterInteractive"
    />
  );
}
