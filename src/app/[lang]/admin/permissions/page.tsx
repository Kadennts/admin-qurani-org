import { Suspense } from "react";
import Permissions from "@/components/admin/permissions";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { I18nProvider } from "@/components/providers/i18n-provider";

export const metadata = {
    title: "Permissions | Admin Qurani",
    description: "Kelola izin akses API untuk setiap role dalam sistem Qurani.",
}

export default function Page() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={['common']}>
                <Suspense fallback={null}>
                    <Permissions />
                </Suspense>
            </I18nProvider>
        </DashboardLayout>
    )
}
