"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import {
    Search, ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle,
    Wallet, ArrowUpRight, Check, X, MoreVertical,
    History, RefreshCw, AlertCircle
} from "lucide-react"
import Image from "next/image"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import { walletApi } from "@/lib/api"
import DUMMY_DATA from "@/data/dummy-wallet.json"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNowStrict } from "date-fns"
import { id, enUS } from "date-fns/locale"

// ── helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n).replace("IDR", "Rp")
}

function formatDate(dateString: string | null, variant: 'short' | 'long' | 'relative' = 'long', tz: string = 'UTC', locale: string = 'en') {
    if (!dateString) return "—"
    try {
        let dateStr = String(dateString).trim()
        if (dateStr.includes(' ') && !dateStr.includes('T')) {
            dateStr = dateStr.replace(' ', 'T')
        }
        if (!dateStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
            dateStr = dateStr + 'Z'
        }
        const date = new Date(dateStr)
        if (Number.isNaN(date.getTime())) return dateString

        if (variant === 'relative') {
            const localeObj = locale === 'id' ? id : enUS
            return formatDistanceToNowStrict(date, { addSuffix: true, locale: localeObj })
        }

        const options: Intl.DateTimeFormatOptions = {
            day: "2-digit",
            month: "short",
            timeZone: tz,
        }

        if (variant === 'long') {
            options.year = "numeric"
            options.hour = "2-digit"
            options.minute = "2-digit"
            options.hour12 = false
            options.timeZoneName = "short"
        }

        return new Intl.DateTimeFormat(
            locale === 'id' ? 'id-ID' : 'en-GB',
            options
        ).format(date)
    } catch {
        return dateString
    }
}

interface PendingWithdraw {
    id: number | string;
    userId: number | string;
    user?: {
        id: number | string;
        name: string;
        email: string;
        username?: string;
        avatar?: string;
    };
    amount: number;
    status: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    createdAt: string;
    reason?: string | null;
}

type ActivePayoutTab = 'pending' | 'riwayat_withdraw';

function getWithdrawStatusBadge(status: string | undefined) {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "approved" || s === "success") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" />Selesai</span>;
    }
    if (s === "pending" || s === "waiting") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>;
    }
    if (s === "rejected" || s === "failed" || s === "cancelled") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Ditolak</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{status || "—"}</span>;
}

function PayoutContent() {
    const { t, locale } = useTranslation(['billing', 'common'])
    const { profile } = useAuth()

    const resolveTimezone = useCallback(() => {
        const isValidTimezone = (tz: string) => {
            try {
                new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(new Date())
                return true
            } catch {
                return false
            }
        }

        let cachedTimezone = ""
        try {
            const raw = localStorage.getItem('myqurani_user_profile_v2')
            if (raw) {
                const parsed = JSON.parse(raw)
                cachedTimezone = String(parsed?.timezone || "").trim()
            }
        } catch {
            // no-op
        }

        const fromProfile = String(profile?.timezone || "").trim()
        const preferred = cachedTimezone || fromProfile
        if (preferred && isValidTimezone(preferred)) return preferred
        if (fromProfile && isValidTimezone(fromProfile)) return fromProfile

        // Fallback ke browser timezone sebelum "UTC"
        try {
            const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
            if (browserTz && isValidTimezone(browserTz)) return browserTz
        } catch {
            // no-op
        }
        return "UTC"
    }, [profile?.timezone])

    const [userTimezone, setUserTimezone] = useState<string>("UTC")

    useEffect(() => {
        setUserTimezone(resolveTimezone())
    }, [resolveTimezone])

    const [activeTab, setActiveTab] = useState<ActivePayoutTab>('pending');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [withdraws, setWithdraws] = useState<PendingWithdraw[]>([]);

    // Search & Pagination (Pending)
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    // Riwayat Withdraw state
    const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);
    const [withdrawHistoryLoading, setWithdrawHistoryLoading] = useState(false);
    const [withdrawHistoryError, setWithdrawHistoryError] = useState<string | null>(null);
    const [withdrawHistoryPage, setWithdrawHistoryPage] = useState(1);
    const [withdrawHistoryTotalPages, setWithdrawHistoryTotalPages] = useState(1);
    const WITHDRAW_HISTORY_PAGE_SIZE = 10;

    // Modal states
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'approve_withdraw' | 'reject_withdraw' | 'complete_withdraw' | null;
        item: PendingWithdraw | null;
    }>({ isOpen: false, type: null, item: null });

    const [modalInput, setModalInput] = useState({ reason: "", extId: "", ref: "" });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, withdrawsRes] = await Promise.allSettled([
                walletApi.getStatisticsOverview(),
                walletApi.getPendingWithdraws()
            ]);

            let fetchedStats = null;
            let fetchedWithdraws: PendingWithdraw[] = [];

            if (statsRes.status === 'fulfilled' && statsRes.value) {
                fetchedStats = statsRes.value.data || statsRes.value;
            }
            if (withdrawsRes.status === 'fulfilled' && withdrawsRes.value) {
                fetchedWithdraws = withdrawsRes.value.data || withdrawsRes.value;
                if (!Array.isArray(fetchedWithdraws)) fetchedWithdraws = [];
            }

            // Fallback to dummy data
            if (!fetchedStats) fetchedStats = DUMMY_DATA.statistics;
            if (fetchedWithdraws.length === 0) fetchedWithdraws = DUMMY_DATA.pendingWithdraws;

            // Apply search filter locally
            if (activeSearch) {
                const lowerQuery = activeSearch.toLowerCase();
                fetchedWithdraws = fetchedWithdraws.filter((w) =>
                    w.user?.name?.toLowerCase().includes(lowerQuery) ||
                    w.bankName?.toLowerCase().includes(lowerQuery) ||
                    w.id.toString().includes(lowerQuery)
                );
            }

            setStats(fetchedStats);
            setWithdraws(fetchedWithdraws);

        } catch (error) {
            console.error("Error fetching payout data:", error);
            setStats(DUMMY_DATA.statistics);
            setWithdraws(DUMMY_DATA.pendingWithdraws);
        } finally {
            setLoading(false);
        }
    }, [activeSearch]);

    // Fetch Riwayat Withdraw
    const fetchWithdrawHistory = useCallback(async (page: number) => {
        setWithdrawHistoryLoading(true);
        setWithdrawHistoryError(null);
        try {
            const res = await walletApi.getWithdrawHistory({ page, pageSize: WITHDRAW_HISTORY_PAGE_SIZE });
            const data = res?.data || res;
            const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
            const total = data?.totalPages || data?.totalCount
                ? Math.ceil((data.totalCount || items.length) / WITHDRAW_HISTORY_PAGE_SIZE)
                : Math.max(1, Math.ceil(items.length / WITHDRAW_HISTORY_PAGE_SIZE));

            // Fallback ke dummy data jika API kosong
            if (items.length === 0) {
                const dummyItems = DUMMY_DATA.withdrawHistory || [];
                setWithdrawHistory(dummyItems);
                setWithdrawHistoryTotalPages(Math.max(1, Math.ceil(dummyItems.length / WITHDRAW_HISTORY_PAGE_SIZE)));
            } else {
                setWithdrawHistory(items);
                setWithdrawHistoryTotalPages(total);
            }
        } catch (err: any) {
            console.error("Error fetching withdraw history:", err);
            // Fallback ke dummy data saat error
            const dummyItems = DUMMY_DATA.withdrawHistory || [];
            setWithdrawHistory(dummyItems);
            setWithdrawHistoryTotalPages(Math.max(1, Math.ceil(dummyItems.length / WITHDRAW_HISTORY_PAGE_SIZE)));
            setWithdrawHistoryError(null); // hilangkan pesan error karena ada dummy
        } finally {
            setWithdrawHistoryLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (activeTab === 'riwayat_withdraw') fetchWithdrawHistory(withdrawHistoryPage);
    }, [activeTab, withdrawHistoryPage, fetchWithdrawHistory]);

    const handleSearch = () => {
        setActiveSearch(searchInput);
        setPage(1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    const executeAction = async () => {
        const { type, item } = actionModal;
        if (!type || !item) return;

        try {
            if (type === 'approve_withdraw') {
                await walletApi.approveWithdraw(item.id);
                showToast({ type: "success", title: "Berhasil", message: "Withdraw request approved." });
            } else if (type === 'reject_withdraw') {
                if (!modalInput.reason) throw new Error("Alasan penolakan harus diisi.");
                await walletApi.rejectWithdraw(item.id, modalInput.reason);
                showToast({ type: "success", title: "Berhasil", message: "Withdraw request rejected." });
            } else if (type === 'complete_withdraw') {
                await walletApi.completeWithdraw(item.id, modalInput.extId, modalInput.ref);
                showToast({ type: "success", title: "Berhasil", message: "Withdraw request completed." });
            }

            fetchData();
            setActionModal({ isOpen: false, type: null, item: null });
            setModalInput({ reason: "", extId: "", ref: "" });
        } catch (error: any) {
            showToast({ type: "error", title: "Gagal", message: error.message || 'Failed to perform action' });
        }
    };

    const openModal = (type: typeof actionModal.type, item: PendingWithdraw) => {
        setActionModal({ isOpen: true, type, item });
        setModalInput({ reason: "", extId: "", ref: "" });
    };

    const totalPages = Math.max(1, Math.ceil(withdraws.length / PAGE_SIZE));
    const paged = withdraws.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const tz = userTimezone

    return (
        <TooltipProvider>
            <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
                <ToastContainer />
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payout</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveTab(activeTab === 'pending' ? 'riwayat_withdraw' : 'pending')}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
                            >
                                {activeTab === 'pending' ? (
                                    <>
                                        <History className="w-4 h-4 text-gray-500" />
                                        <span>Lihat Riwayat Withdraw</span>
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-4 h-4 text-gray-500" />
                                        <span>Lihat Antrean Pending</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ── Overview Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { label: "Request Withdraw", value: stats?.totalPendingWithdraws || withdraws.length, icon: Clock, bg: "bg-amber-100 dark:bg-amber-900/30", iconClr: "text-amber-600 dark:text-amber-400" },
                            { label: "Volume Withdraw", value: formatRupiah(stats?.volumeThisMonth || 0), icon: ArrowUpRight, bg: "bg-blue-100 dark:bg-blue-900/30", iconClr: "text-blue-600 dark:text-blue-400" },
                            { label: "Total Antrean", value: formatRupiah(withdraws.reduce((a, b) => a + b.amount, 0)), icon: Wallet, bg: "bg-violet-100 dark:bg-violet-900/30", iconClr: "text-violet-600 dark:text-violet-400" },
                        ].map(card => {
                            const Icon = card.icon;
                            return (
                                <div key={card.label} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                                    <div className={`p-3 ${card.bg} ${card.iconClr} rounded-lg`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                                            {loading ? "..." : card.value}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* ── Table Section with Tabs ── */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        {/* Tab Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-end border-b border-gray-100 dark:border-gray-700 px-4 pt-3 pb-3 gap-3 min-h-[64px]">

                            {activeTab === 'pending' && (
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="flex flex-1 sm:w-72 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-shadow">
                                        <div className="relative flex-1 bg-white dark:bg-gray-900">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                value={searchInput}
                                                onChange={e => setSearchInput(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Cari nama guru atau bank..."
                                                className="w-full pl-9 pr-3 py-1.5 text-sm bg-transparent border-none focus:outline-none focus:ring-0 dark:text-white"
                                            />
                                        </div>
                                        <button
                                            onClick={handleSearch}
                                            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
                                        >
                                            Cari
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'riwayat_withdraw' && (
                                <div className="flex items-center justify-end">
                                    <button 
                                        onClick={() => fetchWithdrawHistory(withdrawHistoryPage)} 
                                        className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 transition-colors"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ══ TAB: ANTREAN PENDING ══ */}
                        {activeTab === 'pending' && (
                        <>
                        {/* MOBILE CARD VIEW (<640px) */}
                        <div className="space-y-3 sm:hidden p-4">
                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 animate-pulse">
                                            <div className="flex justify-between items-start"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-16 rounded-full" /></div>
                                            <div className="grid grid-cols-2 gap-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" /></div>
                                        </div>
                                    ))}
                                </div>
                            ) : paged.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                    <p>Tidak ada antrean payout pending</p>
                                </div>
                            ) : paged.map(p => {
                                const userUsername = p.user?.username
                                    ? `@${p.user.username}`
                                    : p.user?.email
                                        ? `@${p.user.email.split('@')[0]}`
                                        : null;
                                return (
                                    <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">
                                                    #{p.id}
                                                </span>
                                            </div>
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help border-b border-dashed border-gray-400 dark:border-gray-500 pb-px">
                                                            {formatDate(p.createdAt, 'relative', tz, locale)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" align="center">
                                                        <p className="text-xs">{formatDate(p.createdAt, 'long', tz, locale)}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                                {p.user?.avatar ? (
                                                    <Image src={p.user.avatar} alt={p.user?.name || ''} fill className="object-cover" unoptimized />
                                                ) : (
                                                    p.user?.name?.charAt(0) || 'U'
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{p.user?.name || `User ID: ${p.userId}`}</p>
                                                {userUsername && <p className="text-[11px] text-gray-400 truncate">{userUsername}</p>}
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {p.bankName ? `${p.bankName} • ${p.accountNumber}` : '—'}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(p.amount)}</p>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="mt-1 p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Aksi Payout</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openModal('approve_withdraw', p)}>
                                                            <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                            <span className="font-medium text-emerald-600">Approve Request</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openModal('complete_withdraw', p)}>
                                                            <CheckCircle2 className="w-4 h-4 mr-2 text-blue-600" />
                                                            <span className="font-medium text-blue-600">Mark as Completed</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openModal('reject_withdraw', p)}>
                                                            <X className="w-4 h-4 mr-2 text-red-600" />
                                                            <span className="font-medium text-red-600">Reject Request</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* DESKTOP TABLE (≥640px) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">ID</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Guru</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4 hidden md:table-cell">Bank Tujuan</th>
                                        <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Nominal (Net)</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4 hidden lg:table-cell">Tgl Request</th>
                                        <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6}>
                                                <div className="space-y-3 py-4 px-6">
                                                    {[...Array(4)].map((_, i) => (
                                                        <div key={i} className="flex items-center gap-4 animate-pulse">
                                                            <Skeleton className="h-3 w-full max-w-[120px]" />
                                                            <Skeleton className="h-3 w-full max-w-[80px]" />
                                                            <Skeleton className="h-3 w-full max-w-[100px]" />
                                                            <Skeleton className="h-3 w-full max-w-[60px]" />
                                                            <Skeleton className="h-3 w-full max-w-[90px]" />
                                                            <Skeleton className="h-3 w-full max-w-[50px]" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paged.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-gray-400">
                                                <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                                <p>Tidak ada antrean payout pending</p>
                                            </td>
                                        </tr>
                                    ) : paged.map(p => {
                                        const userUsername = p.user?.username
                                            ? `@${p.user.username}`
                                            : p.user?.email
                                                ? `@${p.user.email.split('@')[0]}`
                                                : null;

                                        return (
                                            <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">
                                                        #{p.id}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                                            {p.user?.avatar ? (
                                                                <Image src={p.user.avatar} alt={p.user?.name || ''} fill className="object-cover" unoptimized />
                                                            ) : (
                                                                p.user?.name?.charAt(0) || 'U'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{p.user?.name || `User ID: ${p.userId}`}</p>
                                                            {userUsername && <p className="text-[11px] text-gray-400 mt-0.5">{userUsername}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <div className="text-xs font-bold text-gray-900 dark:text-white">{p.bankName}</div>
                                                    <div className="text-[11px] font-mono text-gray-500 mt-0.5">{p.accountNumber}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase mt-0.5">{p.accountName}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{formatRupiah(p.amount)}</span>
                                                </td>
                                                <td className="px-6 py-4 hidden lg:table-cell">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-help whitespace-nowrap border-b border-dashed border-gray-400 dark:border-gray-500 pb-px">
                                                                {formatDate(p.createdAt, 'relative', tz, locale)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" align="center">
                                                            <p className="text-xs">
                                                                {formatDate(p.createdAt, 'long', tz, locale)}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center items-center gap-2">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuLabel>Aksi Payout</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => openModal('approve_withdraw', p)}>
                                                                    <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                                    <span className="font-medium text-emerald-600">Approve Request</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => openModal('complete_withdraw', p)}>
                                                                    <CheckCircle2 className="w-4 h-4 mr-2 text-blue-600" />
                                                                    <span className="font-medium text-blue-600">Mark as Completed</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => openModal('reject_withdraw', p)}>
                                                                    <X className="w-4 h-4 mr-2 text-red-600" />
                                                                    <span className="font-medium text-red-600">Reject Request</span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {!loading && withdraws.length > 0 && activeTab === 'pending' && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, withdraws.length)}–{Math.min(page * PAGE_SIZE, withdraws.length)} dari {withdraws.length} data
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs font-bold px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        {page} / {totalPages}
                                    </span>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                        </>
                        )}

                        {/* ══ TAB: RIWAYAT WITHDRAW ══ */}
                        {activeTab === 'riwayat_withdraw' && (
                        <>
                            {withdrawHistoryError && (
                                <div className="mx-4 mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-2 items-center">
                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                    <span className="text-xs text-red-700 dark:text-red-300">{withdrawHistoryError}</span>
                                </div>
                            )}

                            {/* Mobile */}
                            <div className="space-y-3 sm:hidden p-4">
                                {withdrawHistoryLoading ? (
                                    <div className="space-y-3">{[...Array(3)].map((_, i) => (
                                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 animate-pulse">
                                            <Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" />
                                        </div>
                                    ))}</div>
                                ) : withdrawHistory.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">
                                        <History className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                        <p className="text-sm">Belum ada riwayat withdraw</p>
                                    </div>
                                ) : withdrawHistory.slice((withdrawHistoryPage - 1) * WITHDRAW_HISTORY_PAGE_SIZE, withdrawHistoryPage * WITHDRAW_HISTORY_PAGE_SIZE).map((item: any) => (
                                    <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 bg-white dark:bg-gray-800 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">#{item.id}</span>
                                            {getWithdrawStatusBadge(item.status)}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.user?.name || `User ID: ${item.userId}`}</div>
                                        <div className="text-xs text-gray-500">{item.bankName ? `${item.bankName} • ${item.accountNumber}` : '—'}</div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="font-bold text-emerald-600 text-sm">{item.amount !== undefined ? formatRupiah(item.amount) : '—'}</span>
                                            {item.createdAt ? <span className="text-xs text-gray-500">{formatDate(item.createdAt, 'relative', tz, locale)}</span> : '—'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">ID</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">User</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4 hidden md:table-cell">Bank Tujuan</th>
                                            <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Nominal</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4 hidden lg:table-cell">Tgl Request</th>
                                            <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {withdrawHistoryLoading && (
                                            <tr><td colSpan={6}><div className="space-y-3 py-4 px-6">
                                                {[...Array(4)].map((_, i) => (
                                                    <div key={i} className="flex items-center gap-4 animate-pulse">
                                                        <Skeleton className="h-3 w-[80px]" /><Skeleton className="h-3 w-[120px]" />
                                                        <Skeleton className="h-3 w-[100px]" /><Skeleton className="h-3 w-[90px]" />
                                                        <Skeleton className="h-3 w-[100px]" /><Skeleton className="h-3 w-[70px]" />
                                                    </div>
                                                ))}
                                            </div></td></tr>
                                        )}
                                        {!withdrawHistoryLoading && withdrawHistory.length === 0 && (
                                            <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                                                <History className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                                <p>Belum ada riwayat withdraw</p>
                                            </td></tr>
                                        )}
                                        {!withdrawHistoryLoading && withdrawHistory.slice((withdrawHistoryPage - 1) * WITHDRAW_HISTORY_PAGE_SIZE, withdrawHistoryPage * WITHDRAW_HISTORY_PAGE_SIZE).map((item: any) => {
                                            const userUsername = item.user?.username
                                                ? `@${item.user.username}`
                                                : item.user?.email
                                                    ? `@${item.user.email.split('@')[0]}`
                                                    : null;
                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">#{item.id}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{item.user?.name || `User ID: ${item.userId}`}</p>
                                                        {userUsername && <p className="text-[11px] text-gray-400">{userUsername}</p>}
                                                    </td>
                                                    <td className="px-6 py-4 hidden md:table-cell">
                                                        <div className="text-xs font-bold text-gray-900 dark:text-white">{item.bankName || '—'}</div>
                                                        <div className="text-[11px] font-mono text-gray-500">{item.accountNumber || ''}</div>
                                                        <div className="text-[10px] text-gray-400 uppercase">{item.accountName || ''}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.amount !== undefined ? formatRupiah(item.amount) : '—'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 hidden lg:table-cell">
                                                        {item.createdAt ? (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-help whitespace-nowrap border-b border-dashed border-gray-400 pb-px">
                                                                        {formatDate(item.createdAt, 'relative', tz, locale)}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">
                                                                    <p className="text-xs">{formatDate(item.createdAt, 'long', tz, locale)}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">{getWithdrawStatusBadge(item.status)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Riwayat Withdraw */}
                            {!withdrawHistoryLoading && withdrawHistory.length > 0 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        Menampilkan {Math.min((withdrawHistoryPage - 1) * WITHDRAW_HISTORY_PAGE_SIZE + 1, withdrawHistory.length)}–{Math.min(withdrawHistoryPage * WITHDRAW_HISTORY_PAGE_SIZE, withdrawHistory.length)} dari {withdrawHistory.length} data
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => setWithdrawHistoryPage(p => Math.max(1, p - 1))} disabled={withdrawHistoryPage === 1}
                                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-xs font-bold px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">{withdrawHistoryPage} / {withdrawHistoryTotalPages}</span>
                                        <button onClick={() => setWithdrawHistoryPage(p => Math.min(withdrawHistoryTotalPages, p + 1))} disabled={withdrawHistoryPage === withdrawHistoryTotalPages}
                                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                        )}

                    </div>

                    {/* ── Modals ── */}
                    {actionModal.isOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {actionModal.type === 'approve_withdraw' && 'Approve Withdraw'}
                                        {actionModal.type === 'reject_withdraw' && 'Reject Withdraw'}
                                        {actionModal.type === 'complete_withdraw' && 'Complete Withdraw'}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Anda akan melakukan aksi pada penarikan dana <span className="font-bold text-gray-900 dark:text-white">{actionModal.item?.user?.name || `User ID: ${actionModal.item?.userId}`}</span> senilai <span className="font-bold text-emerald-600">{formatRupiah(actionModal.item?.amount || 0)}</span>.
                                    </p>
                                </div>

                                <div className="p-6 space-y-4">
                                    {actionModal.type === 'reject_withdraw' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan Penolakan <span className="text-red-500">*</span></label>
                                            <textarea
                                                value={modalInput.reason}
                                                onChange={(e) => setModalInput({ ...modalInput, reason: e.target.value })}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
                                                placeholder="Contoh: Rekening tidak valid..."
                                                rows={3}
                                            />
                                        </div>
                                    )}

                                    {actionModal.type === 'complete_withdraw' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">External Transaction ID</label>
                                                <input
                                                    type="text"
                                                    value={modalInput.extId}
                                                    onChange={(e) => setModalInput({ ...modalInput, extId: e.target.value })}
                                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                    placeholder="Opsional..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gateway Reference</label>
                                                <input
                                                    type="text"
                                                    value={modalInput.ref}
                                                    onChange={(e) => setModalInput({ ...modalInput, ref: e.target.value })}
                                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                    placeholder="Opsional..."
                                                />
                                            </div>
                                        </>
                                    )}

                                    {(actionModal.type === 'approve_withdraw') && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 text-sm">
                                            Pastikan Anda telah memverifikasi mutasi dan data rekening. Tindakan ini akan memotong saldo sistem secara logika.
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        onClick={() => setActionModal({ isOpen: false, type: null, item: null })}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={executeAction}
                                        disabled={actionModal.type === 'reject_withdraw' && !modalInput.reason}
                                        className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${actionModal.type === 'reject_withdraw' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                    >
                                        Konfirmasi
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    )
}

export default function PayoutPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <PayoutContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
