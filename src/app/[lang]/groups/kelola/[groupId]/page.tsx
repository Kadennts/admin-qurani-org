import { KelolaGrupPage } from "@/components/dashboard/grup/kelola-grup-page"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"

interface PageProps {
  params: Promise<{
    groupId: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { groupId } = await params

  return (
    <DashboardLayout>
      <I18nProvider namespaces={["kelola grup", "grup saya", "grup detail"]}>
        <KelolaGrupPage groupId={groupId} />
      </I18nProvider>
    </DashboardLayout>
  )
}