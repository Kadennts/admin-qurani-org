import { TimezonesManager } from "@/components/masterdata/timezones-manager"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"

export default function TimezonesPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["masterdata", "common"]}>
                <TimezonesManager />
            </I18nProvider>
        </DashboardLayout>
    )
}
