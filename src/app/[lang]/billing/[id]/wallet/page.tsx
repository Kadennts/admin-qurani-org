"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { walletApi } from "@/lib/api";
import { getSimTransactions } from "@/lib/sim-wallet-store";
import { ArrowLeft, Wallet, History, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

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
        return <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Berhasil</span>;
    }
    if (s === "pending" || s === "waiting") {
        return <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Pending</span>;
    }
    if (s === "failed" || s === "rejected" || s === "cancelled") {
        return <span className="text-[10px] font-bold text-red-600 dark:text-red-400">Gagal</span>;
    }
    return <span className="text-[10px] font-bold text-gray-500">{status || "—"}</span>;
}

export default function UserWalletPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params?.id as string;
    const lang = params?.lang as string;

    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch wallet info
                let walletInfo = null;
                try {
                    const res = await walletApi.getWalletByUserId?.(userId);
                    walletInfo = res?.data || res;
                } catch (e) {
                    console.error("Failed to fetch user wallet info:", e);
                }

                // Fetch transactions
                let txData = [];
                try {
                    // Try admin API first
                    const resTx = await walletApi.getTransactions?.({ page: 1, pageSize: 50 }); // Adjust to proper admin API if available
                    const allTxs = resTx?.data || resTx?.items || resTx || [];
                    if (Array.isArray(allTxs) && allTxs.length > 0) {
                        txData = allTxs.filter((tx: any) => String(tx.userId) === userId);
                    } else {
                        // Fallback to dummy data
                        const dummyTxs = getSimTransactions();
                        txData = dummyTxs.filter((tx: any) => String(tx.userId) === userId);
                    }
                } catch (e) {
                    // Fallback to dummy data
                    const dummyTxs = getSimTransactions();
                    txData = dummyTxs.filter((tx: any) => String(tx.userId) === userId);
                }

                setTransactions(txData);
                
                // Construct user data from transaction history if wallet API failed
                if (txData.length > 0 && !walletInfo?.id) {
                    const latestTx = txData[0];
                    setUserData({
                        id: userId,
                        name: latestTx.user?.name || `User ID: ${userId}`,
                        username: latestTx.user?.username,
                        email: latestTx.user?.email,
                        wallet: {
                            balance: latestTx.balanceAfter || 0,
                            status: "active",
                            id: null // Dummy
                        }
                    });
                } else if (walletInfo) {
                    // We might not have full user profile from wallet API alone, 
                    // merge with whatever we can get from transactions
                    const userRef = txData.length > 0 ? txData[0].user : {};
                    setUserData({
                        id: userId,
                        ...userRef,
                        wallet: walletInfo
                    });
                } else {
                    setUserData({ id: userId, name: `User ID: ${userId}`, wallet: { balance: 0, status: 'unknown' } });
                }

            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    return (
        <DashboardLayout>
            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50 min-h-screen">
                <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
                    
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <Link 
                            href={`/${lang}/billing/transaction`}
                            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </Link>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Kelola Wallet Pengguna</h1>
                            <p className="text-xs sm:text-sm text-gray-500">Menampilkan detail profil, informasi wallet, dan riwayat transaksi</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-6">
                            <Skeleton className="h-24 w-full rounded-2xl" />
                            <Skeleton className="h-32 w-full rounded-2xl" />
                            <Skeleton className="h-64 w-full rounded-2xl" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            
                            {/* Profile Card */}
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/50 shadow-sm flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-sm">
                                    {userData?.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{userData?.name}</h2>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                        {userData?.username && (
                                            <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">@{userData.username}</span>
                                        )}
                                        {userData?.email && (
                                            <span className="text-sm text-gray-500 dark:text-gray-400">{userData.email}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Wallet Summary */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-bold text-gray-900 dark:text-white">Informasi Wallet</h3>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Saldo Tersedia</div>
                                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(userData?.wallet?.balance || 0)}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Status Wallet</div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                            <span className="font-semibold text-gray-900 dark:text-white capitalize">
                                                {userData?.wallet?.status || 'Aktif'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Wallet ID</div>
                                        <div className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            {userData?.wallet?.id || `W-MOCK-${userId}`}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Transaction History */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <History className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-bold text-gray-900 dark:text-white">Riwayat Transaksi</h3>
                                    </div>
                                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full font-bold">
                                        {transactions.length} transaksi
                                    </span>
                                </div>

                                {transactions.length === 0 ? (
                                    <div className="text-center py-12 px-4 text-gray-400">
                                        <History className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                        <p className="font-medium text-gray-500">Belum ada riwayat transaksi</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {transactions.map((tx: any) => (
                                            <div 
                                                key={tx.id} 
                                                onClick={() => router.push(`/${lang}/billing/${tx.id}/transaction`)}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer gap-4"
                                            >
                                                <div className="flex items-start gap-4 min-w-0">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${tx.amount < 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                        <span className="text-lg font-black">{tx.amount < 0 ? '−' : '+'}</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate mb-1">
                                                            {tx.description || 'Transaksi'}
                                                        </div>
                                                        <div className="flex items-center flex-wrap gap-2">
                                                            {getTxTypeBadge(tx.type)}
                                                            <span className="text-[11px] text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{tx.paymentMethod || 'Wallet'}</span>
                                                            <span className="text-[11px] text-gray-400">{formatDate(tx.createdAt, 'relative', tz)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center pl-14 sm:pl-0 shrink-0 gap-2">
                                                    <div className={`text-sm sm:text-base font-black ${tx.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {tx.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700">
                                                        {getStatusBadge(tx.status)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
