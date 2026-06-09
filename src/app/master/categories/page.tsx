import { CategoriesManager } from "@/components/masterdata/categories-manager"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"

export const metadata = {
    title: "Categories | Master Data | Qurani Admin",
    description: "Kelola kategori untuk guru dan kursus di platform Qurani",
}

export default function CategoriesPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["masterdata", "common"]}>
                <CategoriesManager />
            </I18nProvider>
        </DashboardLayout>
    )
}
