"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import {
    Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock,
    RotateCcw, AlertCircle, RefreshCw, MoreVertical,
    Check, X, Banknote, Receipt
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import { SmartPagination } from "@/components/ui/smart-pagination"
import { paymentsApi } from "@/lib/api"
import {
    getSimRefundPending,
    getSimRefundProcessed,
    approveSimRefund,
    rejectSimRefund,
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
import { useRouter } from "next/navigation"

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
        if (variant === 'long') { options.year = "numeric"; options.hour = "2-digit"; options.minute = "2-digit"; options.hour12 = false; options.timeZoneName = "short" }
        return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', options).format(date)
    } catch { return dateString }
}

interface RefundItem {
    id: number | string;
    userId?: number | string;
    userName?: string;
    trainerId?: number | string;
    trainerName?: string;
    bookingId?: number | string;
    amount: number;
    refundAmount?: number;
    status: string;
    paymentMethod?: string;
    refundReason?: string;
    sessionsInfo?: string;
    createdAt: string;
    updatedAt?: string;
    notes?: string;
}

// Data sepenuhnya dari sim-billing-store (persistent localStorage).
// DUMMY lama dihapus — gunakan getSimRefundPending() dan getSimRefundProcessed()
// yang sudah sinkron dengan 10 pesanan di halaman Orders/Pesanan.

function getStatusBadge(status: string) {
    const s = status?.toLowerCase() || '';
    if (s === 'refunded' || s === 'approved')
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" />Disetujui</span>;
    if (s === 'rejected' || s === 'failed')
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Ditolak</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>;
}

function RefundContent() {
    const { t, locale } = useTranslation(['billing', 'common'])
    const { profile } = useAuth()
    const router = useRouter()

    const resolveTimezone = useCallback(() => {
        const isValidTimezone = (tz: string) => { try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(new Date()); return true; } catch { return false; } }
        let cached = ""; try { const raw = localStorage.getItem('myqurani_user_profile_v2'); if (raw) { cached = JSON.parse(raw)?.timezone || ""; } } catch { }
        const fromProfile = String(profile?.timezone || "").trim();
        const preferred = cached || fromProfile;
        if (preferred && isValidTimezone(preferred)) return preferred;
        if (fromProfile && isValidTimezone(fromProfile)) return fromProfile;
        try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz && isValidTimezone(tz)) return tz; } catch { }
        return "UTC";
    }, [profile?.timezone]);

    const [tz, setTz] = useState("UTC");
    useEffect(() => { setTz(resolveTimezone()); }, [resolveTimezone]);

    const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');
    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [pendingRefunds, setPendingRefunds] = useState<RefundItem[]>([]);
    const [processedRefunds, setProcessedRefunds] = useState<RefundItem[]>([]);
    const [processedLoading, setProcessedLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [page, setPage] = useState(1);
    const [processedPage, setProcessedPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [processedPageSize, setProcessedPageSize] = useState(10);

    const [stats, setStats] = useState({ pendingCount: 0, pendingTotal: 0, processedCount: 0 });

    // User wallet modal
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedUserName, setSelectedUserName] = useState<string>("");

    // Modal
    const [actionModal, setActionModal] = useState<{ open: boolean; item: RefundItem | null; type: 'approve' | 'reject' }>({ open: false, item: null, type: 'approve' });
    const [viewModal, setViewModal] = useState<{ open: boolean; item: RefundItem | null }>({ open: false, item: null });
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (viewModal.open) setViewModal({ open: false, item: null });
                if (actionModal.open) setActionModal({ open: false, item: null, type: 'approve' });
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [viewModal.open, actionModal.open]);

    // ── Fetch pending refunds ─────────────────────────────────────────────────
    const fetchPending = useCallback(async () => {
        setLoading(true);
        try {
            // paymentsApi.getPendingRefunds → GET /api/v1/Payments/pending-refunds
            const res = await paymentsApi.getPendingRefunds({ page: 1, pageSize: 100 } as any);
            let items: RefundItem[] = Array.isArray(res) ? res : (res?.data || res?.items || []);
            if (!Array.isArray(items)) items = [];

            if (items.length === 0) {
                items = getSimRefundPending();
                setIsDemoMode(true);
            } else setIsDemoMode(false);

            if (activeSearch) {
                const q = activeSearch.toLowerCase();
                items = items.filter(r => r.userName?.toLowerCase().includes(q) || r.trainerName?.toLowerCase().includes(q) || String(r.id).includes(q) || r.refundReason?.toLowerCase().includes(q));
            }

            setPendingRefunds(items);
            setStats(prev => ({ ...prev, pendingCount: items.length, pendingTotal: items.reduce((a: number, b: any) => a + (b.refundAmount ?? b.amount), 0) }));
        } catch {
            const fallback = getSimRefundPending();
            setPendingRefunds(fallback);
            setIsDemoMode(true);
            setStats(prev => ({ ...prev, pendingCount: fallback.length, pendingTotal: fallback.reduce((a: number, b: any) => a + b.amount, 0) }));
        } finally {
            setLoading(false);
        }
    }, [activeSearch]);

    const fetchProcessed = useCallback(async () => {
        setProcessedLoading(true);
        try {
            const res = await paymentsApi.search({ Status: 'refunded', Page: 1, PageSize: 100 } as any);
            let items: RefundItem[] = Array.isArray(res) ? res : (res?.items || res?.data || []);
            if (!Array.isArray(items)) items = [];
            if (items.length === 0) items = getSimRefundProcessed();
            setProcessedRefunds(items);
            setStats(prev => ({ ...prev, processedCount: items.length }));
        } catch {
            const fallback = getSimRefundProcessed();
            setProcessedRefunds(fallback);
            setStats(prev => ({ ...prev, processedCount: fallback.length }));
        } finally {
            setProcessedLoading(false);
        }
    }, []);

    useEffect(() => { fetchPending(); }, [fetchPending]);
    useEffect(() => { if (activeTab === 'processed') fetchProcessed(); }, [activeTab, fetchProcessed]);

    const handleSearch = () => { setActiveSearch(search); setPage(1); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSearch(); };

    const openAction = (item: RefundItem, type: 'approve' | 'reject') => {
        setActionModal({ open: true, item, type });
        setNotes("");
    };

    const handleRowClick = (bookingId: number | string | undefined) => {
        if (!bookingId) return
        router.push(`/${locale}/billing/orders/${bookingId}?from=refund`)
    };

    const handleProcessRefund = async () => {
        if (!actionModal.item) return;
        if (actionModal.type === 'reject' && !notes.trim()) {
            showToast({ type: 'error', title: 'Catatan wajib diisi', message: 'Harap isi alasan penolakan.' });
            return;
        }
        setIsSubmitting(true);
        try {
            // paymentsApi.processRefund → POST /api/v1/Payments/{id}/process-refund
            await paymentsApi.processRefund(actionModal.item.id, {
                approved: actionModal.type === 'approve' ? 1 : 0,
                notes: notes.trim() || undefined,
                amount: actionModal.item.refundAmount ?? actionModal.item.amount,
            });
            showToast({
                type: 'success',
                title: actionModal.type === 'approve' ? 'Refund Disetujui' : 'Refund Ditolak',
                message: actionModal.type === 'approve'
                    ? 'Refund berhasil disetujui dan akan diproses ke user.'
                    : 'Refund berhasil ditolak.',
            });
            setActionModal({ open: false, item: null, type: 'approve' });
            fetchPending();
        } catch {
            // Demo fallback: simpan ke sim-billing-store (persistent)
            if (actionModal.type === 'approve') {
                approveSimRefund(actionModal.item!.id, notes.trim() || undefined);
            } else {
                rejectSimRefund(actionModal.item!.id, notes.trim() || 'Ditolak oleh Admin');
            }

            // Refresh dari store
            const newPending = getSimRefundPending();
            const newProcessed = getSimRefundProcessed();
            setPendingRefunds(newPending);
            setProcessedRefunds(newProcessed);
            setStats(prev => ({
                ...prev,
                pendingCount: newPending.length,
                pendingTotal: newPending.reduce((a: number, b: any) => a + (b.refundAmount ?? b.amount), 0),
                processedCount: newProcessed.length,
            }));

            showToast({
                type: 'info',
                title: `[DEMO] Refund ${actionModal.type === 'approve' ? 'Disetujui' : 'Ditolak'}`,
                message: 'Aksi berhasil disimulasikan secara lokal.',
            });
            setActionModal({ open: false, item: null, type: 'approve' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const paged = pendingRefunds.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.max(1, Math.ceil(pendingRefunds.length / pageSize));
    const pagedProcessed = processedRefunds.slice((processedPage - 1) * processedPageSize, processedPage * processedPageSize);
    const totalProcessedPages = Math.max(1, Math.ceil(processedRefunds.length / processedPageSize));

    return (
        <TooltipProvider>
            <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
                <ToastContainer />
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <RotateCcw className="w-6 h-6 text-rose-500" />
                                Refund
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
                            { label: "Pending Refund", value: stats.pendingCount, icon: Clock, bg: "bg-amber-100 dark:bg-amber-900/30", clr: "text-amber-600 dark:text-amber-400" },
                            { label: "Total Nilai Pending", value: formatRupiah(stats.pendingTotal), icon: Banknote, bg: "bg-rose-100 dark:bg-rose-900/30", clr: "text-rose-600 dark:text-rose-400", isStr: true },
                            { label: "Sudah Diproses", value: stats.processedCount, icon: CheckCircle2, bg: "bg-emerald-100 dark:bg-emerald-900/30", clr: "text-emerald-600 dark:text-emerald-400" },
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
                        <div className="flex flex-col-reverse sm:flex-row items-center border-b border-gray-100 dark:border-gray-700 px-4 gap-3 justify-between">
                            {/* Toolbar (Search) - Left Side */}
                            <div className="py-2 w-full sm:w-auto flex flex-wrap items-center gap-2">
                                <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-rose-500 transition-shadow w-full sm:w-auto">
                                    <div className="relative bg-white dark:bg-gray-900 flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleKeyDown}
                                            placeholder="Cari nama, alasan..."
                                            className="w-full sm:w-52 pl-8 pr-3 py-1.5 text-xs bg-transparent border-none focus:outline-none dark:text-white" />
                                    </div>
                                    <button onClick={handleSearch} className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors">Cari</button>
                                </div>
                            </div>

                            {/* Tabs - Right Side */}
                            <div className="flex items-center gap-0 w-full sm:w-auto justify-start sm:justify-end flex-wrap">
                                {[
                                    { key: 'pending' as const, label: 'Pending Refund', count: pendingRefunds.length },
                                    { key: 'processed' as const, label: 'Sudah Diproses' },
                                ].map(tab => (
                                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                        className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 -mb-px whitespace-nowrap ${activeTab === tab.key ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                        {tab.label}
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">{tab.count}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ══ TAB: PENDING REFUND ══ */}
                        {activeTab === 'pending' && (
                        <>
                            {/* Mobile */}
                            <div className="space-y-3 sm:hidden p-4">
                                {loading ? (
                                    <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="border rounded-lg p-4 space-y-2 animate-pulse"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /></div>)}</div>
                                ) : paged.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400"><RotateCcw className="w-10 h-10 mx-auto mb-3 text-gray-300" /><p>Tidak ada refund pending</p></div>
                                ) : paged.map(r => (
                                    <div
                                        key={r.id}
                                        onClick={() => handleRowClick(r.bookingId)}
                                        className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm transition-colors ${r.bookingId ? 'cursor-pointer hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50/30 dark:hover:bg-rose-900/10' : ''}`}
                                    >
                                        <div className="flex justify-between">
                                            <span className="font-mono text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-md">#{r.bookingId || r.id}</span>
                                            {getStatusBadge(r.status)}
                                        </div>
                                        <div className="text-xs text-gray-500 space-y-1">
                                            <div>User: <button onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/billing/${r.userId}/wallet`); }} className="font-medium text-gray-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 hover:underline">{r.userName || `ID: ${r.userId}`}</button></div>
                                            <div>Guru: <span className="font-medium text-gray-900 dark:text-white">{r.trainerName}</span></div>
                                            {r.sessionsInfo && <div>Sesi: <span className="font-medium text-rose-600 dark:text-rose-400">{r.sessionsInfo}</span></div>}
                                            {r.refundReason && <div className="text-gray-500 italic">"{r.refundReason}"</div>}
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <span className="font-bold text-rose-600 dark:text-rose-400">{formatRupiah(r.refundAmount ?? r.amount)}</span>
                                            <div className="flex gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); openAction(r, 'approve'); }} className="text-xs font-semibold text-emerald-600 border border-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors">Setuju</button>
                                                <button onClick={(e) => { e.stopPropagation(); openAction(r, 'reject'); }} className="text-xs font-semibold text-red-600 border border-red-300 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Tolak</button>
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
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Kode Pesanan</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">User</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Guru</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden xl:table-cell">Sesi</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Alasan</th>
                                            <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 pr-8">Nilai Refund</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Tgl Request</th>
                                            <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {loading ? (
                                            <tr><td colSpan={7}>
                                                <div className="space-y-3 py-4 px-6">
                                                    {[...Array(3)].map((_, i) => <div key={i} className="flex items-center gap-4 animate-pulse"><Skeleton className="h-3 flex-1" /><Skeleton className="h-3 flex-1" /><Skeleton className="h-3 flex-1" /></div>)}
                                                </div>
                                            </td></tr>
                                        ) : paged.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                                                <RotateCcw className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                                <p>Tidak ada permintaan refund pending</p>
                                            </td></tr>
                                        ) : paged.map(r => (
                                            <tr
                                                key={r.id}
                                                onClick={() => handleRowClick(r.bookingId)}
                                                className={`transition-colors ${r.bookingId ? 'cursor-pointer hover:bg-rose-50/40 dark:hover:bg-rose-900/10' : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-800">
                                                        #{r.bookingId || r.id}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/billing/${r.userId}/wallet`); }} className="font-medium text-gray-900 dark:text-white text-sm hover:text-rose-600 dark:hover:text-rose-400 hover:underline text-left">{r.userName || `ID: ${r.userId}`}</button>
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <div className="font-medium text-gray-900 dark:text-white text-sm">{r.trainerName || `ID: ${r.trainerId}`}</div>
                                                </td>
                                                <td className="px-4 py-3 hidden xl:table-cell">
                                                    <div className="text-[11px] font-semibold text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-800 max-w-fit">{r.sessionsInfo || '—'}</div>
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic max-w-[200px] truncate">
                                                        {r.refundReason || '—'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-right pr-8">
                                                    <span className="font-bold text-rose-600 dark:text-rose-400">{formatRupiah(r.refundAmount ?? r.amount)}</span>
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-help border-b border-dashed border-gray-400 pb-px">
                                                                {formatDate(r.createdAt, 'relative', tz, locale)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p className="text-xs">{formatDate(r.createdAt, 'long', tz, locale)}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => openAction(r, 'approve')}
                                                            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                                        >
                                                            <Check className="w-3.5 h-3.5" /> Setuju
                                                        </button>
                                                        <button
                                                            onClick={() => openAction(r, 'reject')}
                                                            className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" /> Tolak
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <SmartPagination
                                total={pendingRefunds.length}
                                page={page}
                                pageSize={pageSize}
                                onPageChange={setPage}
                                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                                loading={loading}
                            />
                        </>
                        )}

                        {/* ══ TAB: SUDAH DIPROSES ══ */}
                        {activeTab === 'processed' && (
                        <>
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase px-4 py-3">Kode Pesanan</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase px-4 py-3">User</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Guru</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase px-4 py-3 hidden xl:table-cell">Sesi</th>
                                            <th className="text-right text-[11px] font-bold text-gray-500 uppercase px-4 py-3 pr-8">Nilai Refund</th>
                                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Tgl Proses</th>
                                            <th className="text-center text-[11px] font-bold text-gray-500 uppercase px-4 py-3">Status</th>
                                            <th className="text-center text-[11px] font-bold text-gray-500 uppercase px-4 py-3">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {processedLoading ? (
                                            <tr><td colSpan={7}><div className="py-8 px-6 flex items-center justify-center gap-2 text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /> Memuat...</div></td></tr>
                                        ) : pagedProcessed.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-12 text-gray-400"><Receipt className="w-10 h-10 mx-auto mb-3 text-gray-300" /><p>Belum ada refund yang diproses</p></td></tr>
                                        ) : pagedProcessed.map(r => (
                                            <tr
                                                key={r.id}
                                                onClick={() => handleRowClick(r.bookingId)}
                                                className={`transition-colors ${r.bookingId ? 'cursor-pointer hover:bg-rose-50/40 dark:hover:bg-rose-900/10' : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'}`}
                                            >
                                                <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-800">#{r.bookingId || r.id}</span></td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                    <button onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/billing/${r.userId}/wallet`); }} className="hover:text-rose-600 dark:hover:text-rose-400 hover:underline text-left">{r.userName || `ID: ${r.userId}`}</button>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hidden md:table-cell">{r.trainerName || '—'}</td>
                                                <td className="px-4 py-3 hidden xl:table-cell">
                                                    <div className="text-[11px] font-semibold text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-800 max-w-fit">{r.sessionsInfo || '—'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right pr-8 font-bold text-rose-600 dark:text-rose-400">{formatRupiah(r.refundAmount ?? r.amount)}</td>
                                                <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 hidden lg:table-cell">{formatDate(r.updatedAt || r.createdAt, 'relative', tz, locale)}</td>
                                                <td className="px-4 py-3 text-center">{getStatusBadge(r.status)}</td>
                                                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                    {(r.notes || r.refundReason) ? (
                                                        <button onClick={() => setViewModal({ open: true, item: r })} className="text-xs text-rose-600 hover:underline">
                                                            Lihat Catatan
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <SmartPagination
                                total={processedRefunds.length}
                                page={processedPage}
                                pageSize={processedPageSize}
                                onPageChange={setProcessedPage}
                                onPageSizeChange={(s) => { setProcessedPageSize(s); setProcessedPage(1); }}
                                loading={processedLoading}
                            />
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
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Catatan/Alasan Admin:</p>
                                        <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{viewModal.item.notes || 'Tidak ada catatan.'}</p>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button onClick={() => setViewModal({ open: false, item: null })} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-semibold transition-colors text-sm">Tutup</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Action Modal ── */}
                    {actionModal.open && actionModal.item && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3`}>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${actionModal.type === 'approve' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                                        {actionModal.type === 'approve'
                                            ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            : <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        }
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                            {actionModal.type === 'approve' ? 'Setujui Refund' : 'Tolak Refund'}
                                        </h3>
                                        <p className="text-xs text-gray-500">#{actionModal.item.bookingId || actionModal.item.id} — {actionModal.item.userName}</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className={`p-3 rounded-xl text-sm border space-y-1 ${actionModal.type === 'approve' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50'}`}>
                                        <p className="text-gray-500 dark:text-gray-400">User: <span className="font-semibold text-gray-900 dark:text-white">{actionModal.item.userName}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400">Nilai Refund: <span className="font-bold text-rose-600 dark:text-rose-400">{formatRupiah(actionModal.item.refundAmount ?? actionModal.item.amount)}</span></p>
                                        {actionModal.item.refundReason && <p className="text-gray-500 dark:text-gray-400 italic text-xs">"{actionModal.item.refundReason}"</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            {actionModal.type === 'reject' ? <>Alasan Penolakan <span className="text-red-500">*</span></> : 'Catatan (Opsional)'}
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            rows={3}
                                            placeholder={actionModal.type === 'reject' ? "Contoh: Alasan refund tidak valid..." : "Catatan tambahan untuk user..."}
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-1">
                                        <button
                                            onClick={handleProcessRefund}
                                            disabled={isSubmitting || (actionModal.type === 'reject' && !notes.trim())}
                                            className={`flex-1 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm ${actionModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                                        >
                                            {isSubmitting ? 'Memproses...' : actionModal.type === 'approve' ? 'Setujui Refund' : 'Tolak Refund'}
                                        </button>
                                        <button
                                            onClick={() => { setActionModal({ open: false, item: null, type: 'approve' }); setNotes(""); }}
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

export default function RefundPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <RefundContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
