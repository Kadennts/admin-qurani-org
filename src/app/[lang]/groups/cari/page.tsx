import { CariGrup } from "@/components/dashboard/grup/cari-grup"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"

export default function Page() {
  return (
    <DashboardLayout>
      <I18nProvider namespaces={["grup saya", "grup detail", "cari grup", "common"]}>
        <CariGrup />
      </I18nProvider>
    </DashboardLayout>
  )
}