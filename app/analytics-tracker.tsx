"use client";

type Props = {
  eventName: string;
  children: React.ReactNode;
  href: string;
  className?: string;
  metadata?: Record<string, unknown>;
  target?: "_blank";
};

function getSessionId() {
  const key = "tfp_session_id";
  let value = window.localStorage.getItem(key);

  if (!value) {
    value = crypto.randomUUID();
    window.localStorage.setItem(key, value);
  }

  return value;
}

export function TrackedLink({ eventName, children, href, className, metadata, target }: Props) {
  async function trackClick() {
    try {
      await fetch("/api/analytics/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event_name: eventName,
          metadata: {
            href,
            ...metadata
          },
          session_id: getSessionId()
        }),
        keepalive: true
      });
    } catch {
      // Analytics must never block navigation.
    }
  }

  return (
    <a className={className} href={href} target={target} rel={target === "_blank" ? "noopener noreferrer" : undefined} onClick={trackClick}>
      {children}
    </a>
  );
}
