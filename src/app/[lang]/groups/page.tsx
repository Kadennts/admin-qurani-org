import { Suspense } from "react"
import { GrupSaya } from "@/components/dashboard/grup/grup-saya"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"

export default function Page() {
  return (
    <DashboardLayout>
      <I18nProvider namespaces={["grup saya", "grup detail", "kelola grup", "common"]}>
        <Suspense fallback={null}>
          <GrupSaya />
        </Suspense>
      </I18nProvider>
    </DashboardLayout>
  )
}