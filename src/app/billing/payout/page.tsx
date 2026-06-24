"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle,
    Wallet, ArrowUpRight, BadgeCheck, Check, X
} from "lucide-react"
import Image from "next/image"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import { walletApi } from "@/lib/api"
import DUMMY_DATA from "@/data/dummy-wallet.json"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"

// ── helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n).replace("IDR", "Rp")
}

function formatRelativeTime(iso: string | null) {
    if (!iso) return "—"
    const now = new Date()
    const past = new Date(iso)
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

    if (diffInSeconds < 0) return "just now"
    if (diffInSeconds < 60) return "just now"

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} jam lalu`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} hari lalu`

    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) return `${diffInWeeks} minggu lalu`

    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) return `${diffInMonths} bulan lalu`

    const diffInYears = Math.floor(diffInDays / 365)
    return `${diffInYears} tahun lalu`
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

function PayoutContent() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [withdraws, setWithdraws] = useState<PendingWithdraw[]>([]);
    
    // Search & Pagination
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
            <ToastContainer />
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payout Guru</h1>
                        <p className="text-sm text-gray-500 mt-1">Kelola dan proses penarikan dana penghasilan guru.</p>
                    </div>
                </div>

                {/* ── Overview Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Menunggu Approval", value: stats?.totalPendingWithdraws || withdraws.length, icon: Clock, color: "amber", suffix: "request" },
                        { label: "Sistem Terproses", value: "Auto", icon: BadgeCheck, color: "emerald", suffix: "" },
                        { label: "Volume Withdraw (Bulan)", value: formatRupiah(stats?.volumeThisMonth || 0), icon: ArrowUpRight, color: "blue", suffix: "" },
                        { label: "Total Antrean (IDR)", value: formatRupiah(withdraws.reduce((a, b) => a + b.amount, 0)), icon: Wallet, color: "violet", suffix: "" },
                    ].map(card => {
                        const Icon = card.icon;
                        const clrMap: Record<string, { bg: string; icon: string }> = {
                            amber: { bg: "bg-amber-100 dark:bg-amber-900/20", icon: "text-amber-600 dark:text-amber-400" },
                            emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: "text-emerald-600 dark:text-emerald-400" },
                            blue: { bg: "bg-blue-100 dark:bg-blue-900/20", icon: "text-blue-600 dark:text-blue-400" },
                            violet: { bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-600 dark:text-violet-400" },
                        };
                        const clr = clrMap[card.color];
                        return (
                            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-xl ${clr.bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-5 h-5 ${clr.icon}`} />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-tight">{card.label}</p>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {loading ? "..." : card.value}
                                    {card.suffix && <span className="text-xs font-normal text-gray-400 ml-1.5">{card.suffix}</span>}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {/* ── Table Section ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                        <div className="font-bold text-gray-700 dark:text-gray-200">
                            Antrean Pending
                        </div>
                        <div className="relative group flex items-center w-full md:w-auto">
                            <input
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Cari nama guru atau bank..."
                                className="pl-9 pr-4 py-2 w-full md:w-64 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-l-lg focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <Search className="w-4 h-4 text-gray-400" />
                            </div>
                            <button 
                                onClick={handleSearch}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 rounded-r-lg transition-colors text-sm font-medium shadow-sm"
                            >
                                Cari
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">ID</th>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Guru</th>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Bank Tujuan</th>
                                    <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Nominal (Net)</th>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Tgl Request</th>
                                    <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-gray-400">
                                            Memuat data penarikan...
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
                                            {/* ID */}
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">
                                                    #{p.id}
                                                </span>
                                            </td>
                                            {/* Guru */}
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
                                            {/* Bank */}
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-bold text-gray-900 dark:text-white">{p.bankName}</div>
                                                <div className="text-[11px] font-mono text-gray-500 mt-0.5">{p.accountNumber}</div>
                                                <div className="text-[10px] text-gray-400 uppercase mt-0.5">{p.accountName}</div>
                                            </td>
                                            {/* Net Payout */}
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{formatRupiah(p.amount)}</span>
                                            </td>
                                            {/* Request Date */}
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                    {new Date(p.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                    {formatRelativeTime(p.createdAt)}
                                                </div>
                                            </td>
                                            {/* Aksi */}
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

                    {/* ── Pagination ── */}
                    {!loading && withdraws.length > 0 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
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
                                            onChange={(e) => setModalInput({...modalInput, reason: e.target.value})}
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
                                    className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                        actionModal.type === 'reject_withdraw' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
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

export default function PayoutPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <PayoutContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
