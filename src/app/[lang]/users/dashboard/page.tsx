import StatistikUser from "@/components/statistik/StatistikUser";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { I18nProvider } from "@/components/providers/i18n-provider";

export default function Page() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["statistik", "hasil-setoran"]}>
                <StatistikUser />
            </I18nProvider>
        </DashboardLayout>
    )
}
