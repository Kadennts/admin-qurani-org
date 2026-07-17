import { GrupDetailPage } from "@/components/dashboard/grup/grup-detail-page"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"

interface PageProps {
    params: Promise<{
        groupId: string
    }>
}

export default async function Page({ params }: PageProps) {
    const { groupId } = await params

    return (
        <DashboardLayout>
            <GrupDetailPage groupId={groupId} />
        </DashboardLayout>
    )
}
