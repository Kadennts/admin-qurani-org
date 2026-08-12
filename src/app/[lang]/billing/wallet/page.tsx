"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
    Wallet,
    TrendingUp,
    ArrowDownRight,
    Clock,
    Plus,
    Search,
    CheckCircle,
    XCircle,
    Check,
    X,
    MoreVertical,
    Banknote,
    Users,
    Activity,
    CreditCard,
    History,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RefreshCw,
    Info,
    ChevronLeft,
    ChevronRight,
    Eye,
    AlertCircle,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/components/providers/i18n-provider"
import { walletApi } from "@/lib/api"
import { formatTooltipDate } from "@/lib/date-utils"
import { showToast, ToastContainer } from "@/components/ui/toast-sim"
import DUMMY_DATA from "@/data/dummy-wallet.json"
import { SmartPagination } from "@/components/ui/smart-pagination"
import { 
    getSimPendingTopups, 
    getSimTopupHistory, 
    getSimWalletStats,
    confirmSimTopup,
    rejectSimTopup
} from "@/lib/sim-wallet-store"
import { UserWalletModal } from "@/components/Wallet/UserWalletModal"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserInfo {
    id: number | string;
    name: string;
    email: string;
    username?: string;
}

interface PendingTopup {
    id: number | string;
    userId: number | string;
    user?: UserInfo;
    amount: number;
    status: string;
    paymentMethod?: string;
    createdAt: string;
    externalReference?: string | null;
}

interface Transaction {
    id: number | string;
    type?: number | string;
    typeName?: string;
    description?: string;
    amount?: number;
    balanceBefore?: number;
    balanceAfter?: number;
    status?: string;
    createdAt?: string;
    referenceId?: string | null;
}

interface TopupHistory {
    id: number | string;
    userId?: number | string;
    user?: UserInfo;
    amount?: number;
    status?: string;
    paymentMethod?: string;
    createdAt?: string;
    externalReference?: string | null;
}

type ActiveTab = 'pending_topup' | 'riwayat_topup';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp")
}

function timeAgo(dateStr: string, t: any): { relative: string; full: string } {
    if (!dateStr) return { relative: "-", full: "-" };
    let normalized = dateStr.trim();
    if (normalized.includes(" ") && !normalized.includes("T")) normalized = normalized.replace(" ", "T");
    if (!normalized.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(normalized)) normalized += "Z";
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return { relative: "-", full: "-" };
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    let relative: string;
    if (diffSec < 60) relative = t("common.timeAgo.justNow", "Baru saja");
    else if (diffMin < 60) relative = t("common.timeAgo.minutesAgo", "{minutes} menit lalu").replace("{minutes}", String(diffMin));
    else if (diffHour < 24) relative = t("common.timeAgo.hoursAgo", "{hours} jam lalu").replace("{hours}", String(diffHour));
    else if (diffDay === 1) relative = t("common.timeAgo.yesterday", "Kemarin");
    else if (diffDay < 7) relative = t("common.timeAgo.daysAgo", "{days} hari lalu").replace("{days}", String(diffDay));
    else if (diffWeek < 5) relative = t("common.timeAgo.weeksAgo", "{weeks} minggu lalu").replace("{weeks}", String(diffWeek));
    else if (diffMonth < 12) relative = t("common.timeAgo.monthsAgo", "{months} bulan lalu").replace("{months}", String(diffMonth));
    else relative = t("common.timeAgo.yearsAgo", "{years} tahun lalu").replace("{years}", String(diffYear));

    return { relative, full: "" };
}

function getTransactionTypeIcon(type: number | string | undefined) {
    const t = Number(type);
    if (t === 1) return <ArrowUp className="w-3 h-3 text-emerald-500" />;
    if (t === 2) return <ArrowDown className="w-3 h-3 text-red-500" />;
    return <ArrowUpDown className="w-3 h-3 text-blue-500" />;
}

function getTransactionTypeLabel(type: number | string | undefined, typeName?: string) {
    if (typeName) return typeName;
    const t = Number(type);
    if (t === 1) return "Top Up";
    if (t === 2) return "Penarikan";
    if (t === 3) return "Transfer";
    if (t === 4) return "Pembayaran";
    return "Transaksi";
}

function getStatusBadge(status: string | undefined) {
    const s = (status || "").toLowerCase();
    if (s === "success" || s === "completed" || s === "approved") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle className="w-3 h-3" />Berhasil</span>;
    }
    if (s === "pending" || s === "waiting") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>;
    }
    if (s === "failed" || s === "rejected" || s === "cancelled") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Gagal</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{status || "—"}</span>;
}



// ─── Components ───────────────────────────────────────────────────────────────

function WalletPageContent() {
    const { t } = useI18n();
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang || "en";
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [topups, setTopups] = useState<PendingTopup[]>([]);
    const [activeTab, setActiveTab] = useState<ActiveTab>('pending_topup');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Search states
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");

    // User wallet modal state
    const [selectedWalletUserId, setSelectedWalletUserId] = useState<string | number | null>(null);
    const [selectedWalletUserName, setSelectedWalletUserName] = useState<string>("");
        
    // Modal states
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'confirm_topup' | 'reject_topup' | null;
        item: any;
    }>({ isOpen: false, type: null, item: null });

    const [modalInput, setModalInput] = useState({ reason: "", extId: "", ref: "" });

    // Rejection reason modal
    const [rejectionModal, setRejectionModal] = useState<{
        isOpen: boolean;
        reason: string;
        userName: string;
        amount: number;
    }>({ isOpen: false, reason: "", userName: "", amount: 0 });

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (rejectionModal.isOpen) setRejectionModal(prev => ({ ...prev, isOpen: false }));
                if (actionModal.isOpen) setActionModal({ isOpen: false, type: null, item: null });
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [rejectionModal.isOpen, actionModal.isOpen]);

    // Track if currently showing demo/dummy data
    const [isDemoMode, setIsDemoMode] = useState(false);


    // ── Riwayat Topup state ──────────────────────────────────────────────────
    const [topupHistory, setTopupHistory] = useState<TopupHistory[]>([]);
    const [topupLoading, setTopupLoading] = useState(false);
    const [topupError, setTopupError] = useState<string | null>(null);
    const [topupPage, setTopupPage] = useState(1);
    const [topupTotalPages, setTopupTotalPages] = useState(1);
    const [topupPageSize, setTopupPageSize] = useState(10);

    // ── Fetch pending topups (Tab 1) ─────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, topupsRes] = await Promise.allSettled([
                walletApi.getStatisticsOverview(),
                walletApi.getPendingTopups()
            ]);

            let fetchedStats = null;
            let fetchedTopups: any[] = [];

            if (statsRes.status === 'fulfilled' && statsRes.value) {
                fetchedStats = statsRes.value.data || statsRes.value;
            }
            if (topupsRes.status === 'fulfilled' && topupsRes.value) {
                fetchedTopups = topupsRes.value.data || topupsRes.value;
                if (!Array.isArray(fetchedTopups)) fetchedTopups = [];
            }

            if (!fetchedStats) {
                fetchedStats = getSimWalletStats();
                setIsDemoMode(true);
            } else {
                setIsDemoMode(false);
            }
            if (fetchedTopups.length === 0) {
                fetchedTopups = getSimPendingTopups();
                setIsDemoMode(true);
            }

            if (activeSearch) {
                const lowerQuery = activeSearch.toLowerCase();
                fetchedTopups = fetchedTopups.filter((t: any) =>
                    t.user?.name?.toLowerCase().includes(lowerQuery) ||
                    t.id.toString().includes(lowerQuery)
                );
            }

            setStats(fetchedStats);
            setTopups(fetchedTopups);

        } catch (error) {
            console.error("Error fetching wallet data:", error);
            setStats(getSimWalletStats());
            setTopups(getSimPendingTopups());
            setIsDemoMode(true);
        } finally {
            setLoading(false);
        }
    }, [activeSearch]);


    // ── Fetch Riwayat Topup (Tab 3) ──────────────────────────────────────────
    const fetchTopupHistory = useCallback(async (page: number, size?: number) => {
        setTopupLoading(true);
        setTopupError(null);
        try {
            const res = await walletApi.getTopupHistory({ page, pageSize: size ?? topupPageSize });
            const data = res?.data || res;
            const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
            const total = data?.totalPages || data?.totalCount
                ? Math.ceil((data.totalCount || items.length) / (size ?? topupPageSize))
                : Math.max(1, Math.ceil(items.length / (size ?? topupPageSize)));

            // Fallback ke dummy data jika API kosong
            if (items.length === 0) {
                const dummyItems = getSimTopupHistory();
                setTopupHistory(dummyItems);
                setTopupTotalPages(Math.max(1, Math.ceil(dummyItems.length / (size ?? topupPageSize))));
            } else {
                setTopupHistory(items);
                setTopupTotalPages(total);
            }
        } catch (err: any) {
            console.error("Error fetching topup history:", err);
            // Fallback ke dummy data saat error
            const dummyItems = getSimTopupHistory();
            setTopupHistory(dummyItems);
            setTopupTotalPages(Math.max(1, Math.ceil(dummyItems.length / (size ?? topupPageSize))));
            setTopupError(null); // hilangkan pesan error karena ada dummy
        } finally {
            setTopupLoading(false);
        }
    }, []);


    useEffect(() => { fetchData(); }, [fetchData]);


    useEffect(() => {
        if (activeTab === 'riwayat_topup') fetchTopupHistory(topupPage);
    }, [activeTab, topupPage, fetchTopupHistory]);

    const handleSearch = () => { setActiveSearch(searchInput); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    const executeAction = async () => {
        const { type, item } = actionModal;
        if (!type || !item) return;

        if (isDemoMode) {
            if (type === 'confirm_topup') {
                confirmSimTopup(item.id, modalInput.ref);
                showToast({ type: 'success', title: '[DEMO] Topup Dikonfirmasi', message: `Saldo ${item.user?.name || 'User'} +${formatCurrency(item.amount)} (simulasi)` });
            } else if (type === 'reject_topup') {
                if (!modalInput.reason.trim()) {
                    showToast({ type: 'error', title: 'Alasan wajib diisi', message: 'Harap isi alasan penolakan topup.' });
                    return;
                }
                rejectSimTopup(item.id, modalInput.reason.trim());
                showToast({ type: 'info', title: '[DEMO] Topup Ditolak', message: `Permintaan topup ${item.user?.name || 'User'} ditolak (simulasi)` });
            }
            
            // Reload local data
            setTopups(getSimPendingTopups());
            setStats(getSimWalletStats());
            if (activeTab === 'riwayat_topup') {
                setTopupHistory(getSimTopupHistory());
            }

            setActionModal({ isOpen: false, type: null, item: null });
            setModalInput({ reason: "", extId: "", ref: "" });
            return;
        }

        try {
            if (type === 'confirm_topup') {
                await walletApi.confirmTopup(item.id, modalInput.ref);
                showToast({ type: 'success', title: 'Topup Dikonfirmasi', message: `Saldo ${item.user?.name || 'User'} berhasil ditambahkan.` });
            } else if (type === 'reject_topup') {
                if (!modalInput.reason.trim()) {
                    showToast({ type: 'error', title: 'Alasan wajib diisi', message: 'Harap isi alasan penolakan topup.' });
                    return;
                }
                await walletApi.rejectTopup(item.id, modalInput.reason.trim());
                showToast({ type: 'info', title: 'Topup Ditolak', message: `Permintaan topup ${item.user?.name || 'User'} telah ditolak.` });
            }
            fetchData();
            setActionModal({ isOpen: false, type: null, item: null });
            setModalInput({ reason: "", extId: "", ref: "" });
        } catch (error: any) {
            showToast({ type: 'error', title: 'Gagal Melakukan Aksi', message: error.message || 'Terjadi kesalahan. Coba lagi.' });
        }
    };

    const openModal = (type: typeof actionModal.type, item: any) => {
        setActionModal({ isOpen: true, type, item });
        setModalInput({ reason: "", extId: "", ref: "" });
    };

    const WALLET_STATS = [
        {
            title: t("billing.wallet.stats.systemBalance", "Saldo Sistem"),
            value: stats?.totalBalance || 0,
            isCurrency: true,
            icon: Wallet,
            color: "emerald",
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-500"
        },
        {
            title: t("billing.wallet.stats.activeWallet", "Total Dompet Aktif"),
            value: stats?.activeWallets || 0,
            isCurrency: false,
            icon: Users,
            color: "blue",
            bgColor: "bg-sky-50",
            iconColor: "text-sky-500"
        },
        {
            title: t("billing.wallet.stats.volumeToday", "Volume Hari Ini"),
            value: stats?.volumeToday || 0,
            isCurrency: true,
            icon: Activity,
            color: "purple",
            bgColor: "bg-purple-50",
            iconColor: "text-purple-500"
        },
        {
            title: t("billing.wallet.stats.pendingTopup", "Topup Pending"),
            value: stats?.totalPendingTopups || 0,
            isCurrency: false,
            icon: Clock,
            color: "amber",
            bgColor: "bg-amber-50",
            iconColor: "text-amber-500"
        }
    ];

    const TABS: { key: ActiveTab; label: string; icon: any; count?: number }[] = [
        { key: 'pending_topup', label: 'Pending Topup', icon: Clock, count: topups.length },
        { key: 'riwayat_topup', label: 'Riwayat Topup', icon: TrendingUp },
    ];

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 md:p-6 lg:p-8">
            <ToastContainer />
            <div className="max-w-[1400px] mx-auto space-y-8">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Wallet className="w-6 h-6 text-emerald-500" />
                            Wallet
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* ── Stats Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {WALLET_STATS.map((stat, i) => {
                        const Icon = stat.icon
                        return (
                            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-0 shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</span>
                                        <div className={`p-2.5 rounded-xl ${stat.bgColor} dark:bg-gray-800/50`}>
                                            <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {loading ? "..." : (stat.isCurrency ? formatCurrency(stat.value) : stat.value)}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Tab Section ── */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">

                    {/* Tab Header */}
                    <div className="flex flex-col-reverse sm:flex-row items-center border-b border-gray-100 dark:border-gray-700 px-4 gap-3 justify-between">
                        {/* Search (Kiri) */}
                        <div className="py-2 w-full sm:w-auto">
                            <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                                <div className="relative bg-white dark:bg-gray-900 flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={handleKeyDown}
                                        placeholder="Cari nama, metode..."
                                        className="w-full sm:w-52 pl-8 pr-3 py-1.5 text-xs bg-transparent border-none focus:outline-none dark:text-white" />
                                </div>
                                <button onClick={handleSearch} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors">Cari</button>
                            </div>
                        </div>

                        {/* Tabs (Kanan) */}
                        <div className="flex items-center gap-0 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
                            {TABS.map(tab => (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 -mb-px whitespace-nowrap ${activeTab === tab.key ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                    {tab.label}
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">{tab.count}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ══════════════ TAB 1: PENDING TOPUP ══════════════ */}
                    {activeTab === 'pending_topup' && (() => {
                        const totalPages = Math.max(1, Math.ceil(topups.length / pageSize));
                        const pagedTopups = topups.slice((page - 1) * pageSize, page * pageSize);
                        return (
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
                                ) : pagedTopups.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">Tidak ada data topup pending.</div>
                                ) : (
                                    pagedTopups.map((item) => (
                                        <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                                    #{item.id}
                                                </span>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                                                            <MoreVertical className="w-5 h-5" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Aksi Topup</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openModal('confirm_topup', item)}>
                                                            <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                            <span>Confirm Topup</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openModal('reject_topup', item)}>
                                                            <X className="w-4 h-4 mr-2 text-red-600" />
                                                            <span className="text-red-600">Reject Topup</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <div>
                                                <Link href={`/${lang}/billing/${item.userId}/wallet`} className="font-bold text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors text-left">{item.user?.name || `User ID: ${item.userId}`}</Link>
                                                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                                    <CreditCard className="w-3 h-3" />
                                                    {item.paymentMethod || 'Transfer/Payment Gateway'}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(item.amount)}</div>
                                                {(() => { const ta = timeAgo(item.createdAt, t); return (
                                                    <span title={formatTooltipDate(item.createdAt)} className="text-xs text-gray-500 cursor-default border-b border-dashed border-gray-400 pb-px">{ta.relative}</span>
                                                ); })()}
                                            </div>
                                            <div className="pt-1">{getStatusBadge(item.status || 'pending')}</div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* TABLE VIEW (Tablet & Desktop) */}
                            <div className="hidden sm:block p-0 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50/50 dark:bg-gray-800/30 text-gray-400 uppercase tracking-widest text-[10px] font-bold">
                                        <tr>
                                            <th className="px-6 py-4 text-left">ID</th>
                                            <th className="px-6 py-4 text-left">Tanggal</th>
                                            <th className="px-6 py-4 text-left">User</th>
                                            <th className="px-6 py-4 text-left">Metode Pembayaran</th>
                                            <th className="px-6 py-4 text-right">Nominal</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {loading && (
                                            <tr>
                                                <td colSpan={7}>
                                                    <div className="space-y-3 py-4 px-6">
                                                        {[...Array(4)].map((_, i) => (
                                                            <div key={i} className="flex items-center gap-4 animate-pulse">
                                                                <Skeleton className="h-3 w-full max-w-[120px]" />
                                                                <Skeleton className="h-3 w-full max-w-[80px]" />
                                                                <Skeleton className="h-3 w-full max-w-[100px]" />
                                                                <Skeleton className="h-3 w-full max-w-[60px]" />
                                                                <Skeleton className="h-3 w-full max-w-[90px]" />
                                                                <Skeleton className="h-3 w-full max-w-[60px]" />
                                                                <Skeleton className="h-3 w-full max-w-[50px]" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {!loading && pagedTopups.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-gray-500">Tidak ada data topup pending.</td>
                                            </tr>
                                        )}
                                        {!loading && pagedTopups.map((item) => {
                                            const userUsername = item.user?.username
                                                ? `@${item.user.username}`
                                                : item.user?.email
                                                    ? `@${item.user.email.split('@')[0]}`
                                                    : null
                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                                            #{item.id}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {(() => { const ta = timeAgo(item.createdAt, t); return (
                                                            <span title={formatTooltipDate(item.createdAt)} className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default border-b border-dashed border-gray-400 dark:border-gray-500 pb-px whitespace-nowrap">{ta.relative}</span>
                                                        ); })()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Link href={`/${lang}/billing/${item.userId}/wallet`} className="font-bold text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors text-left">{item.user?.name || `User ID: ${item.userId}`}</Link>
                                                        {userUsername && <div className="text-[11px] text-gray-400 mt-0.5">{userUsername}</div>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                                            <CreditCard className="w-3 h-3" />
                                                            {item.paymentMethod || 'Transfer/Payment Gateway'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.amount)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {getStatusBadge(item.status || 'pending')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-center items-center gap-2">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                                                        <MoreVertical className="w-4 h-4" />
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Aksi Topup</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => openModal('confirm_topup', item)}>
                                                                        <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                                        <span>Confirm Topup</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => openModal('reject_topup', item)}>
                                                                        <X className="w-4 h-4 mr-2 text-red-600" />
                                                                        <span className="text-red-600">Reject Topup</span>
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

                            {/* Pagination Pending Topup */}
                            <SmartPagination
                                total={topups.length}
                                page={page}
                                pageSize={pageSize}
                                onPageChange={setPage}
                                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                                loading={loading}
                            />
                        </>
                        );
                    })()}

                    {/* ══════════════ TAB 3: RIWAYAT TOPUP ══════════════ */}
                    {activeTab === 'riwayat_topup' && (
                        <>
                            {topupError && (
                                <div className="mx-4 mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-2 items-center">
                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                    <span className="text-xs text-red-700 dark:text-red-300">{topupError}</span>
                                </div>
                            )}

                            {/* Mobile */}
                            <div className="space-y-3 sm:hidden p-4">
                                {topupLoading ? (
                                    <div className="space-y-3">{[...Array(3)].map((_, i) => (
                                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 animate-pulse">
                                            <Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" />
                                        </div>
                                    ))}</div>
                                ) : topupHistory.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">
                                        <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                        <p className="text-sm">Belum ada riwayat topup</p>
                                    </div>
                                ) : topupHistory.map(item => {
                                    const isRejectedCard = (item.status || '').toUpperCase() === 'REJECTED';
                                    const rejReasonCard = (item as any).rejectionReason;
                                    return (
                                    <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 bg-white dark:bg-gray-800 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">#{item.id}</span>
                                            {getStatusBadge(item.status)}
                                        </div>
                                        <Link href={`/${lang}/billing/${item.userId}/wallet`} className="text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors text-left">{item.user?.name || `User ID: ${item.userId}`}</Link>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <CreditCard className="w-3 h-3" />{item.paymentMethod || '—'}
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="font-bold text-emerald-600 text-sm">{item.amount !== undefined ? formatCurrency(item.amount) : '—'}</span>
                                            {item.createdAt ? (
                                                <span className="text-xs text-gray-500">{timeAgo(item.createdAt, t).relative}</span>
                                            ) : '—'}
                                        </div>
                                        {isRejectedCard && (
                                            <button
                                                onClick={() => setRejectionModal({ isOpen: true, reason: rejReasonCard || 'Tidak ada keterangan alasan penolakan.', userName: item.user?.name || `User #${item.userId}`, amount: item.amount || 0 })}
                                                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Lihat Alasan Ditolak
                                            </button>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50/50 dark:bg-gray-800/30 text-gray-400 uppercase tracking-widest text-[10px] font-bold">
                                        <tr>
                                            <th className="px-6 py-4 text-left">ID</th>
                                            <th className="px-6 py-4 text-left">Tanggal</th>
                                            <th className="px-6 py-4 text-left">User</th>
                                            <th className="px-6 py-4 text-left">Metode Pembayaran</th>
                                            <th className="px-6 py-4 text-right">Nominal</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {topupLoading && (
                                            <tr><td colSpan={6}><div className="space-y-3 py-4 px-6">
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className="flex items-center gap-4 animate-pulse">
                                                        <Skeleton className="h-3 w-[80px]" /><Skeleton className="h-3 w-[100px]" />
                                                        <Skeleton className="h-3 w-[120px]" /><Skeleton className="h-3 w-[100px]" />
                                                        <Skeleton className="h-3 w-[90px]" /><Skeleton className="h-3 w-[70px]" />
                                                    </div>
                                                ))}
                                            </div></td></tr>
                                        )}
                                        {!topupLoading && topupHistory.length === 0 && (
                                            <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                                                <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                                <p>Belum ada riwayat topup</p>
                                            </td></tr>
                                        )}
                                        {!topupLoading && topupHistory.slice((topupPage - 1) * topupPageSize, topupPage * topupPageSize).map(item => {
                                            const userUsername = item.user?.username
                                                ? `@${item.user.username}`
                                                : item.user?.email
                                                    ? `@${item.user.email.split('@')[0]}`
                                                    : null;
                                            const isRejected = (item.status || '').toUpperCase() === 'REJECTED';
                                            const rejReason = (item as any).rejectionReason;
                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">#{item.id}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {item.createdAt ? (
                                                            <span title={formatTooltipDate(item.createdAt)} className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap border-b border-dashed border-gray-400 pb-px cursor-default">
                                                                {timeAgo(item.createdAt, t).relative}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Link href={`/${lang}/billing/${item.userId}/wallet`} className="font-bold text-gray-900 dark:text-white text-sm hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors text-left">{item.user?.name || `User ID: ${item.userId}`}</Link>
                                                        {userUsername && <div className="text-[11px] text-gray-400 mt-0.5">{userUsername}</div>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                                            <CreditCard className="w-3 h-3" />
                                                            {item.paymentMethod || '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.amount !== undefined ? formatCurrency(item.amount) : '—'}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {getStatusBadge(item.status)}
                                                            {isRejected && (
                                                                <button
                                                                    onClick={() => setRejectionModal({ isOpen: true, reason: rejReason || 'Tidak ada keterangan alasan penolakan.', userName: item.user?.name || `User #${item.userId}`, amount: item.amount || 0 })}
                                                                    title="Lihat alasan ditolak"
                                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                                                >
                                                                    <Eye className="w-3 h-3" />
                                                                    Alasan
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Topup History */}
                            <SmartPagination
                                total={topupHistory.length}
                                page={topupPage}
                                pageSize={topupPageSize}
                                onPageChange={setTopupPage}
                                onPageSizeChange={(s) => { setTopupPageSize(s); setTopupPage(1); }}
                                loading={topupLoading}
                            />
                        </>
                    )}

                </div>

                {/* ── Modal: Confirm / Reject Topup ── */}
                {actionModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {actionModal.type === 'confirm_topup' && 'Confirm Topup'}
                                    {actionModal.type === 'reject_topup' && 'Reject Topup'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Anda akan melakukan aksi pada transaksi <span className="font-bold">{actionModal.item?.user?.name || `User ID: ${actionModal.item?.userId}`}</span> senilai <span className="font-bold">{formatCurrency(actionModal.item?.amount)}</span>.
                                </p>
                            </div>
                            <div className="p-6 space-y-4">
                                {actionModal.type === 'confirm_topup' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">External Reference</label>
                                        <input
                                            type="text"
                                            value={modalInput.ref}
                                            onChange={(e) => setModalInput({ ...modalInput, ref: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                            placeholder="Opsional..."
                                        />
                                    </div>
                                )}
                                {actionModal.type === 'reject_topup' && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            Masukkan alasan penolakan topup untuk pengguna ini.
                                        </p>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                                Alasan Penolakan <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={modalInput.reason}
                                                onChange={(e) => setModalInput({ ...modalInput, reason: e.target.value })}
                                                rows={3}
                                                placeholder="Contoh: Bukti transfer tidak valid, nominal tidak sesuai..."
                                                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                            />
                                        </div>
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
                                    className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm ${actionModal.type?.includes('reject') ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                >
                                    Konfirmasi
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── User Wallet Modal ── */}
                {selectedWalletUserId && (
                    <UserWalletModal
                        onClose={() => {
                            setSelectedWalletUserId(null);
                            setSelectedWalletUserName("");
                        }}
                        userId={selectedWalletUserId}
                        userName={selectedWalletUserName}
                    />
                )}

                {/* ── Rejection Reason Modal ── */}
                {rejectionModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Alasan Penolakan Topup</h3>
                                <button onClick={() => setRejectionModal(prev => ({ ...prev, isOpen: false }))} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Catatan/Alasan Admin:</p>
                                    <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{rejectionModal.reason || 'Tidak ada catatan.'}</p>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button onClick={() => setRejectionModal(prev => ({ ...prev, isOpen: false }))} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-semibold transition-colors text-sm">Tutup</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

export default function WalletPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <WalletPageContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
