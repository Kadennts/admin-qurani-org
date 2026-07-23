"use client"

import * as React from "react"
import { NavMain } from "@/components/ui/sidebar/nav-main"
import { NavUser } from "@/components/ui/sidebar/nav-user"
import { useI18n } from "@/components/providers/i18n-provider"

import {
  LayoutDashboard,
  Settings,
  CreditCard,
  Shield,
  Database,
  Users,
  Tags,
  UserCog,
  FileText,
  BookOpen,
  UserCheck,
  Bell,
  LucideIcon,
  Languages,
  GraduationCap,
  Package,
  Banknote,
  Tag,
  Receipt,
  Wallet,
  MessageSquare,
  Globe,
  CalendarDays,
  Star,
  KeyRound,
  History,
} from "lucide-react"
import { RxDashboard, } from "react-icons/rx"
import { MdAnnouncement } from "react-icons/md"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar/custom-sidebar"
import { SidebarDropdownProvider } from "./sidebar-dropdown-context"
import Image from "next/image"
import Link from "next/link"
import { NavTrigerSidebar } from "./nav-sidebar-tigger"

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon | React.ComponentType<React.SVGProps<SVGSVGElement>>
  items?: NavItem[]
}

const getSidebarData = (
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string
) => {
  const baseNavItems: NavItem[] = [
    {
      title: t("navigation.dashboard", "Dashboard Utama"),
      url: "/dashboard",
      icon: LayoutDashboard,
      items: [],
    },
    {
      title: t("navigation.support", "Support"),
      url: "/support",
      icon: MdAnnouncement,
      items: [
        {
          title: t("navigation.dashboard", "Dashboard"),
          url: "/support/dashboard",
          icon: RxDashboard,
        },
        {
          title: t("navigation.support_tickets", "Support Tickets"),
          url: "/support/tickets",
          icon: FileText,
        },
        {
          title: t("navigation.manage_groups", "Groups"),
          url: "/groups",
          icon: Users,
        },
        {
          title: t("navigation.recitation", "Recitation"),
          url: "/support/recitation",
          icon: BookOpen,
        },
        {
          title: t("navigation.kyc_member", "KYC Member"),
          url: "/support/kyc-member",
          icon: UserCheck,
        },
        {
          title: t("navigation.kyc_organization", "KYC Organisasi"),
          url: "/support/kyc-organisasi",
          icon: GraduationCap,
        },
      ],
    },
    {
      title: t("navigation.billing", "Billing"),
      url: "/billing",
      icon: CreditCard,
      items: [
        {
          title: t("navigation.dashboard", "Dashboard"),
          url: "/billing/dashboard",
          icon: RxDashboard,
        },
        {
          title: t("navigation.orders", "Pesanan"),
          url: "/billing/orders",
          icon: Receipt,
        },
        {
          title: t("navigation.promo_coupons", "Promo & Kupon"),
          url: "/billing/discountcodes",
          icon: Tag,
        },
        {
          title: t("navigation.wallet", "Wallet"),
          url: "/billing/wallet",
          icon: Wallet,
        },
        {
          title: t("navigation.history", "History Transaksi"),
          url: "/billing/history",
          icon: History,
        },
        {
          title: t("billing.payments.title", "Payment"),
          url: "/billing/payments",
          icon: Banknote,
        },
        {
          title: t("navigation.trainer_payout", "Payout"),
          url: "/billing/payout",
          icon: Banknote,
        },
      ],
    },
    {
      title: t("navigation.administrator", "Administrator"),
      url: "/admin",
      icon: Shield,
      items: [
        {
          title: t("navigation.dashboard", "Dashboard"),
          url: "/admin/dashboard",
          icon: RxDashboard,
        },
        {
          title: t("navigation.manage_users", "Users"),
          url: "/users/manage",
          icon: UserCog,
        },
        {
          title: t("navigation.roles", "Roles"),
          url: "/admin/roles",
          icon: Shield,
        },
        {
          title: t("navigation.permissions", "Permissions"),
          url: "/admin/permissions",
          icon: KeyRound,
        }
      ],
    },
    {
      title: t("navigation.master_data", "Master Data"),
      url: "/master",
      icon: Database,
      items: [
        {
          title: t("navigation.dashboard", "Dashboard"),
          url: "/master/dashboard",
          icon: RxDashboard,
        },
        {
          title: t("navigation.countries", "Countries"),
          url: "/master/countries",
          icon: Database,
        },
        {
          title: t("navigation.states", "States"),
          url: "/master/states",
          icon: Database,
        },
        {
          title: t("navigation.cities", "Cities"),
          url: "/master/cities",
          icon: Database,
        },
        {
          title: t("navigation.currencies", "Currencies"),
          url: "/master/currencies",
          icon: Database,
        },
        {
          title: t("navigation.languages", "Languages"),
          url: "/master/languages",
          icon: Languages,
        },
        {
          title: t("navigation.locales", "Locales"),
          url: "/master/locales",
          icon: Languages,
        },
        {
          title: t("navigation.timezones", "Timezones"),
          url: "/master/timezones",
          icon: Globe,
        },
        {
          title: t("navigation.categories", "Categories"),
          url: "/master/categories",
          icon: Tag,
        },
        {
          title: t("navigation.tax_rates", "Tax Rates"),
          url: "/billing/taxrates",
          icon: Receipt,
        },
        {
          title: t("navigation.member_subscription", "Member Subscription"),
          url: "/billing/member-subscription",
          icon: UserCheck,
        },
      ],
    },
    {
      title: t("navigation.trainers_management", "Trainer Management"),
      url: "/teachers",
      icon: GraduationCap,
      items: [
        {
          title: t("navigation.trainers", "Active Trainers"),
          url: "/teachers",
          icon: GraduationCap,
        },
        {
          title: t("navigation.trainer_applications", "Pengajuan Guru"),
          url: "/teachers/applications",
          icon: UserCheck,
        },
        {
          title: t("navigation.trainer_calendar", "Kalender"),
          url: "/teachers/calendar",
          icon: CalendarDays,
        },
        {
          title: t("navigation.trainer_performance", "Performa Penyeleksi"),
          url: "/teachers/performance",
          icon: Star,
        },
        {
          title: t("navigation.packages", "Packages"),
          url: "/teachers/packages",
          icon: Package,
        },
      ],
    },
    {
      title: t("navigation.notifications", "Notifications"),
      url: "/notification",
      icon: Bell,
      items: [],
    },
    {
      title: t("navigation.settings", "Settings"),
      url: "/settings",
      icon: Settings,
      items: [],
    },
  ]

  return { navMain: baseNavItems }
}

const Logo = React.memo(function Logo() {
  const { state, isMobile } = useSidebar()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Sebelum mount: render expanded view supaya cocok dengan server HTML
  const isCollapsed = mounted ? (state === "collapsed" && !isMobile) : false

  return (
    <div className="transition-all duration-200 ease-in-out">
      {!isCollapsed ? (
        <div className="flex items-center justify-center px-4 py-3">
          <Link
            href="/dashboard"
            className="text-2xl font-cairo text-gray-700 dark:hidden tracking-tight flex items-center gap-0.5"
          >
            <Image
              src="/icons/Qurani - Logo Green.png"
              alt="Qurani"
              width={100}
              height={100}
            />
          </Link>

          <Link
            href="/dashboard"
            className="text-2xl font-cairo text-gray-700 hidden dark:flex tracking-tight items-center gap-0.5"
          >
            <Image
              src="/icons/Qurani - Logo White.png"
              alt="Qurani"
              width={100}
              height={100}
            />
          </Link>
        </div>
      ) : (
        <Link href="/dashboard" className="flex items-center justify-center mt-3">
          <Image
            src="/icons/Qurani - Icon2 Green.png"
            alt="Qurani"
            width={25}
            height={25}
            className="dark:hidden"
          />
          <Image
            src="/icons/Qurani - Icon2 White.png"
            alt="Qurani"
            width={25}
            height={25}
            className="hidden dark:block"
          />
        </Link>
      )}
    </div>
  )
})

export const AppSidebar = React.memo(function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const { t } = useI18n()

  const sidebarData = React.useMemo(() => getSidebarData(t), [t])

  const dropdownContextValue = React.useMemo(
    () => ({
      isDropdownOpen,
      setIsDropdownOpen,
    }),
    [isDropdownOpen]
  )

  return (
    <SidebarDropdownProvider value={dropdownContextValue}>
      <Sidebar collapsible="icon" {...props}>
        <div className="h-full flex flex-col">
          <SidebarHeader>
            <Logo />
          </SidebarHeader>

          <SidebarContent className="flex-1">
            <NavMain items={sidebarData.navMain} />
          </SidebarContent>

          <SidebarFooter>
            <div className="hidden md:block">
              <NavTrigerSidebar />
            </div>
            <NavUser />
          </SidebarFooter>
        </div>
      </Sidebar>
    </SidebarDropdownProvider>
  )
})
