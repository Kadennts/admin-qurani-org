import HasilSetoranTable from "@/components/admin/tabel-setoran";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { I18nProvider } from "@/components/providers/i18n-provider";

export default function Page() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={['common', 'hasil-setoran']}>
                <HasilSetoranTable />
            </I18nProvider>
        </DashboardLayout>
    )
}
