"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DynamicTitle() {
  const pathname = usePathname();

  useEffect(() => {
    const p = pathname ?? "/"
    const APP = "Qurani"

    const getTitle = () => {
      const exactMap: Record<string, string> = {
        "/": `Dashboard | ${APP}`,
        "/dashboard": `Dashboard | ${APP}`,
        "/grup": `Grup | ${APP}`,
        "/notifikasi": `Notifikasi | ${APP}`,
        "/peta-statistik": `Peta Statistik | ${APP}`,
        "/profile": `Profil | ${APP}`,
        "/teman": `Teman | ${APP}`,
        "/tentang": `Tentang | ${APP}`,
        "/billing": `Billing | ${APP}`,
        "/billing/guru": `Guru | ${APP}`,
        "/billing/paket": `Paket | ${APP}`,
        "/billing/payout": `Payout | ${APP}`,
        "/groups/categories": `Group Categories | ${APP}`,
      }

      if (exactMap[p]) return exactMap[p];
      if (/^\/billing\/guru\/\d+/.test(p)) return `Profil Guru | ${APP}`;
      if (/^\/support\/kyc-organisasi\/[^/]+/.test(p)) return `Detail Organisasi | ${APP}`;
      if (p === "/support/kyc-organisasi") return `KYC Organisasi | ${APP}`;

      const segments = p.split("/").filter(Boolean)
      if (segments.length > 0) {
        const readable = segments.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ")).join(" - ")
        return `${readable} | ${APP}`
      }
      return `Modern Quran App | ${APP}`
    }

    const desiredTitle = getTitle();
    document.title = desiredTitle;

    const observer = new MutationObserver(() => {
      if (document.title !== desiredTitle) {
        document.title = desiredTitle;
      }
    });

    const titleElement = document.querySelector("title");
    if (titleElement) {
      observer.observe(titleElement, { childList: true });
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
