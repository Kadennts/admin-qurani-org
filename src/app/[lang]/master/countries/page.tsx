import { CountriesManager } from "@/components/masterdata/countries-manager"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"

export default function CountriesPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["masterdata", "common"]}>
                <CountriesManager />
            </I18nProvider>
        </DashboardLayout>
    )
}
