import { StatesManager } from "@/components/masterdata/states-manager"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"

export default function StatesPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["masterdata", "common"]}>
                <StatesManager />
            </I18nProvider>
        </DashboardLayout>
    )
}
