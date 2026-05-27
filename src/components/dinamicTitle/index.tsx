"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DynamicTitle() {
  const pathname = usePathname();

  useEffect(() => {
    const p = pathname ?? "/"
    const APP = "Qurani"

    const exactMap: Record<string, string> = {
      "/": `${APP} - Dashboard`,
      "/dashboard": `${APP} - Dashboard`,
      "/grup": `${APP} - Grup`,
      "/notifikasi": `${APP} - Notifikasi`,
      "/peta-statistik": `${APP} - Peta Statistik`,
      "/profile": `${APP} - Profil`,
      "/teman": `${APP} - Teman`,
      "/tentang": `${APP} - Tentang`,
      "/billing": `${APP} - Billing`,
      "/billing/guru": `${APP} - Manajemen Guru`,
      "/billing/paket": `${APP} - Manajemen Paket`,
      "/billing/payout": `${APP} - Payout`,
    }

    if (exactMap[p]) { document.title = exactMap[p]; return }
    if (/^\/billing\/guru\/\d+/.test(p)) { document.title = `${APP} - Profil Guru`; return }

    const segments = p.split("/").filter(Boolean)
    if (segments.length > 0) {
      const readable = segments.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ")).join(" - ")
      document.title = `${APP} - ${readable}`
    } else {
      document.title = `${APP} - Modern Quran App`
    }
  }, [pathname]);

  return null;
}
