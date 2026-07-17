import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { LocalesManager } from "@/components/masterdata/locales-manager"

export default function LocalesPage() {
    return (
        <DashboardLayout>
            <LocalesManager />
        </DashboardLayout>
    )
}
