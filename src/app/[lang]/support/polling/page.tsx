import SupportTicketsPage from "@/components/Support/SupportTicketsPage";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { I18nProvider } from "@/components/providers/i18n-provider";

export default function PollingPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["support"]}>
                <SupportTicketsPage />
            </I18nProvider>
        </DashboardLayout>
    )
}
