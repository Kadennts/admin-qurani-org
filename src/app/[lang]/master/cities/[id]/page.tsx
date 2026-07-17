import { CityDetail } from "@/components/masterdata/city-detail"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function CityDetailPage({ params }: PageProps) {
    const { id } = await params
    return (
        <DashboardLayout>
            <div className="container mx-auto py-6 max-w-7xl">
                <CityDetail id={id} />
            </div>
        </DashboardLayout>
    )
}
