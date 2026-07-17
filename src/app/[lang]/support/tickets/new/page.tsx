import NewTicketFormWrapper from "@/components/Support/NewTicketFormWrapper"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"

export default function NewTicketRoute() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["support"]}>
                <NewTicketFormWrapper />
            </I18nProvider>
        </DashboardLayout>
    )
}
