import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { LanguagesManager } from "@/components/masterdata/languages-manager"

export default function LanguagesPage() {
    return (
        <DashboardLayout>
            <LanguagesManager />
        </DashboardLayout>
    )
}
