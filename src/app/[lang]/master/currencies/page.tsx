import { CurrenciesManager } from "@/components/masterdata/currencies-manager"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"

export default function CurrenciesPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["masterdata", "common"]}>
                <CurrenciesManager />
            </I18nProvider>
        </DashboardLayout>
    )
}
