"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
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
    CreditCard
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

// ─── Components ───────────────────────────────────────────────────────────────

function WalletPageContent() {
    const { t } = useI18n();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [topups, setTopups] = useState<PendingTopup[]>([]);

    // Search states
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");

    // Modal states
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'confirm_topup' | 'reject_topup' | null;
        item: any;
    }>({ isOpen: false, type: null, item: null });

    const [modalInput, setModalInput] = useState({ reason: "", extId: "", ref: "" });

    // Track if currently showing demo/dummy data (for local simulation)
    const [isDemoMode, setIsDemoMode] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // In a real scenario, you'd pass 'keyword: activeSearch' to API params
            // Assuming walletApi methods support it or we just fetch and filter locally for now if API doesn't support keyword on pending.
            const [statsRes, topupsRes] = await Promise.allSettled([
                walletApi.getStatisticsOverview(),
                walletApi.getPendingTopups()
            ]);

            let fetchedStats = null;
            let fetchedTopups = [];

            if (statsRes.status === 'fulfilled' && statsRes.value) {
                fetchedStats = statsRes.value.data || statsRes.value;
            }
            if (topupsRes.status === 'fulfilled' && topupsRes.value) {
                fetchedTopups = topupsRes.value.data || topupsRes.value;
                if (!Array.isArray(fetchedTopups)) fetchedTopups = [];
            }

            // Fallback to dummy data if API returns empty arrays/null
            if (!fetchedStats) {
                fetchedStats = DUMMY_DATA.statistics;
                setIsDemoMode(true);
            } else {
                setIsDemoMode(false);
            }
            if (fetchedTopups.length === 0) {
                fetchedTopups = DUMMY_DATA.pendingTopups;
                setIsDemoMode(true);
            }

            // Apply manual search filtering if activeSearch has a value
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
            // Fallback
            setStats(DUMMY_DATA.statistics);
            setTopups(DUMMY_DATA.pendingTopups);
        } finally {
            setLoading(false);
        }
    }, [activeSearch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = () => {
        setActiveSearch(searchInput);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const executeAction = async () => {
        const { type, item } = actionModal;
        if (!type || !item) return;

        // ── DEMO / SIMULASI MODE ─────────────────────────────────────────────
        // Jika data adalah dummy (tidak ada di DB), simulasikan aksi secara lokal
        // agar alur UI bisa diuji tanpa error 403 dari API.
        if (isDemoMode) {
            if (type === 'confirm_topup') {
                setTopups(prev => prev.filter(tp => tp.id !== item.id));
                showToast({
                    type: 'success',
                    title: '[DEMO] Topup Dikonfirmasi',
                    message: `Saldo ${item.user?.name || 'User'} +${formatCurrency(item.amount)} (simulasi — data tidak disimpan ke DB)`
                });
            } else if (type === 'reject_topup') {
                setTopups(prev => prev.filter(tp => tp.id !== item.id));
                showToast({
                    type: 'info',
                    title: '[DEMO] Topup Ditolak',
                    message: `Permintaan topup ${item.user?.name || 'User'} ditolak (simulasi)`
                });
            }
            setActionModal({ isOpen: false, type: null, item: null });
            setModalInput({ reason: "", extId: "", ref: "" });
            return;
        }

        // ── REAL API MODE ────────────────────────────────────────────────────
        try {
            if (type === 'confirm_topup') {
                await walletApi.confirmTopup(item.id, modalInput.ref);
                showToast({ type: 'success', title: 'Topup Dikonfirmasi', message: `Saldo ${item.user?.name || 'User'} berhasil ditambahkan.` });
            } else if (type === 'reject_topup') {
                await walletApi.rejectTopup(item.id);
                showToast({ type: 'info', title: 'Topup Ditolak', message: `Permintaan topup ${item.user?.name || 'User'} telah ditolak.` });
            }
            fetchData();
            setActionModal({ isOpen: false, type: null, item: null });
            setModalInput({ reason: "", extId: "", ref: "" });
        } catch (error: any) {
            showToast({
                type: 'error',
                title: 'Gagal Melakukan Aksi',
                message: error.message || 'Terjadi kesalahan. Coba lagi.'
            });
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

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 md:p-6 lg:p-8">
            <ToastContainer />
            <div className="max-w-[1400px] mx-auto space-y-8">

                {/* ── Header & Actions ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet</h1>
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

                {/* ── Tables Section ── */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">

                    {/* Tabs and Search */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-100 dark:border-gray-800 px-4 pt-4 gap-4">
                        <div className="flex gap-4">
                            <div className="pb-3 px-2 text-sm font-bold border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400">
                                Pending Topups <span className="ml-1 bg-gray-100 dark:bg-gray-800 py-0.5 px-2 rounded-full text-xs">{topups.length}</span>
                            </div>
                        </div>

                        <div className="relative group flex items-center mb-3 md:mb-2">
                            <input
                                type="text"
                                placeholder="Cari nama, kategori..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-9 pr-4 py-1.5 w-full md:w-56 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-l-lg focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <Search className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <button
                                onClick={handleSearch}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 rounded-r-lg transition-colors text-sm font-medium shadow-sm"
                            >
                                Cari
                            </button>
                        </div>
                    </div>

                    {/* MOBILE CARD VIEW (<640px) */}
                    <div className="space-y-3 sm:hidden p-4">
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Memuat data...</div>
                        ) : topups.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">Tidak ada data topup pending.</div>
                        ) : (
                            topups.map((item) => (
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
                                        <div className="font-bold text-gray-900 dark:text-white text-sm">{item.user?.name || `User ID: ${item.userId}`}</div>
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
                                    <th className="px-6 py-4 text-left">Kategori</th>
                                    <th className="px-6 py-4 text-right">Nominal</th>
                                    <th className="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {loading && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-gray-500">Memuat data...</td>
                                    </tr>
                                )}
                                {!loading && topups.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-gray-500">Tidak ada data topup pending.</td>
                                    </tr>
                                )}

                                {!loading && topups.map((item) => {
                                    const userUsername = item.user?.username
                                        ? `@${item.user.username}`
                                        : item.user?.email
                                            ? `@${item.user.email.split('@')[0]}`
                                            : null
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                                            {/* ID */}
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                                    #{item.id}
                                                </span>
                                            </td>
                                            {/* Tanggal */}
                                            <td className="px-6 py-4">
                                                {(() => { const ta = timeAgo(item.createdAt, t); return (
                                                    <span title={formatTooltipDate(item.createdAt)} className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-default border-b border-dashed border-gray-400 dark:border-gray-500 pb-px whitespace-nowrap">{ta.relative}</span>
                                                ); })()}
                                            </td>
                                            {/* User */}
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 dark:text-white text-sm">{item.user?.name || `User ID: ${item.userId}`}</div>
                                                {userUsername && <div className="text-[11px] text-gray-400 mt-0.5">{userUsername}</div>}
                                            </td>
                                            {/* Kategori */}
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                                    <CreditCard className="w-3 h-3" />
                                                    {item.paymentMethod || 'Transfer/Payment Gateway'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.amount)}</span>
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
                </div>

                {/* ── Modals ── */}
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
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        Apakah Anda yakin ingin melanjutkan aksi ini? Tindakan ini tidak dapat dibatalkan.
                                    </p>
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
                                    className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm ${actionModal.type?.includes('reject') ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
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
