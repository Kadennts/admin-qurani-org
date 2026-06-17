"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
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
import { walletApi } from "@/lib/api"
import DUMMY_DATA from "@/data/dummy-wallet.json"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserInfo {
    id: number | string;
    name: string;
    email: string;
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

interface PendingWithdraw {
    id: number | string;
    userId: number | string;
    user?: UserInfo;
    amount: number;
    status: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    createdAt: string;
    reason?: string | null;
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

// ─── Components ───────────────────────────────────────────────────────────────

function WalletPageContent() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [topups, setTopups] = useState<PendingTopup[]>([]);
    const [withdraws, setWithdraws] = useState<PendingWithdraw[]>([]);
    const [activeTab, setActiveTab] = useState<'topups' | 'withdraws'>('topups');
    
    // Search states
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");

    // Modal states
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'approve_withdraw' | 'reject_withdraw' | 'complete_withdraw' | 'confirm_topup' | 'reject_topup' | null;
        item: any;
    }>({ isOpen: false, type: null, item: null });

    const [modalInput, setModalInput] = useState({ reason: "", extId: "", ref: "" });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // In a real scenario, you'd pass 'keyword: activeSearch' to API params
            // Assuming walletApi methods support it or we just fetch and filter locally for now if API doesn't support keyword on pending.
            const [statsRes, topupsRes, withdrawsRes] = await Promise.allSettled([
                walletApi.getStatisticsOverview(),
                walletApi.getPendingTopups(),
                walletApi.getPendingWithdraws()
            ]);

            let fetchedStats = null;
            let fetchedTopups = [];
            let fetchedWithdraws = [];

            if (statsRes.status === 'fulfilled' && statsRes.value) {
                fetchedStats = statsRes.value.data || statsRes.value;
            }
            if (topupsRes.status === 'fulfilled' && topupsRes.value) {
                fetchedTopups = topupsRes.value.data || topupsRes.value;
                if (!Array.isArray(fetchedTopups)) fetchedTopups = [];
            }
            if (withdrawsRes.status === 'fulfilled' && withdrawsRes.value) {
                fetchedWithdraws = withdrawsRes.value.data || withdrawsRes.value;
                if (!Array.isArray(fetchedWithdraws)) fetchedWithdraws = [];
            }

            // Fallback to dummy data if API returns empty arrays/null
            if (!fetchedStats) fetchedStats = DUMMY_DATA.statistics;
            if (fetchedTopups.length === 0) fetchedTopups = DUMMY_DATA.pendingTopups;
            if (fetchedWithdraws.length === 0) fetchedWithdraws = DUMMY_DATA.pendingWithdraws;

            // Apply manual search filtering if activeSearch has a value
            if (activeSearch) {
                const lowerQuery = activeSearch.toLowerCase();
                fetchedTopups = fetchedTopups.filter((t: any) => 
                    t.user?.name?.toLowerCase().includes(lowerQuery) || 
                    t.id.toString().includes(lowerQuery)
                );
                fetchedWithdraws = fetchedWithdraws.filter((w: any) => 
                    w.user?.name?.toLowerCase().includes(lowerQuery) || 
                    w.id.toString().includes(lowerQuery)
                );
            }

            setStats(fetchedStats);
            setTopups(fetchedTopups);
            setWithdraws(fetchedWithdraws);

        } catch (error) {
            console.error("Error fetching wallet data:", error);
            // Fallback
            setStats(DUMMY_DATA.statistics);
            setTopups(DUMMY_DATA.pendingTopups);
            setWithdraws(DUMMY_DATA.pendingWithdraws);
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

        try {
            if (type === 'approve_withdraw') {
                await walletApi.approveWithdraw(item.id);
            } else if (type === 'reject_withdraw') {
                await walletApi.rejectWithdraw(item.id, modalInput.reason);
            } else if (type === 'complete_withdraw') {
                await walletApi.completeWithdraw(item.id, modalInput.extId, modalInput.ref);
            } else if (type === 'confirm_topup') {
                await walletApi.confirmTopup(item.id, modalInput.ref);
            } else if (type === 'reject_topup') {
                await walletApi.rejectTopup(item.id);
            }
            // Refresh data
            fetchData();
            setActionModal({ isOpen: false, type: null, item: null });
            setModalInput({ reason: "", extId: "", ref: "" });
        } catch (error: any) {
            alert(`Error: ${error.message || 'Failed to perform action'}`);
        }
    };

    const openModal = (type: typeof actionModal.type, item: any) => {
        setActionModal({ isOpen: true, type, item });
        setModalInput({ reason: "", extId: "", ref: "" });
    };

    const WALLET_STATS = [
        {
            title: "Total Saldo Sistem",
            value: stats?.totalBalance || 0,
            isCurrency: true,
            icon: Wallet,
            color: "emerald",
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-500"
        },
        {
            title: "Total Dompet Aktif",
            value: stats?.activeWallets || 0,
            isCurrency: false,
            icon: Users,
            color: "blue",
            bgColor: "bg-sky-50",
            iconColor: "text-sky-500"
        },
        {
            title: "Volume Hari Ini",
            value: stats?.volumeToday || 0,
            isCurrency: true,
            icon: Activity,
            color: "purple",
            bgColor: "bg-purple-50",
            iconColor: "text-purple-500"
        },
        {
            title: "Topup Pending",
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
            <div className="max-w-[1400px] mx-auto space-y-8">
                
                {/* ── Header & Actions ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Wallet & Payouts</h1>
                    </div>
                </div>

                {/* ── Stats Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {WALLET_STATS.map((stat, i) => {
                        const Icon = stat.icon
                        return (
                            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
                        )
                    })}
                </div>

                {/* ── Tables Section ── */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Tabs and Search */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-100 dark:border-gray-800 px-4 pt-4 gap-4">
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setActiveTab('topups')}
                                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'topups' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                Pending Topups <span className="ml-1 bg-gray-100 dark:bg-gray-800 py-0.5 px-2 rounded-full text-xs">{topups.length}</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('withdraws')}
                                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'withdraws' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                Pending Withdraws <span className="ml-1 bg-gray-100 dark:bg-gray-800 py-0.5 px-2 rounded-full text-xs">{withdraws.length}</span>
                            </button>
                        </div>
                        
                        <div className="relative group flex items-center mb-3 md:mb-2">
                            <input 
                                type="text" 
                                placeholder="Cari ID / Nama..." 
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

                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/50 dark:bg-gray-800/30 text-gray-400 uppercase tracking-widest text-[10px] font-bold">
                                <tr>
                                    <th className="px-6 py-4 text-left">ID & Tgl</th>
                                    <th className="px-6 py-4 text-left">User</th>
                                    <th className="px-6 py-4 text-left">Detail</th>
                                    <th className="px-6 py-4 text-right">Nominal</th>
                                    <th className="px-6 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {loading && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500">Memuat data...</td>
                                    </tr>
                                )}
                                {!loading && activeTab === 'topups' && topups.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500">Tidak ada data topup pending.</td>
                                    </tr>
                                )}
                                {!loading && activeTab === 'withdraws' && withdraws.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500">Tidak ada data withdraw pending.</td>
                                    </tr>
                                )}

                                {!loading && activeTab === 'topups' && topups.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400">#{t.id}</div>
                                            <div className="text-xs text-gray-400 mt-1">{new Date(t.createdAt).toLocaleDateString('id-ID')}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 dark:text-white">{t.user?.name || `User ID: ${t.userId}`}</div>
                                            {t.user?.email && <div className="text-[11px] text-gray-500 mt-0.5">{t.user.email}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                                <CreditCard className="w-3 h-3" />
                                                {t.paymentMethod || 'Transfer/Payment Gateway'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(t.amount)}</span>
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
                                                        <DropdownMenuItem onClick={() => openModal('confirm_topup', t)}>
                                                            <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                            <span>Confirm Topup</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openModal('reject_topup', t)}>
                                                            <X className="w-4 h-4 mr-2 text-red-600" />
                                                            <span className="text-red-600">Reject Topup</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {!loading && activeTab === 'withdraws' && withdraws.map((w) => (
                                    <tr key={w.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400">#{w.id}</div>
                                            <div className="text-xs text-gray-400 mt-1">{new Date(w.createdAt).toLocaleDateString('id-ID')}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 dark:text-white">{w.user?.name || `User ID: ${w.userId}`}</div>
                                            {w.user?.email && <div className="text-[11px] text-gray-500 mt-0.5">{w.user.email}</div>}
                                            <div className="mt-1 text-[10px] font-bold text-purple-600 uppercase tracking-wide">Payout Guru</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-gray-900 dark:text-white">{w.bankName}</div>
                                            <div className="text-[11px] font-mono text-gray-500">{w.accountNumber}</div>
                                            <div className="text-[10px] text-gray-400 uppercase mt-0.5">{w.accountName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(w.amount)}</span>
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
                                                        <DropdownMenuLabel>Aksi Withdraw</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openModal('approve_withdraw', w)}>
                                                            <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                            <span>Approve</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openModal('complete_withdraw', w)}>
                                                            <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                                                            <span>Mark as Completed</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openModal('reject_withdraw', w)}>
                                                            <X className="w-4 h-4 mr-2 text-red-600" />
                                                            <span className="text-red-600">Reject</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
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
                                    {actionModal.type === 'approve_withdraw' && 'Approve Withdraw'}
                                    {actionModal.type === 'reject_withdraw' && 'Reject Withdraw'}
                                    {actionModal.type === 'complete_withdraw' && 'Complete Withdraw'}
                                    {actionModal.type === 'confirm_topup' && 'Confirm Topup'}
                                    {actionModal.type === 'reject_topup' && 'Reject Topup'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Anda akan melakukan aksi pada transaksi <span className="font-bold">{actionModal.item?.user?.name || `User ID: ${actionModal.item?.userId}`}</span> senilai <span className="font-bold">{formatCurrency(actionModal.item?.amount)}</span>.
                                </p>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                {actionModal.type === 'reject_withdraw' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan Penolakan</label>
                                        <input 
                                            type="text" 
                                            value={modalInput.reason}
                                            onChange={(e) => setModalInput({...modalInput, reason: e.target.value})}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                            placeholder="Masukkan alasan penolakan..."
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
                                                onChange={(e) => setModalInput({...modalInput, extId: e.target.value})}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                placeholder="Opsional..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gateway Reference</label>
                                            <input 
                                                type="text" 
                                                value={modalInput.ref}
                                                onChange={(e) => setModalInput({...modalInput, ref: e.target.value})}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                placeholder="Opsional..."
                                            />
                                        </div>
                                    </>
                                )}

                                {actionModal.type === 'confirm_topup' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">External Reference</label>
                                        <input 
                                            type="text" 
                                            value={modalInput.ref}
                                            onChange={(e) => setModalInput({...modalInput, ref: e.target.value})}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                            placeholder="Opsional..."
                                        />
                                    </div>
                                )}

                                {(actionModal.type === 'approve_withdraw' || actionModal.type === 'reject_topup') && (
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
                                    className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm ${
                                        actionModal.type?.includes('reject') ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
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
