import { CountryDetail } from "@/components/masterdata/country-detail"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function CountryDetailPage({ params }: PageProps) {
    const { id } = await params
    return (
        <DashboardLayout>
            <div className="container mx-auto py-6 max-w-7xl">
                <CountryDetail id={id} />
            </div>
        </DashboardLayout>
    )
}
