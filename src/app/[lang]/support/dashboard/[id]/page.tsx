import TicketDetailPageWrapper from "@/components/Support/TicketDetailPageWrapper";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { I18nProvider } from "@/components/providers/i18n-provider";

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function TicketDetail({ params }: PageProps) {
    const { id } = await params

    return (
        <DashboardLayout>
            <I18nProvider namespaces={["support"]}>
                <TicketDetailPageWrapper ticketId={id} backUrl="/support/dashboard" />
            </I18nProvider>
        </DashboardLayout>
    )
}
