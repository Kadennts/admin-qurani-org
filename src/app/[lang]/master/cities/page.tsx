import { CitiesManager } from "@/components/masterdata/cities-manager"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"

export default function CitiesPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["masterdata", "common"]}>
                <CitiesManager />
            </I18nProvider>
        </DashboardLayout>
    )
}
