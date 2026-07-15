import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { SkeletonDashboard } from "@/components/ui/skeletons"

export default function Loading() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8">
        <div className="max-w-[1400px] mx-auto">
          <SkeletonDashboard statCount={4} chartCount={4} />
        </div>
      </div>
    </DashboardLayout>
  )
}
