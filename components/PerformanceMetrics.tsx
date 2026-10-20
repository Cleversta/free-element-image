"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackAnalyticsEvent } from "@/lib/analytics";

export default function PerformanceMetrics() {
  useReportWebVitals((metric) => {
    trackAnalyticsEvent("web_vital", {
      metric: metric.name,
      value: Number(metric.value.toFixed(metric.name === "CLS" ? 4 : 0)),
      rating: metric.rating,
      path: window.location.pathname,
    });
  });

  return null;
}
