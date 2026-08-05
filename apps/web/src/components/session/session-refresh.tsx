"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SessionRefresh() {
  const router = useRouter();
  useEffect(() => {
    async function refresh() { const response = await fetch("/api/session/refresh", { method: "POST" }); if (response.status === 401) router.replace("/entrar"); }
    const timer = window.setInterval(() => void refresh(), 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
