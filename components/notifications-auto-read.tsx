"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** On mount, mark all notifications read then refresh so the bell badge clears. */
export default function NotificationsAutoRead({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!hasUnread) return;
    fetch("/api/notifications/read", { method: "POST" })
      .then(() => router.refresh())
      .catch(() => {});
  }, [hasUnread, router]);
  return null;
}
