"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import {
    Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock,
    ArrowDownToLine, RefreshCw, MoreVertical, Check, X, Wallet,
    History, Banknote, AlertCircle
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import { walletApi } from "@/lib/api"
import {
    getSimWithdrawPending,
    getSimWithdrawHistory,
    approveSimWithdraw,
    rejectSimWithdraw,
    completeSimWithdraw,
} from "@/lib/sim-billing-store"
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNowStrict } from "date-fns"
import { id, enUS } from "date-fns/locale"
import Image from "next/image"

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
        if (dateStr.includes(' ') && !dateStr.includes('T')) dateStr = dateStr.replace(' ', 'T')
        if (!dateStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) dateStr += 'Z'
        const date = new Date(dateStr)
        if (Number.isNaN(date.getTime())) return dateString
        if (variant === 'relative') {
            return formatDistanceToNowStrict(date, { addSuffix: true, locale: locale === 'id' ? id : enUS })
        }
        const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", timeZone: tz }
        if (variant === 'long') {
            options.year = "numeric"; options.hour = "2-digit"; options.minute = "2-digit"
            options.hour12 = false; options.timeZoneName = "short"
        }
        return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', options).format(date)
    } catch { return dateString }
}

interface WithdrawItem {
    id: number | string;
    userId?: number | string;
    user?: { name?: string; email?: string; username?: string; avatar?: string };
    amount: number;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    status: string;
    notes?: string;
    externalTransactionId?: string;
    gatewayReference?: string;
    createdAt: string;
    updatedAt?: string;
}

// Dummy fallback data
const DUMMY_PENDING: WithdrawItem[] = [
    { id: 1, userId: 101, user: { name: "Ahmad Fauzi", email: "ahmad@email.com" }, amount: 150000, bankName: "BCA", accountNumber: "1234567890", accountName: "AHMAD FAUZI", status: "pending", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, userId: 102, user: { name: "Siti Rahma", email: "siti@email.com" }, amount: 300000, bankName: "Mandiri", accountNumber: "0987654321", accountName: "SITI RAHMA", status: "approved", createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 3, userId: 103, user: { name: "Rizky Pratama" }, amount: 75000, bankName: "BNI", accountNumber: "1122334455", accountName: "RIZKY PRATAMA", status: "pending", createdAt: new Date(Date.now() - 14400000).toISOString() },
];
const DUMMY_HISTORY: WithdrawItem[] = [
    { id: 10, userId: 104, user: { name: "Yusuf Abdullah" }, amount: 200000, bankName: "BRI", accountNumber: "5566778899", accountName: "YUSUF ABDULLAH", status: "completed", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 11, userId: 105, user: { name: "Fatimah Zahra" }, amount: 100000, bankName: "BCA", accountNumber: "9988776655", accountName: "FATIMAH ZAHRA", status: "rejected", notes: "Rekening tidak valid", createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 12, userId: 106, user: { name: "Umar Hassan" }, amount: 450000, bankName: "Mandiri", accountNumber: "1357924680", accountName: "UMAR HASSAN", status: "completed", createdAt: new Date(Date.now() - 259200000).toISOString() },
];

function getWithdrawStatusBadge(status: string) {
    const s = (status || "").toLowerCase();
    if (s === "completed")
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" />Selesai</span>;
    if (s === "approved")
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"><Check className="w-3 h-3" />Disetujui</span>;
    if (s === "rejected" || s === "failed")
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Ditolak</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>;
}

type ModalType = 'approve' | 'reject' | 'complete' | null;

function WithdrawContent() {
    const { t, locale } = useTranslation(['billing', 'common'])
    const { profile } = useAuth()

    const resolveTimezone = useCallback(() => {
        const isValid = (tz: string) => { try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(new Date()); return true; } catch { return false; } }
        let cached = ""; try { const raw = localStorage.getItem('myqurani_user_profile_v2'); if (raw) { cached = JSON.parse(raw)?.timezone || ""; } } catch { }
        const fromProfile = String(profile?.timezone || "").trim();
        const preferred = cached || fromProfile;
        if (preferred && isValid(preferred)) return preferred;
        if (fromProfile && isValid(fromProfile)) return fromProfile;
        try { const btz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (btz && isValid(btz)) return btz; } catch { }
        return "UTC";
    }, [profile?.timezone]);

    const [tz, setTz] = useState("UTC");
    useEffect(() => { setTz(resolveTimezone()); }, [resolveTimezone]);

    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [withdraws, setWithdraws] = useState<WithdrawItem[]>([]);
    const [history, setHistory] = useState<WithdrawItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [page, setPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const PAGE_SIZE = 10;

    const [stats, setStats] = useState({ pendingCount: 0, pendingTotal: 0, completedCount: 0 });

    // Modal
    const [actionModal, setActionModal] = useState<{ open: boolean; item: WithdrawItem | null; type: ModalType }>({ open: false, item: null, type: null });
    const [viewModal, setViewModal] = useState<{ open: boolean; item: WithdrawItem | null }>({ open: false, item: null });
    const [modalInput, setModalInput] = useState({ reason: "", extId: "", ref: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Fetch pending withdraws ───────────────────────────────────────────────
    const fetchPending = useCallback(async () => {
        setLoading(true);
        try {
            // walletApi.getPendingWithdraws → GET /api/v1/Wallet/admin/withdraws/pending
            const res = await walletApi.getPendingWithdraws({ page: 1, pageSize: 100 } as any);
            let items: WithdrawItem[] = Array.isArray(res) ? res : (res?.data || res?.items || []);
            if (!Array.isArray(items)) items = [];

            if (items.length === 0) {
                items = getSimWithdrawPending();
                setIsDemoMode(true);
            } else setIsDemoMode(false);

            if (activeSearch) {
                const q = activeSearch.toLowerCase();
                items = items.filter(w =>
                    w.user?.name?.toLowerCase().includes(q) ||
                    w.bankName?.toLowerCase().includes(q) ||
                    w.accountNumber?.includes(q) ||
                    String(w.id).includes(q)
                );
            }

            setWithdraws(items);
            setStats(prev => ({
                ...prev,
                pendingCount: items.filter(w => w.status === 'pending').length,
                pendingTotal: items.reduce((a, b) => a + b.amount, 0)
            }));
        } catch {
            const fallback = getSimWithdrawPending();
            setWithdraws(fallback);
            setIsDemoMode(true);
            setStats(prev => ({ ...prev, pendingCount: fallback.filter(w => w.status === 'pending').length, pendingTotal: fallback.reduce((a, b) => a + b.amount, 0) }));
        } finally {
            setLoading(false);
        }
    }, [activeSearch]);

    // ── Fetch withdraw history ────────────────────────────────────────────────
    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            // walletApi.getWithdrawHistory → GET /api/v1/Wallet/withdraws
            const res = await walletApi.getWithdrawHistory({ page: 1, pageSize: 100 } as any);
            let items: WithdrawItem[] = Array.isArray(res) ? res : (res?.data || res?.items || []);
            if (!Array.isArray(items)) items = [];

            if (items.length === 0) items = getSimWithdrawHistory();
            setHistory(items);
            setStats(prev => ({ ...prev, completedCount: items.filter(w => w.status === 'completed').length }));
        } catch {
            const fallback = getSimWithdrawHistory();
            setHistory(fallback);
            setStats(prev => ({ ...prev, completedCount: fallback.filter(w => w.status === 'completed').length }));
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => { fetchPending(); }, [fetchPending]);
    useEffect(() => { if (activeTab === 'history') fetchHistory(); }, [activeTab, fetchHistory]);

    const handleSearch = () => { setActiveSearch(search); setPage(1); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSearch(); };

    const openModal = (item: WithdrawItem, type: ModalType) => {
        setActionModal({ open: true, item, type });
        setModalInput({ reason: "", extId: "", ref: "" });
    };

    // ── Execute withdraw action ───────────────────────────────────────────────
    const executeAction = async () => {
        if (!actionModal.item || !actionModal.type) return;
        const { id: wId } = actionModal.item;

        if (actionModal.type === 'reject' && !modalInput.reason.trim()) {
            showToast({ type: 'error', title: 'Alasan wajib diisi', message: 'Harap isi alasan penolakan.' });
            return;
        }

        setIsSubmitting(true);
        try {
            if (actionModal.type === 'approve') {
                // walletApi.approveWithdraw → POST /api/v1/Wallet/admin/withdraws/{id}/approve
                await walletApi.approveWithdraw(wId);
                showToast({ type: 'success', title: 'Withdraw Disetujui', message: 'Penarikan dana berhasil disetujui.' });
            } else if (actionModal.type === 'reject') {
                // walletApi.rejectWithdraw → POST /api/v1/Wallet/admin/withdraws/{id}/reject
                await walletApi.rejectWithdraw(wId, modalInput.reason);
                showToast({ type: 'success', title: 'Withdraw Ditolak', message: 'Penarikan dana berhasil ditolak.' });
            } else if (actionModal.type === 'complete') {
                // walletApi.completeWithdraw → POST /api/v1/Wallet/admin/withdraws/{id}/complete
                // Signature: (id, externalTransactionId, gatewayReference, token?)
                await walletApi.completeWithdraw(
                    wId,
                    modalInput.extId || null,
                    modalInput.ref || null
                );
                showToast({ type: 'success', title: 'Withdraw Diselesaikan', message: 'Penarikan dana berhasil ditandai selesai.' });
            }
            setActionModal({ open: false, item: null, type: null });
            fetchPending();
        } catch {
            // Demo fallback: simpan ke sim-billing-store (persistent)
            if (actionModal.type === 'approve') {
                approveSimWithdraw(wId);
            } else if (actionModal.type === 'reject') {
                rejectSimWithdraw(wId, modalInput.reason.trim() || 'Ditolak oleh Admin');
            } else if (actionModal.type === 'complete') {
                completeSimWithdraw(wId, modalInput.extId || null, modalInput.ref || null);
            }

            // Refresh dari store
            const newPending = getSimWithdrawPending();
            const newHistory = getSimWithdrawHistory();
            setWithdraws(newPending);
            setHistory(newHistory);
            setStats({
                pendingCount: newPending.filter(w => w.status === 'pending').length,
                pendingTotal: newPending.reduce((a, b) => a + b.amount, 0),
                completedCount: newHistory.filter(w => w.status === 'completed').length,
            });

            showToast({ type: 'info', title: '[DEMO] Aksi Berhasil', message: 'Perubahan status berhasil (simulasi lokal).' });
            setActionModal({ open: false, item: null, type: null });
        } finally {
            setIsSubmitting(false);
        }
    };

    const paged = withdraws.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(withdraws.length / PAGE_SIZE));
    const pagedHistory = history.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);
    const totalHistoryPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));

    const modalTitleMap: Record<string, string> = {
        approve: 'Setujui Withdraw',
        reject: 'Tolak Withdraw',
        complete: 'Tandai Selesai',
    };

    return (
        <TooltipProvider>
            <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
                <ToastContainer />
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <ArrowDownToLine className="w-6 h-6 text-blue-500" />
                                Withdraw
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchPending} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                                <RefreshCw className="w-4 h-4 text-gray-500" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* ── Stats Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: "Pending Withdraw", value: stats.pendingCount, icon: Clock, bg: "bg-amber-100 dark:bg-amber-900/30", clr: "text-amber-600 dark:text-amber-400" },
                            { label: "Total Nilai Pending", value: formatRupiah(stats.pendingTotal), icon: Banknote, bg: "bg-blue-100 dark:bg-blue-900/30", clr: "text-blue-600 dark:text-blue-400", isStr: true },
                            { label: "Selesai Diproses", value: stats.completedCount, icon: CheckCircle2, bg: "bg-emerald-100 dark:bg-emerald-900/30", clr: "text-emerald-600 dark:text-emerald-400" },
                        ].map(c => {
                            const Icon = c.icon;
                            return (
                                <div key={c.label} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                                    <div className={`p-3 ${c.bg} rounded-lg flex-shrink-0`}><Icon className={`w-6 h-6 ${c.clr}`} /></div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{c.label}</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{loading ? "..." : c.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Table Card ── */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                        {/* Tab Header */}
                        <div className="flex items-center border-b border-gray-100 dark:border-gray-700 px-4 gap-0">
                            {[
                                { key: 'pending' as const, label: 'Pending Withdraw', count: withdraws.filter(w => w.status === 'pending').length },
                                { key: 'history' as const, label: 'Riwayat Withdraw' },
                            ].map(tab => (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 -mb-px ${activeTab === tab.key ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                    {tab.label}
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">{tab.count}</span>
                                    )}
                                </button>
                            ))}

                            {/* Search */}
                            <div className="ml-auto py-2">
                                <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                                    <div className="relative bg-white dark:bg-gray-900">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleKeyDown}
                                            placeholder="Cari nama, bank..."
                                            className="w-52 pl-8 pr-3 py-1.5 text-xs bg-transparent border-none focus:outline-none dark:text-white" />
                                    </div>
                                    <button onClick={handleSearch} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors">Cari</button>
                                </div>
                            </div>
                        </div>

                        {/* ══ TAB: PENDING WITHDRAW ══ */}
                        {activeTab === 'pending' && (
                        <>
                            {/* Mobile */}
                            <div className="space-y-3 sm:hidden p-4">
                                {loading ? (
                                    <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="border rounded-lg p-4 space-y-2 animate-pulse"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /></div>)}</div>
                                ) : paged.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400"><Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300" /><p>Tidak ada penarikan pending</p></div>
                                ) : paged.map(w => (
                                    <div key={w.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">#{w.id}</span>
                                            {getWithdrawStatusBadge(w.status)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">{w.user?.name || `User ID: ${w.userId}`}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{w.bankName} • {w.accountNumber}</p>
                                            <p className="text-[10px] text-gray-400 uppercase mt-0.5">{w.accountName}</p>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(w.amount)}</span>
                                            <div className="flex gap-1.5">
                                                {w.status === 'pending' && (
                                                    <button onClick={() => openModal(w, 'approve')} className="text-xs font-semibold text-emerald-600 border border-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors">Setuju</button>
                                                )}
                                                {w.status === 'approved' && (
                                                    <button onClick={() => openModal(w, 'complete')} className="text-xs font-semibold text-blue-600 border border-blue-300 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">Selesai</button>
                                                )}
                                                <button onClick={() => openModal(w, 'reject')} className="text-xs font-semibold text-red-600 border border-red-300 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Tolak</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">ID</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">User</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Bank Tujuan</th>
                                            <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 pr-8">Nominal</th>
                                            <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Tgl Request</th>
                                            <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {loading ? (
                                            <tr><td colSpan={7}>
                                                <div className="space-y-3 py-4 px-6">
                                                    {[...Array(4)].map((_, i) => (
                                                        <div key={i} className="flex items-center gap-4 animate-pulse">
                                                            {[60, 120, 100, 80, 70, 90, 60].map((w, j) => <Skeleton key={j} className={`h-3 w-[${w}px]`} />)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td></tr>
                                        ) : paged.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                                                <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                                <p>Tidak ada penarikan pending</p>
                                            </td></tr>
                                        ) : paged.map(w => {
                                            const userUsername = w.user?.username ? `@${w.user.username}` : w.user?.email ? `@${w.user.email.split('@')[0]}` : null;
                                            return (
                                                <tr key={w.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">
                                                            #{w.id}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                                {w.user?.avatar
                                                                    ? <Image src={w.user.avatar} alt="" width={32} height={32} className="rounded-full object-cover" unoptimized />
                                                                    : w.user?.name?.charAt(0) || 'U'
                                                                }
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{w.user?.name || `User ID: ${w.userId}`}</p>
                                                                {userUsername && <p className="text-[11px] text-gray-400">{userUsername}</p>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 hidden md:table-cell">
                                                        <div className="text-xs font-bold text-gray-900 dark:text-white">{w.bankName || '—'}</div>
                                                        <div className="text-[11px] font-mono text-gray-500">{w.accountNumber || ''}</div>
                                                        <div className="text-[10px] text-gray-400 uppercase">{w.accountName || ''}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right pr-8">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(w.amount)}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">{getWithdrawStatusBadge(w.status)}</td>
                                                    <td className="px-4 py-3 hidden lg:table-cell">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-help border-b border-dashed border-gray-400 dark:border-gray-500 pb-px">
                                                                    {formatDate(w.createdAt, 'relative', tz, locale)}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                <p className="text-xs">{formatDate(w.createdAt, 'long', tz, locale)}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuLabel>Aksi Withdraw</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                {w.status === 'pending' && (
                                                                    <DropdownMenuItem onClick={() => openModal(w, 'approve')}>
                                                                        <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                                        <span className="font-medium text-emerald-600">Approve</span>
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {w.status === 'approved' && (
                                                                    <DropdownMenuItem onClick={() => openModal(w, 'complete')}>
                                                                        <CheckCircle2 className="w-4 h-4 mr-2 text-blue-600" />
                                                                        <span className="font-medium text-blue-600">Tandai Selesai</span>
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => openModal(w, 'reject')}>
                                                                    <X className="w-4 h-4 mr-2 text-red-600" />
                                                                    <span className="font-medium text-red-600">Tolak</span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {!loading && withdraws.length > 0 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-xs text-gray-500 font-medium">Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, withdraws.length)}–{Math.min(page * PAGE_SIZE, withdraws.length)} dari {withdraws.length}</span>
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="text-xs font-bold px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">{page} / {totalPages}</span>
                                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )}
                        </>
                        )}

                        {/* ══ TAB: RIWAYAT WITHDRAW ══ */}
                        {activeTab === 'history' && (
                        <>
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase px-4 py-3">ID</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase px-4 py-3">User</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Bank Tujuan</th>
                                            <th className="text-right text-[11px] font-bold text-gray-500 uppercase px-4 py-3 pr-8">Nominal</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Tgl Request</th>
                                            <th className="text-center text-[11px] font-bold text-gray-500 uppercase px-4 py-3">Status</th>
                                            <th className="text-center text-[11px] font-bold text-gray-500 uppercase px-4 py-3">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {historyLoading ? (
                                            <tr><td colSpan={7}>
                                                <div className="space-y-3 py-4 px-6">
                                                    {[...Array(4)].map((_, i) => <div key={i} className="flex items-center gap-4 animate-pulse"><Skeleton className="h-3 w-[80px]" /><Skeleton className="h-3 w-[120px]" /><Skeleton className="h-3 w-[100px]" /><Skeleton className="h-3 w-[80px]" /><Skeleton className="h-3 w-[90px]" /></div>)}
                                                </div>
                                            </td></tr>
                                        ) : pagedHistory.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                                                <History className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                                <p>Belum ada riwayat withdraw</p>
                                            </td></tr>
                                        ) : pagedHistory.map(w => {
                                            const userUsername = w.user?.username ? `@${w.user.username}` : w.user?.email ? `@${w.user.email.split('@')[0]}` : null;
                                            return (
                                                <tr key={w.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">#{w.id}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{w.user?.name || `User ID: ${w.userId}`}</p>
                                                        {userUsername && <p className="text-[11px] text-gray-400">{userUsername}</p>}
                                                    </td>
                                                    <td className="px-4 py-3 hidden md:table-cell">
                                                        <div className="text-xs font-bold text-gray-900 dark:text-white">{w.bankName || '—'}</div>
                                                        <div className="text-[11px] font-mono text-gray-500">{w.accountNumber || ''}</div>
                                                        <div className="text-[10px] text-gray-400 uppercase">{w.accountName || ''}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right pr-8">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(w.amount)}</span>
                                                    </td>
                                                    <td className="px-4 py-3 hidden lg:table-cell">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-help border-b border-dashed border-gray-400 pb-px">
                                                                    {formatDate(w.createdAt, 'relative', tz, locale)}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                <p className="text-xs">{formatDate(w.createdAt, 'long', tz, locale)}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">{getWithdrawStatusBadge(w.status)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {w.notes ? (
                                                            <button onClick={() => setViewModal({ open: true, item: w })} className="text-xs text-blue-600 hover:underline">
                                                                Lihat Catatan
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Riwayat */}
                            <div className="space-y-3 sm:hidden p-4">
                                {pagedHistory.map(w => (
                                    <div key={w.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 bg-white dark:bg-gray-800 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">#{w.id}</span>
                                            {getWithdrawStatusBadge(w.status)}
                                        </div>
                                        <div className="text-xs text-gray-500 space-y-0.5">
                                            <div className="font-medium text-gray-800 dark:text-gray-200">{w.user?.name || `User ID: ${w.userId}`}</div>
                                            <div>{w.bankName ? `${w.bankName} • ${w.accountNumber}` : '—'}</div>
                                            {w.notes && <div className="text-gray-400 italic text-[11px]">"{w.notes}"</div>}
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="font-bold text-emerald-600 text-sm">{formatRupiah(w.amount)}</span>
                                            <span className="text-xs text-gray-500">{formatDate(w.createdAt, 'relative', tz, locale)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Riwayat */}
                            {!historyLoading && history.length > 0 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-xs text-gray-500 font-medium">{history.length} total riwayat</span>
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="text-xs font-bold px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">{historyPage} / {totalHistoryPages}</span>
                                        <button onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} disabled={historyPage === totalHistoryPages} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )}
                        </>
                        )}
                    </div>

                    {/* ── View Modal ── */}
                    {viewModal.open && viewModal.item && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Detail Catatan</h3>
                                    <button onClick={() => setViewModal({ open: false, item: null })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Catatan/Alasan Admin:</p>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewModal.item.notes || 'Tidak ada catatan.'}</p>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button onClick={() => setViewModal({ open: false, item: null })} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-semibold transition-colors text-sm">Tutup</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Action Modal ── */}
                    {actionModal.open && actionModal.item && actionModal.type && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                        actionModal.type === 'approve' ? 'bg-emerald-50 dark:bg-emerald-900/30'
                                        : actionModal.type === 'complete' ? 'bg-blue-50 dark:bg-blue-900/30'
                                        : 'bg-red-50 dark:bg-red-900/30'
                                    }`}>
                                        {actionModal.type === 'approve' && <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                                        {actionModal.type === 'complete' && <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                                        {actionModal.type === 'reject' && <X className="w-5 h-5 text-red-600 dark:text-red-400" />}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{modalTitleMap[actionModal.type]}</h3>
                                        <p className="text-xs text-gray-500">#{actionModal.item.id} — {actionModal.item.user?.name}</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    {/* Info */}
                                    <div className={`p-3 rounded-xl text-sm border space-y-1 ${
                                        actionModal.type === 'reject'
                                            ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50'
                                            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
                                    }`}>
                                        <p className="text-gray-500 dark:text-gray-400">User: <span className="font-semibold text-gray-900 dark:text-white">{actionModal.item.user?.name}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400">Nominal: <span className="font-bold text-emerald-600">{formatRupiah(actionModal.item.amount)}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400">Bank: <span className="font-semibold text-gray-900 dark:text-white">{actionModal.item.bankName} — {actionModal.item.accountNumber}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400 uppercase text-[11px]">{actionModal.item.accountName}</p>
                                    </div>

                                    {actionModal.type === 'reject' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Alasan Penolakan <span className="text-red-500">*</span></label>
                                            <textarea value={modalInput.reason} onChange={e => setModalInput(p => ({ ...p, reason: e.target.value }))}
                                                rows={3} placeholder="Contoh: Rekening tidak valid..."
                                                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white resize-none" />
                                        </div>
                                    )}

                                    {actionModal.type === 'complete' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">External Transaction ID <span className="text-gray-400 font-normal">(Opsional)</span></label>
                                                <input type="text" value={modalInput.extId} onChange={e => setModalInput(p => ({ ...p, extId: e.target.value }))}
                                                    placeholder="ID transaksi dari bank/gateway..."
                                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Gateway Reference <span className="text-gray-400 font-normal">(Opsional)</span></label>
                                                <input type="text" value={modalInput.ref} onChange={e => setModalInput(p => ({ ...p, ref: e.target.value }))}
                                                    placeholder="Referensi gateway..."
                                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                                            </div>
                                        </>
                                    )}

                                    {actionModal.type === 'approve' && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 text-sm">
                                            Pastikan Anda telah memverifikasi data rekening sebelum menyetujui penarikan ini.
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-1">
                                        <button
                                            onClick={executeAction}
                                            disabled={isSubmitting || (actionModal.type === 'reject' && !modalInput.reason.trim())}
                                            className={`flex-1 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm ${
                                                actionModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700'
                                                : actionModal.type === 'complete' ? 'bg-blue-600 hover:bg-blue-700'
                                                : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                        >
                                            {isSubmitting ? 'Memproses...' : 'Konfirmasi'}
                                        </button>
                                        <button
                                            onClick={() => setActionModal({ open: false, item: null, type: null })}
                                            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </TooltipProvider>
    )
}

export default function WithdrawPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <WithdrawContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
