import SupportDashboard from "@/components/Support/SupportDashboard";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { I18nProvider } from "@/components/providers/i18n-provider";

export default function SupportDashboardPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["support"]}>
                <SupportDashboard />
            </I18nProvider>
        </DashboardLayout>
    )
}
