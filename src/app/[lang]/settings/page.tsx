import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import Qurani from "@/components/admin/qurani";
import { I18nProvider } from "@/components/providers/i18n-provider";


export default function Page() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["kelola grup", "common", "setting global"]}>
                < Qurani/>
            </I18nProvider>
        </DashboardLayout>
    )
}