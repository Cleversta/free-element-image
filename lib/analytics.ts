type AnalyticsEvent = {
  name: string;
  data?: Record<string, string | number | boolean>;
};

declare global {
  interface Window {
    umami?: {
      track: (
        eventName: string,
        data?: Record<string, string | number | boolean>,
      ) => void;
    };
    freelementAnalyticsQueue?: AnalyticsEvent[];
  }
}

export function trackAnalyticsEvent(
  name: string,
  data?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined") return;
  if (/^\/(admin|manage)(\/|$)/.test(window.location.pathname)) return;

  if (window.umami) {
    window.umami.track(name, data);
    return;
  }

  const queue = (window.freelementAnalyticsQueue ??= []);
  if (queue.length < 50) queue.push({ name, data });
}

export function flushAnalyticsQueue() {
  if (typeof window === "undefined" || !window.umami) return;
  const events = window.freelementAnalyticsQueue ?? [];
  window.freelementAnalyticsQueue = [];
  for (const event of events) window.umami.track(event.name, event.data);
}
