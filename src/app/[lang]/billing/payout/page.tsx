"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import {
    Search, ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle,
    Wallet, ArrowUpRight, Check, X, MoreVertical, RefreshCw, AlertCircle,
    Banknote, Users, TrendingUp, CheckSquare
} from "lucide-react"
import Image from "next/image"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import { paymentsApi } from "@/lib/api"
import {
    getSimPayoutPending,
    getSimPayoutHistory,
    confirmSimPayout,
} from "@/lib/sim-billing-store"
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

interface PendingPayout {
    id: number | string;
    userId?: number | string;
    userName?: string;
    trainerId?: number | string;
    trainerName?: string;
    bookingId?: number | string;
    amount: number;
    status: string;
    paymentMethod?: string;
    createdAt: string;
    updatedAt?: string;
    payoutReference?: string;
    isPaidOut?: boolean;
    notes?: string;
}

type ActivePayoutTab = 'pending' | 'selesai';

function getPayoutStatusBadge(status: string | undefined) {
    const s = (status || "").toLowerCase();
    if (s === "paid_out" || s === "completed") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" />Selesai</span>;
    }
    if (s === "paid" || s === "pending_payout") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending Payout</span>;
    }
    if (s === "failed" || s === "rejected" || s === "cancelled") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Gagal</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{status || "—"}</span>;
}

// Dummy data hanya untuk fallback saat store kosong
const DUMMY_PAYOUTS: PendingPayout[] = [
    { id: 1, userId: 101, userName: "Ahmad", trainerId: 201, trainerName: "Ustadz Budi", bookingId: 501, amount: 150000, status: "paid", paymentMethod: "GoPay", createdAt: new Date().toISOString() },
    { id: 2, userId: 102, userName: "Siti", trainerId: 202, trainerName: "Ustadzah Aisyah", bookingId: 502, amount: 250000, status: "paid", paymentMethod: "Bank Transfer", createdAt: new Date().toISOString() },
    { id: 3, userId: 103, userName: "Fatimah", trainerId: 201, trainerName: "Ustadz Budi", bookingId: 503, amount: 100000, status: "paid", paymentMethod: "OVO", createdAt: new Date().toISOString() },
];

const DUMMY_COMPLETED: PendingPayout[] = [
    { id: 10, userId: 104, userName: "Yusuf", trainerId: 203, trainerName: "Ustadz Hamid", bookingId: 510, amount: 200000, status: "paid_out", paymentMethod: "QRIS", createdAt: new Date(Date.now() - 86400000).toISOString(), payoutReference: "PAY-2026-001" },
];

function PayoutContent() {
    const { t, locale } = useTranslation(['billing', 'common'])
    const { profile } = useAuth()

    const resolveTimezone = useCallback(() => {
        const isValidTimezone = (tz: string) => {
            try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(new Date()); return true; } catch { return false; }
        }
        let cachedTimezone = ""
        try {
            const raw = localStorage.getItem('myqurani_user_profile_v2')
            if (raw) { const parsed = JSON.parse(raw); cachedTimezone = String(parsed?.timezone || "").trim(); }
        } catch { /* no-op */ }
        const fromProfile = String(profile?.timezone || "").trim()
        const preferred = cachedTimezone || fromProfile
        if (preferred && isValidTimezone(preferred)) return preferred
        if (fromProfile && isValidTimezone(fromProfile)) return fromProfile
        try { const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (browserTz && isValidTimezone(browserTz)) return browserTz; } catch { /* no-op */ }
        return "UTC"
    }, [profile?.timezone])

    const [userTimezone, setUserTimezone] = useState<string>("UTC")
    useEffect(() => { setUserTimezone(resolveTimezone()) }, [resolveTimezone])

    const [activeTab, setActiveTab] = useState<ActivePayoutTab>('pending');
    const [loading, setLoading] = useState(true);
    const [payouts, setPayouts] = useState<PendingPayout[]>([]);
    const [completedPayouts, setCompletedPayouts] = useState<PendingPayout[]>([]);
    const [completedLoading, setCompletedLoading] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);

    // Search & Pagination (Pending)
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [page, setPage] = useState(1);
    const [completedPage, setCompletedPage] = useState(1);
    const PAGE_SIZE = 10;

    // Stats
    const [stats, setStats] = useState({ pendingCount: 0, pendingTotal: 0, completedCount: 0 });

    // Bulk select
    const [selectedIds, setSelectedIds] = useState<Array<number | string>>([]);

    // Modal states
    const [markPayoutModal, setMarkPayoutModal] = useState<PendingPayout | null>(null);
    const [bulkPayoutModal, setBulkPayoutModal] = useState(false);
    const [viewModal, setViewModal] = useState<{ open: boolean; item: PendingPayout | null }>({ open: false, item: null });
    const [payoutReference, setPayoutReference] = useState("");
    const [payoutNotes, setPayoutNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Fetch Pending Payouts ────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await paymentsApi.getPendingPayouts({ page: 1, pageSize: 100 });
            let items: PendingPayout[] = Array.isArray(res) ? res : (res?.data || res?.items || []);
            if (!Array.isArray(items)) items = [];

            if (items.length === 0) {
                // Gunakan sim-billing-store (persistent localStorage)
                items = getSimPayoutPending();
                setIsDemoMode(true);
            } else {
                setIsDemoMode(false);
            }

            if (activeSearch) {
                const q = activeSearch.toLowerCase();
                items = items.filter(p =>
                    p.userName?.toLowerCase().includes(q) ||
                    p.trainerName?.toLowerCase().includes(q) ||
                    String(p.id).includes(q) ||
                    String(p.bookingId || '').includes(q)
                );
            }

            setPayouts(items);
            setStats(prev => ({ ...prev, pendingCount: items.length, pendingTotal: items.reduce((a, b) => a + b.amount, 0) }));
        } catch (error) {
            console.error("Error fetching pending payouts:", error);
            const fallback = getSimPayoutPending();
            setPayouts(fallback);
            setIsDemoMode(true);
            setStats(prev => ({ ...prev, pendingCount: fallback.length, pendingTotal: fallback.reduce((a, b) => a + b.amount, 0) }));
        } finally {
            setLoading(false);
        }
    }, [activeSearch]);

    // ── Fetch Completed Payouts ──────────────────────────────────────────────
    const fetchCompleted = useCallback(async () => {
        setCompletedLoading(true);
        try {
            const res = await paymentsApi.search({ Status: 'paid_out', Page: 1, PageSize: 100 } as any);
            let items: PendingPayout[] = Array.isArray(res) ? res : (res?.items || res?.data || []);
            if (!Array.isArray(items)) items = [];

            if (items.length === 0) {
                // Gunakan sim-billing-store (persistent localStorage)
                items = getSimPayoutHistory();
            }
            setCompletedPayouts(items);
            setStats(prev => ({ ...prev, completedCount: items.length }));
        } catch {
            const fallback = getSimPayoutHistory();
            setCompletedPayouts(fallback);
            setStats(prev => ({ ...prev, completedCount: fallback.length }));
        } finally {
            setCompletedLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { if (activeTab === 'selesai') fetchCompleted(); }, [activeTab, fetchCompleted]);

    const handleSearch = () => { setActiveSearch(searchInput); setPage(1); setSelectedIds([]); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSearch(); };

    // ── Payout Action: mark single payment as paid out ───────────────────────
    const handleMarkPayout = async (paymentId: string | number) => {
        if (!payoutReference.trim()) {
            showToast({ type: 'error', title: 'Referensi wajib diisi', message: 'Harap isi kolom Referensi Payout sebelum melanjutkan.' });
            return;
        }
        setIsSubmitting(true);
        try {
            // paymentsApi.markPayout → POST /api/v1/Payments/{id}/mark-payout
            await paymentsApi.markPayout(paymentId, { payoutReference: payoutReference.trim(), notes: payoutNotes });
            showToast({ type: 'success', title: 'Payout Berhasil', message: 'Pembayaran telah berhasil ditandai sebagai sudah dibayarkan ke guru.' });
            setMarkPayoutModal(null);
            setPayoutReference("");
            setPayoutNotes("");
            fetchData();
        } catch (err: any) {
            // Demo fallback: simpan ke sim-billing-store (persistent)
            confirmSimPayout(paymentId, payoutReference.trim(), payoutNotes.trim() || undefined);

            // Update state lokal
            setPayouts(getSimPayoutPending());
            setCompletedPayouts(getSimPayoutHistory());

            const newPending = getSimPayoutPending();
            setStats(prev => ({
                ...prev,
                pendingCount: newPending.length,
                pendingTotal: newPending.reduce((a, b) => a + b.amount, 0),
                completedCount: getSimPayoutHistory().length,
            }));

            showToast({ type: 'info', title: '[DEMO] Payout Ditandai', message: 'Pembayaran berhasil ditandai sebagai sudah dibayarkan (simulasi lokal).' });
            setMarkPayoutModal(null);
            setPayoutReference("");
            setPayoutNotes("");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Payout Action: bulk mark payments as paid out ────────────────────────
    const handleBulkPayout = async () => {
        if (!payoutReference.trim()) {
            showToast({ type: 'error', title: 'Referensi wajib diisi', message: 'Harap isi kolom Referensi Payout sebelum melanjutkan.' });
            return;
        }
        setIsSubmitting(true);
        try {
            // paymentsApi.bulkPayout → POST /api/v1/Payments/bulk-payout
            await paymentsApi.bulkPayout({ paymentIds: selectedIds, payoutReference: payoutReference.trim(), notes: payoutNotes });
            showToast({ type: 'success', title: 'Bulk Payout Berhasil', message: `${selectedIds.length} pembayaran berhasil ditandai sebagai sudah dibayarkan.` });
            setBulkPayoutModal(false);
            setPayoutReference("");
            setPayoutNotes("");
            setSelectedIds([]);
            fetchData();
        } catch {
            // Demo fallback: simpan ke sim-billing-store (persistent)
            selectedIds.forEach(pid => confirmSimPayout(pid, payoutReference.trim(), payoutNotes.trim() || undefined));

            // Refresh dari store
            const newPending = getSimPayoutPending();
            const newHistory = getSimPayoutHistory();
            setPayouts(newPending);
            setCompletedPayouts(newHistory);
            setStats(prev => ({
                ...prev,
                pendingCount: newPending.length,
                pendingTotal: newPending.reduce((a, b) => a + b.amount, 0),
                completedCount: newHistory.length,
            }));

            showToast({ type: 'info', title: '[DEMO] Bulk Payout', message: `${selectedIds.length} pembayaran ditandai (simulasi lokal).` });
            setBulkPayoutModal(false);
            setPayoutReference("");
            setPayoutNotes("");
            setSelectedIds([]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(payouts.length / PAGE_SIZE));
    const paged = payouts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const totalCompletedPages = Math.max(1, Math.ceil(completedPayouts.length / PAGE_SIZE));
    const pagedCompleted = completedPayouts.slice((completedPage - 1) * PAGE_SIZE, completedPage * PAGE_SIZE);

    const toggleSelectAll = () => {
        if (selectedIds.length === paged.length) setSelectedIds([]);
        else setSelectedIds(paged.map(p => p.id));
    };
    const toggleSelect = (id: number | string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const tz = userTimezone;

    return (
        <TooltipProvider>
            <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
                <ToastContainer />
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payout Guru</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchData()}
                                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
                            >
                                <RefreshCw className="w-4 h-4 text-gray-500" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* ── Overview Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: "Pending Payout", value: stats.pendingCount, icon: Clock, bg: "bg-amber-100 dark:bg-amber-900/30", iconClr: "text-amber-600 dark:text-amber-400", isNum: true },
                            { label: "Total Nilai Pending", value: formatRupiah(stats.pendingTotal), icon: Banknote, bg: "bg-blue-100 dark:bg-blue-900/30", iconClr: "text-blue-600 dark:text-blue-400", isNum: false },
                            { label: "Selesai Dibayar", value: stats.completedCount, icon: CheckCircle2, bg: "bg-emerald-100 dark:bg-emerald-900/30", iconClr: "text-emerald-600 dark:text-emerald-400", isNum: true },
                        ].map(card => {
                            const Icon = card.icon;
                            return (
                                <div key={card.label} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                                    <div className={`p-3 ${card.bg} ${card.iconClr} rounded-lg flex-shrink-0`}>
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

                    {/* ── Tabs + Table ── */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                        {/* Tab Header */}
                        <div className="flex items-center border-b border-gray-100 dark:border-gray-700 px-4 pt-0 gap-0">
                            {[
                                { key: 'pending' as ActivePayoutTab, label: 'Pending Payout', count: payouts.length },
                                { key: 'selesai' as ActivePayoutTab, label: 'Sudah Dibayar' },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 -mb-px ${
                                        activeTab === tab.key
                                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {tab.label}
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}

                            {/* Toolbar right side */}
                            <div className="flex items-center gap-2 ml-auto py-2">
                                {activeTab === 'pending' && (
                                    <>
                                        {selectedIds.length > 0 && (
                                            <button
                                                onClick={() => setBulkPayoutModal(true)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors"
                                            >
                                                <CheckSquare className="w-3.5 h-3.5" />
                                                Bulk Payout ({selectedIds.length})
                                            </button>
                                        )}
                                        <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                                            <div className="relative bg-white dark:bg-gray-900">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                <input
                                                    value={searchInput}
                                                    onChange={e => setSearchInput(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    placeholder="Cari nama guru, user..."
                                                    className="w-52 pl-8 pr-3 py-1.5 text-xs bg-transparent border-none focus:outline-none focus:ring-0 dark:text-white"
                                                />
                                            </div>
                                            <button
                                                onClick={handleSearch}
                                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                                            >
                                                Cari
                                            </button>
                                        </div>
                                    </>
                                )}
                                {activeTab === 'selesai' && (
                                    <button
                                        onClick={() => fetchCompleted()}
                                        className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 transition-colors"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ══ TAB: PENDING PAYOUT ══ */}
                        {activeTab === 'pending' && (
                        <>
                        {/* MOBILE CARD VIEW (<640px) */}
                        <div className="space-y-3 sm:hidden p-4">
                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 animate-pulse">
                                            <div className="flex justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-16 rounded-full" /></div>
                                            <div className="grid grid-cols-2 gap-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" /></div>
                                        </div>
                                    ))}
                                </div>
                            ) : paged.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                    <p>Tidak ada antrean payout pending</p>
                                </div>
                            ) : paged.map(p => (
                                <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 text-emerald-600 rounded border-gray-300" />
                                            <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">
                                                #{p.bookingId || p.id}
                                            </span>
                                        </div>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            {formatDate(p.createdAt, 'relative', tz, locale)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <div>User: <span className="font-medium text-gray-900 dark:text-white">{p.userName || `ID: ${p.userId}`}</span></div>
                                        <div>Guru: <span className="font-medium text-gray-900 dark:text-white">{p.trainerName || `Trainer ID: ${p.trainerId}`}</span></div>
                                        <div>Metode: <span className="font-medium text-gray-900 dark:text-white">{p.paymentMethod || '—'}</span></div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(p.amount)}</span>
                                        <button
                                            onClick={() => setMarkPayoutModal(p)}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                        >
                                            <Check className="w-3.5 h-3.5" /> Tandai Dibayar
                                        </button>
                                    </div>
                                    <div className="pt-1">{getPayoutStatusBadge(p.status)}</div>
                                </div>
                            ))}
                        </div>

                        {/* DESKTOP TABLE (≥640px) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="w-10 px-4 py-3 text-center">
                                            <input type="checkbox"
                                                checked={paged.length > 0 && selectedIds.length === paged.length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 text-emerald-600 rounded border-gray-300" />
                                        </th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Kode Pesanan</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">User (Pembayar)</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Guru (Penerima)</th>
                                        <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 pr-8">Nominal</th>
                                        <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Metode</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Tgl Bayar</th>
                                        <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {loading ? (
                                        <tr><td colSpan={9}>
                                            <div className="space-y-3 py-4 px-6">
                                                {[...Array(4)].map((_, i) => (
                                                    <div key={i} className="flex items-center gap-4 animate-pulse">
                                                        {[80,120,100,120,80,80,90,60].map((w,j) => <Skeleton key={j} className={`h-3 w-[${w}px]`} />)}
                                                    </div>
                                                ))}
                                            </div>
                                        </td></tr>
                                    ) : paged.length === 0 ? (
                                        <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                                            <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                            <p>Tidak ada antrean payout pending</p>
                                        </td></tr>
                                    ) : paged.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                            <td className="px-4 py-3 text-center">
                                                <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 text-emerald-600 rounded border-gray-300" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                                    #{p.bookingId || p.id}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-white text-sm">{p.userName || `User ID: ${p.userId}`}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-white text-sm">{p.trainerName || `Trainer ID: ${p.trainerId}`}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right pr-8">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(p.amount)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {getPayoutStatusBadge(p.status)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                                                {p.paymentMethod || '—'}
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-help border-b border-dashed border-gray-400 dark:border-gray-500 pb-px">
                                                            {formatDate(p.createdAt, 'relative', tz, locale)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p className="text-xs">{formatDate(p.createdAt, 'long', tz, locale)}</p>
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
                                                        <DropdownMenuLabel>Aksi Payout</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => setMarkPayoutModal(p)}>
                                                            <Check className="w-4 h-4 mr-2 text-emerald-600" />
                                                            <span className="font-medium text-emerald-600">Tandai Dibayarkan</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Pending */}
                        {!loading && payouts.length > 0 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, payouts.length)}–{Math.min(page * PAGE_SIZE, payouts.length)} dari {payouts.length} data
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

                        {/* ══ TAB: SUDAH DIBAYAR ══ */}
                        {activeTab === 'selesai' && (
                        <>
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Kode Pesanan</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">User</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Guru</th>
                                        <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 pr-8">Nominal</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Referensi Payout</th>
                                        <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Tgl Bayar</th>
                                        <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                                        <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {completedLoading ? (
                                        <tr><td colSpan={8}>
                                            <div className="space-y-3 py-4 px-6">
                                                {[...Array(3)].map((_, i) => <div key={i} className="flex items-center gap-4 animate-pulse"><Skeleton className="h-3 w-full" /></div>)}
                                            </div>
                                        </td></tr>
                                    ) : pagedCompleted.length === 0 ? (
                                        <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                                            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                            <p>Belum ada payout yang selesai</p>
                                        </td></tr>
                                    ) : pagedCompleted.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                                                    #{p.bookingId || p.id}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-sm text-gray-900 dark:text-white">{p.userName || `ID: ${p.userId}`}</td>
                                            <td className="px-4 py-3 font-medium text-sm text-gray-900 dark:text-white">{p.trainerName || `ID: ${p.trainerId}`}</td>
                                            <td className="px-4 py-3 text-right pr-8">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(p.amount)}</span>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-gray-500">{p.payoutReference || '—'}</td>
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                    {formatDate(p.updatedAt || p.createdAt, 'relative', tz, locale)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">{getPayoutStatusBadge(p.status)}</td>
                                            <td className="px-4 py-3 text-center">
                                                {p.notes ? (
                                                    <button onClick={() => setViewModal({ open: true, item: p })} className="text-xs text-emerald-600 hover:underline">
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

                        {/* Mobile Selesai */}
                        <div className="space-y-3 sm:hidden p-4">
                            {pagedCompleted.map(p => (
                                <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 bg-white dark:bg-gray-800 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">#{p.bookingId || p.id}</span>
                                        {getPayoutStatusBadge(p.status)}
                                    </div>
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <div>Guru: <span className="font-medium text-gray-900 dark:text-white">{p.trainerName}</span></div>
                                        {p.payoutReference && <div>Ref: <span className="font-mono text-gray-700 dark:text-gray-300">{p.payoutReference}</span></div>}
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <span className="font-bold text-emerald-600 text-sm">{formatRupiah(p.amount)}</span>
                                        <span className="text-xs text-gray-500">{formatDate(p.createdAt, 'relative', tz, locale)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Selesai */}
                        {!completedLoading && completedPayouts.length > 0 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-xs text-gray-500 font-medium">{completedPayouts.length} data selesai</span>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setCompletedPage(p => Math.max(1, p - 1))} disabled={completedPage === 1}
                                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs font-bold px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        {completedPage} / {totalCompletedPages}
                                    </span>
                                    <button onClick={() => setCompletedPage(p => Math.min(totalCompletedPages, p + 1))} disabled={completedPage === totalCompletedPages}
                                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                        </>
                        )}
                    </div>

                    {/* ── Modals ── */}

                    {/* View Modal */}
                    {viewModal.open && viewModal.item && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Detail Catatan</h3>
                                    <button onClick={() => setViewModal({ open: false, item: null })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Catatan Admin:</p>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{viewModal.item.notes || 'Tidak ada catatan.'}</p>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button onClick={() => setViewModal({ open: false, item: null })} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-semibold transition-colors text-sm">Tutup</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mark Payout Modal */}
                    {markPayoutModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Tandai Sudah Dibayarkan</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Konfirmasi transfer ke guru</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl text-sm border border-emerald-100 dark:border-emerald-800/50 space-y-1">
                                        <p className="text-gray-500 dark:text-gray-400">Payment ID: <span className="font-semibold text-gray-900 dark:text-white">#{markPayoutModal.id}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400">Guru: <span className="font-semibold text-gray-900 dark:text-white">{markPayoutModal.trainerName}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400">Nominal: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(markPayoutModal.amount)}</span></p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Referensi Payout <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={payoutReference}
                                            onChange={e => setPayoutReference(e.target.value)}
                                            placeholder="Contoh: TRF-2026-001, REF-BANK-XXX"
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Catatan <span className="text-gray-400 font-normal">(Opsional)</span>
                                        </label>
                                        <textarea
                                            value={payoutNotes}
                                            onChange={e => setPayoutNotes(e.target.value)}
                                            rows={2}
                                            placeholder="Catatan tambahan..."
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-1">
                                        <button
                                            onClick={() => handleMarkPayout(markPayoutModal.id)}
                                            disabled={isSubmitting || !payoutReference.trim()}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm"
                                        >
                                            {isSubmitting ? 'Memproses...' : 'Konfirmasi Payout'}
                                        </button>
                                        <button
                                            onClick={() => { setMarkPayoutModal(null); setPayoutReference(""); setPayoutNotes(""); }}
                                            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bulk Payout Modal */}
                    {bulkPayoutModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                        <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Bulk Payout</h3>
                                        <p className="text-xs text-gray-500">{selectedIds.length} pembayaran terpilih</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl text-sm border border-blue-100 dark:border-blue-800/50">
                                        <p className="text-gray-600 dark:text-gray-300">Total dipilih: <span className="font-bold text-blue-600 dark:text-blue-400">{selectedIds.length} pembayaran</span></p>
                                        <p className="text-gray-600 dark:text-gray-300 mt-0.5">Total nilai: <span className="font-bold text-emerald-600">{formatRupiah(payouts.filter(p => selectedIds.includes(p.id)).reduce((a, b) => a + b.amount, 0))}</span></p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Referensi Payout <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={payoutReference}
                                            onChange={e => setPayoutReference(e.target.value)}
                                            placeholder="Contoh: BATCH-2026-001"
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Catatan <span className="text-gray-400 font-normal">(Opsional)</span>
                                        </label>
                                        <textarea
                                            value={payoutNotes}
                                            onChange={e => setPayoutNotes(e.target.value)}
                                            rows={2}
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-1">
                                        <button
                                            onClick={handleBulkPayout}
                                            disabled={isSubmitting || !payoutReference.trim()}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm"
                                        >
                                            {isSubmitting ? 'Memproses...' : 'Proses Bulk Payout'}
                                        </button>
                                        <button
                                            onClick={() => { setBulkPayoutModal(false); setPayoutReference(""); setPayoutNotes(""); }}
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

export default function PayoutPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <PayoutContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
