"use client"

import { Notifikasi } from "@/components/admin/notifikasi"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { useAuth } from "@/hooks"

export default function Page() {

    const { userId, loading } = useAuth()

    if (loading || !userId) return null

    return (
        <DashboardLayout>
            <I18nProvider namespaces={["common", "notifikasi"]}>
                <Notifikasi userId={userId} />
            </I18nProvider>
        </DashboardLayout>
    )
}
