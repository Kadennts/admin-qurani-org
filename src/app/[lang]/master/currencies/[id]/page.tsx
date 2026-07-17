import CurrencyDetail from "@/components/masterdata/currency-detail-view"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function CurrencyDetailPage({ params }: PageProps) {
    const { id } = await params
    return (
        <DashboardLayout>
            <div className="container mx-auto py-6 max-w-7xl">
                <CurrencyDetail id={id} />
            </div>
        </DashboardLayout>
    )
}
