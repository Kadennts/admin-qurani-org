import { Suspense } from "react";
import Roles from "@/components/admin/roles";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { I18nProvider } from "@/components/providers/i18n-provider";

export default function Page() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={['common']}>
                <Suspense fallback={null}>
                    <Roles />
                </Suspense>
            </I18nProvider>
        </DashboardLayout>
    )
}
