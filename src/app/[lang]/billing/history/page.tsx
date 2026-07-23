"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { walletApi } from "@/lib/api";
import { RefreshCw, Search, History, AlertCircle, CheckCircle, Clock, XCircle, ArrowRight, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp")
}

function formatDate(dateString: string | undefined, format: 'relative' | 'long' | 'short' = 'long', tz: string = 'UTC', locale: string = 'id-ID') {
    if (!dateString) return "—";
    try {
        const date = new Date(dateString);
        if (format === 'long') return new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short', timeZone: tz }).format(date);
        if (format === 'short') return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short', timeZone: tz }).format(date);
        
        // relative
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diffInSeconds < 60) return "Baru saja";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: tz }).format(date);
    } catch {
        return dateString;
    }
}

function getTxTypeBadge(type: number | undefined) {
    if (type === 1) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">TopUp</span>;
    if (type === 2) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">Withdraw</span>;
    if (type === 3) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">Transfer</span>;
    if (type === 4) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Payment</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Lainnya</span>;
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

const DUMMY_TRANSACTIONS = [
    {
        id: 101,
        userId: 1,
        user: { name: "Budi Santoso", email: "budi@example.com", username: "budisan" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via Transfer Bank BCA",
        amount: 500000,
        balanceBefore: 100000,
        balanceAfter: 600000,
        status: "completed",
        referenceId: "TXN-TOPUP-001",
        createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 102,
        userId: 2,
        user: { name: "Siti Aminah", email: "siti@example.com", username: "siti_a" },
        type: 4,
        typeName: "Payment",
        description: "Pembayaran kelas privat",
        amount: -150000,
        balanceBefore: 400000,
        balanceAfter: 250000,
        status: "completed",
        referenceId: "TXN-PAY-002",
        createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
        id: 103,
        userId: 1,
        user: { name: "Budi Santoso", email: "budi@example.com", username: "budisan" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke Bank Mandiri",
        amount: 200000,
        balanceBefore: 250000,
        balanceAfter: 50000,
        status: "pending",
        referenceId: "TXN-WD-003",
        createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 104,
        userId: 3,
        user: { name: "Ahmad Fulan", email: "ahmad@example.com", username: "ahmadf" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via Virtual Account BNI",
        amount: 1000000,
        balanceBefore: 0,
        balanceAfter: 1000000,
        status: "completed",
        referenceId: "TXN-TOPUP-004",
        createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
        id: 105,
        userId: 4,
        user: { name: "Dewi Lestari", email: "dewi@example.com", username: "dewil" },
        type: 4,
        typeName: "Payment",
        description: "Pembayaran paket bulanan",
        amount: -350000,
        balanceBefore: 500000,
        balanceAfter: 150000,
        status: "completed",
        referenceId: "TXN-PAY-005",
        createdAt: new Date(Date.now() - 259200000).toISOString()
    },
    {
        id: 106,
        userId: 5,
        user: { name: "Eko Prasetyo", email: "eko@example.com", username: "ekop" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke Bank BCA",
        amount: 1500000,
        balanceBefore: 2000000,
        balanceAfter: 500000,
        status: "completed",
        referenceId: "TXN-WD-006",
        createdAt: new Date(Date.now() - 345600000).toISOString()
    },
    {
        id: 107,
        userId: 6,
        user: { name: "Farida Hanum", email: "farida@example.com", username: "faridah" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via GoPay",
        amount: 300000,
        balanceBefore: 50000,
        balanceAfter: 350000,
        status: "completed",
        referenceId: "TXN-TOPUP-007",
        createdAt: new Date(Date.now() - 432000000).toISOString()
    },
    {
        id: 108,
        userId: 7,
        user: { name: "Gilang Ramadhan", email: "gilang@example.com", username: "gilangr" },
        type: 3,
        typeName: "Transfer",
        description: "Transfer ke User #8",
        amount: -200000,
        balanceBefore: 800000,
        balanceAfter: 600000,
        status: "completed",
        referenceId: "TXN-TRF-008",
        createdAt: new Date(Date.now() - 518400000).toISOString()
    },
    {
        id: 109,
        userId: 8,
        user: { name: "Hendra Wijaya", email: "hendra@example.com", username: "hendraw" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via QRIS",
        amount: 450000,
        balanceBefore: 100000,
        balanceAfter: 550000,
        status: "completed",
        referenceId: "TXN-TOPUP-009",
        createdAt: new Date(Date.now() - 604800000).toISOString()
    },
    {
        id: 110,
        userId: 9,
        user: { name: "Indah Permata", email: "indah@example.com", username: "indahp" },
        type: 4,
        typeName: "Payment",
        description: "Pembayaran sertifikasi",
        amount: -600000,
        balanceBefore: 1000000,
        balanceAfter: 400000,
        status: "completed",
        referenceId: "TXN-PAY-010",
        createdAt: new Date(Date.now() - 691200000).toISOString()
    },
    {
        id: 111,
        userId: 10,
        user: { name: "Joko Susilo", email: "joko@example.com", username: "jokos" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke Bank BRI",
        amount: 800000,
        balanceBefore: 1200000,
        balanceAfter: 400000,
        status: "failed",
        referenceId: "TXN-WD-011",
        createdAt: new Date(Date.now() - 777600000).toISOString()
    },
    {
        id: 112,
        userId: 11,
        user: { name: "Kartika Sari", email: "kartika@example.com", username: "kartikas" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via Transfer Mandiri",
        amount: 2000000,
        balanceBefore: 300000,
        balanceAfter: 2300000,
        status: "completed",
        referenceId: "TXN-TOPUP-012",
        createdAt: new Date(Date.now() - 864000000).toISOString()
    }
];

function HistoryPageContent() {
    const { t } = useI18n();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [txLoading, setTxLoading] = useState(true);
    const [txError, setTxError] = useState<string | null>(null);
    const [txPage, setTxPage] = useState(1);
    const [txTotalPages, setTxTotalPages] = useState(1);
    const [isDemoMode, setIsDemoMode] = useState(false);
    
    // Search states
    const [searchInput, setSearchInput] = useState("");
    const [activeSearch, setActiveSearch] = useState("");

    const [txDetailModal, setTxDetailModal] = useState<{ open: boolean; item: any }>({ open: false, item: null });
    const [txDetailLoading, setTxDetailLoading] = useState(false);
    
    const TX_PAGE_SIZE = 10;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = 'id-ID';

    const [totalCount, setTotalCount] = useState(0);

    const fetchTransactions = useCallback(async (page: number, search: string = "") => {
        setTxLoading(true);
        setTxError(null);
        try {
            const res = await walletApi.getTransactions({ page, pageSize: TX_PAGE_SIZE });
            const data = res?.data || res;
            let items = Array.isArray(data) ? data : (data?.items || data?.data || []);
            
            if (items.length === 0) {
                items = DUMMY_TRANSACTIONS;
                setIsDemoMode(true);
            } else {
                setIsDemoMode(false);
            }

            if (search) {
                const lowerSearch = search.toLowerCase();
                items = items.filter((item: any) => 
                    item.user?.name?.toLowerCase().includes(lowerSearch) ||
                    item.description?.toLowerCase().includes(lowerSearch) ||
                    item.referenceId?.toLowerCase().includes(lowerSearch)
                );
            }

            const totalItems = data?.totalCount || items.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / TX_PAGE_SIZE));
            
            // Apply client-side pagination if demo or local filtering
            const displayItems = (isDemoMode || search || Array.isArray(data)) 
                ? items.slice((page - 1) * TX_PAGE_SIZE, page * TX_PAGE_SIZE) 
                : items;

            setTransactions(displayItems);
            setTotalCount(totalItems);
            setTxTotalPages(totalPages);
        } catch (err: any) {
            console.error("Error fetching transactions:", err);
            let items = DUMMY_TRANSACTIONS;
            setIsDemoMode(true);
            if (search) {
                const lowerSearch = search.toLowerCase();
                items = items.filter((item: any) => 
                    item.user?.name?.toLowerCase().includes(lowerSearch) ||
                    item.description?.toLowerCase().includes(lowerSearch) ||
                    item.referenceId?.toLowerCase().includes(lowerSearch)
                );
            }
            const displayItems = items.slice((page - 1) * TX_PAGE_SIZE, page * TX_PAGE_SIZE);
            setTransactions(displayItems);
            setTotalCount(items.length);
            setTxTotalPages(Math.max(1, Math.ceil(items.length / TX_PAGE_SIZE)));
        } finally {
            setTxLoading(false);
        }
    }, [isDemoMode]);

    useEffect(() => {
        fetchTransactions(txPage, activeSearch);
    }, [txPage, activeSearch, fetchTransactions]);

    const handleSearch = () => setActiveSearch(searchInput);
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    const openTxDetail = async (item: any) => {
        setTxDetailModal({ open: true, item });
        
        if (isDemoMode) return; // Keep dummy data, don't try to fetch detail if in demo mode
        
        setTxDetailLoading(true);
        try {
            const res = await walletApi.getTransactionById(item.id);
            const detail = res?.data || res;
            setTxDetailModal({ open: true, item: detail || item });
        } catch {
            // fallback: keep existing item data
        } finally {
            setTxDetailLoading(false);
        }
    };

    return (
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50">
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
                
                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">History Transaksi</h1>
                    </div>
                </div>



                {/* ── Main Content ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="flex flex-1 sm:w-72 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-shadow">
                                <div className="relative flex-1 bg-gray-50 dark:bg-gray-800">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Cari user, ref, deskripsi..."
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border-none focus:outline-none focus:ring-0 dark:text-white"
                                    />
                                </div>
                                <button onClick={handleSearch} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors">
                                    Cari
                                </button>
                            </div>
                        </div>
                        
                        <button onClick={() => fetchTransactions(txPage, activeSearch)} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium whitespace-nowrap px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                            <RefreshCw className="w-3 h-3" /> Refresh
                        </button>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">ID</th>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">User</th>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4 hidden md:table-cell">Tipe & Deskripsi</th>
                                    <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Nominal</th>
                                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4 hidden lg:table-cell">Tanggal</th>
                                    <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {txLoading ? (
                                    <tr><td colSpan={6}><div className="space-y-3 py-4 px-6">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="flex items-center gap-4 animate-pulse">
                                                <Skeleton className="h-3 w-[80px]" /><Skeleton className="h-3 w-[120px]" />
                                                <Skeleton className="h-3 w-[200px]" /><Skeleton className="h-3 w-[90px]" />
                                            </div>
                                        ))}
                                    </div></td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                                        <History className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                        <p>Belum ada riwayat transaksi</p>
                                    </td></tr>
                                ) : transactions.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">#{item.id}</span>
                                            {item.referenceId && <div className="text-[10px] text-gray-400 mt-1 font-mono">{item.referenceId}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">{item.user?.name || `User ID: ${item.userId}`}</p>
                                            <p className="text-[11px] text-gray-400">{item.user?.username ? `@${item.user.username}` : ''}</p>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="mb-1">{getTxTypeBadge(item.type)}</div>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{item.description || '—'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-bold text-sm ${item.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {item.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(item.amount))}
                                            </span>
                                            <div className="mt-1">{getStatusBadge(item.status)}</div>
                                        </td>
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                {formatDate(item.createdAt, 'short', tz, locale)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => openTxDetail(item)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {!txLoading && totalCount > 0 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Menampilkan {Math.min((txPage - 1) * TX_PAGE_SIZE + 1, totalCount)}–{Math.min(txPage * TX_PAGE_SIZE, totalCount)} dari {totalCount} data
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setTxPage(p => Math.max(1, p - 1))}
                                    disabled={txPage === 1}
                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-bold px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    {txPage} / {txTotalPages}
                                </span>
                                <button
                                    onClick={() => setTxPage(p => Math.min(txTotalPages, p + 1))}
                                    disabled={txPage === txTotalPages}
                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Modal Detail Transaksi */}
            <Dialog open={txDetailModal.open} onOpenChange={(open) => !open && setTxDetailModal({ open: false, item: null })}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">Detail Transaksi</DialogTitle>
                        <DialogDescription className="text-xs">
                            ID: {txDetailModal.item?.id} • Ref: {txDetailModal.item?.referenceId || '—'}
                        </DialogDescription>
                    </DialogHeader>

                    {txDetailLoading ? (
                        <div className="space-y-4 py-4 animate-pulse">
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
                        </div>
                    ) : txDetailModal.item && (
                        <div className="space-y-6">
                            {/* Amount Card */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Nominal</div>
                                <div className={`text-3xl font-black ${txDetailModal.item.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {txDetailModal.item.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(txDetailModal.item.amount || 0))}
                                </div>
                                <div className="mt-2 flex justify-center">{getStatusBadge(txDetailModal.item.status)}</div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 font-medium">Tipe Transaksi</span>
                                    <span>{getTxTypeBadge(txDetailModal.item.type)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 font-medium">Pengguna</span>
                                    <div className="text-right">
                                        <div className="font-bold text-gray-900 dark:text-white">{txDetailModal.item.user?.name || `User ID: ${txDetailModal.item.userId}`}</div>
                                        {txDetailModal.item.user?.username && <div className="text-xs text-gray-400">@{txDetailModal.item.user.username}</div>}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 font-medium">Waktu Transaksi</span>
                                    <span className="font-medium text-gray-900 dark:text-white text-right">
                                        {formatDate(txDetailModal.item.createdAt, 'long', tz, locale)}
                                    </span>
                                </div>
                                <div className="py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 font-medium block mb-1">Deskripsi</span>
                                    <span className="font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg block text-sm">
                                        {txDetailModal.item.description || 'Tidak ada deskripsi'}
                                    </span>
                                </div>
                                
                                {/* Balance Changes */}
                                <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-lg flex items-center justify-between text-xs mt-4 border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <div className="text-gray-500 mb-0.5">Saldo Awal</div>
                                        <div className="font-bold">{formatCurrency(txDetailModal.item.balanceBefore || 0)}</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                    <div className="text-right">
                                        <div className="text-gray-500 mb-0.5">Saldo Akhir</div>
                                        <div className="font-bold">{formatCurrency(txDetailModal.item.balanceAfter || 0)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="sm:justify-end mt-4">
                        <button onClick={() => setTxDetailModal({ open: false, item: null })} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg transition-colors">
                            Tutup
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function HistoryPage() {
    return (
        <DashboardLayout>
            <HistoryPageContent />
        </DashboardLayout>
    );
}
