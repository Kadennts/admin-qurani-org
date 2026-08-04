"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Wallet, History, CreditCard, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
    getSimWallet, 
    updateSimWallet, 
    getSimWalletBalances, 
    getSimTransactions 
} from "@/lib/sim-wallet-store";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

interface UserWalletDetailProps {
    userId: string;
    userData?: any; // To display profile info if needed
    hideProfileCard?: boolean; // Option to hide the profile card if rendered inside a page that already has one
    hideLimitFeature?: boolean; // Option to hide the "Set Limit" feature entirely
}

export function UserWalletDetail({ userId, userData, hideProfileCard = false, hideLimitFeature = false }: UserWalletDetailProps) {
    const router = useRouter();
    const pathname = usePathname();
    const lang = pathname?.split('/')[1] || 'en';

    const [loading, setLoading] = useState(true);
    const [walletData, setWalletData] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Edit Limit Modal State
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [limits, setLimits] = useState({
        dailyTopupLimit: "",
        dailyWithdrawLimit: "",
        dailyTransferLimit: "",
        minWithdrawAmount: "",
        maxBalance: ""
    });

    // Suspend Modal State
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [suspendReason, setSuspendReason] = useState("");

    // Activate Modal State
    const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const fetchData = () => {
        setLoading(true);
        try {
            // Mock Data Integration
            const wInfo = getSimWallet(userId);
            const wBalances = getSimWalletBalances(userId);
            const allTxs = getSimTransactions();
            const txData = allTxs.filter((tx: any) => String(tx.userId) === String(userId));
            
            setWalletData({
                ...wInfo,
                ...wBalances,
            });
            setTransactions(txData);
        } catch (err) {
            console.error("Error fetching wallet data:", err);
            toast.error("Gagal memuat data wallet");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchData();
        }
    }, [userId]);

    const handleSuspendWallet = () => {
        if (!suspendReason.trim()) {
            toast.error("Alasan penangguhan wajib diisi");
            return;
        }
        setIsProcessing(true);
        try {
            updateSimWallet(userId, { status: "suspended", suspendReason: suspendReason });
            fetchData();
            toast.success("Status dompet berhasil diubah menjadi Suspended");
            setIsSuspendModalOpen(false);
        } catch (error) {
            toast.error("Gagal melakukan suspend dompet");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleActivateWallet = () => {
        setIsProcessing(true);
        try {
            updateSimWallet(userId, { status: "active", suspendReason: null });
            fetchData();
            toast.success("Status dompet berhasil diaktifkan kembali");
            setIsActivateModalOpen(false);
        } catch (error) {
            toast.error("Gagal mengaktifkan dompet");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveLimit = () => {
        const parsedLimits = {
            dailyTopupLimit: parseInt(limits.dailyTopupLimit.replace(/\D/g, ''), 10) || null,
            dailyWithdrawLimit: parseInt(limits.dailyWithdrawLimit.replace(/\D/g, ''), 10) || null,
            dailyTransferLimit: parseInt(limits.dailyTransferLimit.replace(/\D/g, ''), 10) || null,
            minWithdrawAmount: parseInt(limits.minWithdrawAmount.replace(/\D/g, ''), 10) || null,
            maxBalance: parseInt(limits.maxBalance.replace(/\D/g, ''), 10) || null,
        };
        
        setIsProcessing(true);
        try {
            updateSimWallet(userId, { limits: parsedLimits });
            fetchData();
            toast.success("Limit wallet berhasil diperbarui");
            setIsLimitModalOpen(false);
        } catch (error) {
            toast.error("Gagal memperbarui limit wallet");
        } finally {
            setIsProcessing(false);
        }
    };

    const openLimitModal = () => {
        const currentLimits = walletData?.limits || {};
        setLimits({
            dailyTopupLimit: currentLimits.dailyTopupLimit?.toString() || "",
            dailyWithdrawLimit: currentLimits.dailyWithdrawLimit?.toString() || "",
            dailyTransferLimit: currentLimits.dailyTransferLimit?.toString() || "",
            minWithdrawAmount: currentLimits.minWithdrawAmount?.toString() || "",
            maxBalance: currentLimits.maxBalance?.toString() || ""
        });
        setIsLimitModalOpen(true);
    };

    const openSuspendModal = () => {
        setSuspendReason("");
        setIsSuspendModalOpen(true);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {!hideProfileCard && <Skeleton className="h-24 w-full rounded-2xl" />}
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    if (!walletData) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <AlertTriangle className="w-12 h-12 text-amber-400" />
                </div>
                <p className="text-base font-medium text-gray-600 dark:text-gray-400">Data Dompet User tidak ditemukan</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Profile Card with Wallet Status & ID */}
            {!hideProfileCard && userData && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-sm">
                            {userData?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{userData?.name}</h2>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                {userData?.username && (
                                    <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">@{userData.username.replace('@', '')}</span>
                                )}
                                {userData?.email && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{userData.email}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Move Wallet ID & Status to top right */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-1 text-right">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Status:</span>
                            <Badge variant="outline" className={`capitalize ${walletData.status?.toLowerCase() === 'suspended' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'}`}>
                                {walletData.status || 'Active'}
                            </Badge>
                        </div>
                        {walletData.status?.toLowerCase() === 'suspended' && walletData.suspendReason && (
                            <span className="text-[10px] text-red-500 font-medium mb-1 max-w-[150px] truncate" title={walletData.suspendReason}>
                                Alasan: {walletData.suspendReason}
                            </span>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">ID:</span>
                            <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">{walletData.id || `W-MOCK-${userId}`}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Wallet Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-bold text-gray-900 dark:text-white">Informasi Wallet</h3>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {!hideLimitFeature && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={openLimitModal}
                                disabled={isProcessing}
                                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            >
                                Set Limit
                            </Button>
                        )}
                        {walletData.status?.toLowerCase() === 'suspended' ? (
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                                onClick={() => setIsActivateModalOpen(true)}
                                disabled={isProcessing}
                            >
                                Aktifkan
                            </Button>
                        ) : (
                            <Button 
                                variant="destructive" 
                                size="sm"
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={openSuspendModal}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Suspend
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Saldo Aktif</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(walletData?.activeBalance || walletData?.balance || 0)}
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Saldo Pending</div>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(walletData?.pendingBalance || 0)}
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
                        <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Total Transaksi</div>
                        <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                            {transactions.length} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Transaksi</span>
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
                </div>

                {transactions.length === 0 ? (
                    <div className="text-center py-12 px-4 text-gray-400">
                        <History className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                        <p className="font-medium text-gray-500">Belum ada riwayat transaksi</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-800 tracking-wider font-bold">
                                <tr>
                                    <th className="px-5 py-3.5">ID</th>
                                    <th className="px-5 py-3.5">Kategori</th>
                                    <th className="px-5 py-3.5">Nominal</th>
                                    <th className="px-5 py-3.5">Metode</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5">Tanggal</th>
                                    <th className="px-5 py-3.5 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                                {transactions.map((tx: any) => (
                                    <tr 
                                        key={tx.id} 
                                        onClick={() => router.push(`/${lang}/billing/${tx.id}/transaction`)}
                                        className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-gray-900 dark:text-white text-sm">#{tx.id}</div>
                                            <div className="text-[10px] text-gray-400 uppercase mt-0.5">{tx.reference || `TXN-${tx.id}`}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col items-start gap-1">
                                                {getTxTypeBadge(tx.type)}
                                                <span className="text-[11px] text-gray-500 truncate max-w-[200px]">{tx.description || 'Transaksi'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className={`font-black text-sm ${tx.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {tx.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                                                {tx.paymentMethod || 'Wallet'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="bg-gray-50 dark:bg-gray-800/60 px-2.5 py-1 rounded border border-gray-100 dark:border-gray-700/50 inline-flex items-center">
                                                {getStatusBadge(tx.status)}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                {formatDate(tx.createdAt, 'relative', tz)}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <button className="text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 px-3 py-1.5 rounded-md transition-colors inline-flex items-center">
                                                Detail
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Limit Modal */}
            <Dialog open={isLimitModalOpen} onOpenChange={setIsLimitModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Ubah Limit Wallet</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dailyTopupLimit" className="text-right text-xs">Daily Topup Limit</Label>
                            <Input
                                id="dailyTopupLimit"
                                value={limits.dailyTopupLimit}
                                onChange={(e) => setLimits({...limits, dailyTopupLimit: e.target.value})}
                                className="col-span-3"
                                placeholder="Opsional (mis: 10000000)"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dailyWithdrawLimit" className="text-right text-xs">Daily Withdraw Limit</Label>
                            <Input
                                id="dailyWithdrawLimit"
                                value={limits.dailyWithdrawLimit}
                                onChange={(e) => setLimits({...limits, dailyWithdrawLimit: e.target.value})}
                                className="col-span-3"
                                placeholder="Opsional (mis: 5000000)"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dailyTransferLimit" className="text-right text-xs">Daily Transfer Limit</Label>
                            <Input
                                id="dailyTransferLimit"
                                value={limits.dailyTransferLimit}
                                onChange={(e) => setLimits({...limits, dailyTransferLimit: e.target.value})}
                                className="col-span-3"
                                placeholder="Opsional (mis: 5000000)"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="minWithdrawAmount" className="text-right text-xs">Min Withdraw</Label>
                            <Input
                                id="minWithdrawAmount"
                                value={limits.minWithdrawAmount}
                                onChange={(e) => setLimits({...limits, minWithdrawAmount: e.target.value})}
                                className="col-span-3"
                                placeholder="Opsional (mis: 50000)"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="maxBalance" className="text-right text-xs">Max Balance</Label>
                            <Input
                                id="maxBalance"
                                value={limits.maxBalance}
                                onChange={(e) => setLimits({...limits, maxBalance: e.target.value})}
                                className="col-span-3"
                                placeholder="Opsional (mis: 100000000)"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLimitModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSaveLimit} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Suspend Wallet Modal */}
            <Dialog open={isSuspendModalOpen} onOpenChange={setIsSuspendModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Suspend Wallet</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="suspendReason">Alasan Penangguhan (Required)</Label>
                            <Input
                                id="suspendReason"
                                value={suspendReason}
                                onChange={(e) => setSuspendReason(e.target.value)}
                                placeholder="Masukkan alasan wallet disuspend..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSuspendModalOpen(false)}>Batal</Button>
                        <Button variant="destructive" onClick={handleSuspendWallet} disabled={isProcessing || !suspendReason.trim()}>
                            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Suspend
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Activate Wallet Modal */}
            <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Aktifkan Wallet</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <Label>Alasan Penangguhan Sebelumnya:</Label>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                                {walletData?.suspendReason || "Tidak ada alasan penangguhan yang tercatat."}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">Apakah Anda yakin ingin mengaktifkan kembali wallet ini?</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsActivateModalOpen(false)}>Batal</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleActivateWallet} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Aktifkan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
