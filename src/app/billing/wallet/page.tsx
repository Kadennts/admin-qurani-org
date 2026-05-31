"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { 
    Wallet, 
    TrendingUp, 
    ArrowDownRight, 
    Clock, 
    Plus, 
    Calendar, 
    ChevronDown, 
    ArrowRight,
    Search
} from "lucide-react"

// ─── Dummy Data ──────────────────────────────────────────────────────────────

const WALLET_STATS = [
    {
        title: "Saldo Tersedia",
        value: 480000,
        icon: Wallet,
        color: "emerald",
        bgColor: "bg-emerald-50",
        iconColor: "text-emerald-500"
    },
    {
        title: "Total Top up",
        value: 600000,
        icon: TrendingUp,
        color: "blue",
        bgColor: "bg-sky-50",
        iconColor: "text-sky-500"
    },
    {
        title: "Pengeluaran",
        value: 200000,
        icon: ArrowDownRight,
        color: "orange",
        bgColor: "bg-orange-50",
        iconColor: "text-orange-500"
    },
    {
        title: "Total Pending",
        value: 50000,
        icon: Clock,
        color: "amber",
        bgColor: "bg-amber-50",
        iconColor: "text-amber-500"
    }
]

const TRANSACTIONS = [
    {
        id: "TX-205",
        date: "29 Mar 2026",
        activity: "Top Up via BCA Virtual Account",
        type: "TOPUP",
        status: "SUCCESS",
        amount: 500000,
        isPositive: true
    },
    {
        id: "TX-204",
        date: "29 Mar 2026",
        activity: "Paket 5x Pertemuan",
        type: "PAYMENT",
        status: "SUCCESS",
        amount: 125000,
        isPositive: false
    },
    {
        id: "TX-203",
        date: "28 Mar 2026",
        activity: "Top Up via GoPay",
        type: "TOPUP",
        status: "SUCCESS",
        amount: 100000,
        isPositive: true
    },
    {
        id: "TX-202",
        date: "28 Mar 2026",
        activity: "Paket 1x Pertemuan",
        type: "PAYMENT",
        status: "SUCCESS",
        amount: 75000,
        isPositive: false
    }
]

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
    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 p-6">
            <div className="max-w-[1400px] mx-auto space-y-8">
                
                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Wallet</h1>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-emerald-500 transition-all shadow-sm">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>All time</span>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        
                        <button className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 dark:shadow-none">
                            <Plus className="w-4 h-4" />
                            <span>Isi Saldo</span>
                        </button>
                    </div>
                </div>

                {/* ── Stats Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {WALLET_STATS.map((stat, i) => {
                        const Icon = stat.icon
                        return (
                            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</span>
                                    <div className={`p-2.5 rounded-xl ${stat.bgColor} dark:bg-gray-800/50`}>
                                        <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(stat.value)}
                                    </h3>
                                    <button className="text-[10px] font-bold text-gray-400 hover:text-emerald-600 transition-colors uppercase tracking-wider flex items-center gap-1 group">
                                        Klik untuk rincian 
                                        <ChevronDown className="w-3 h-3 -rotate-90 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Recent Transactions ── */}
                <div className="bg-white dark:bg-gray-900 border border-white dark:border-gray-800 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between p-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Transaksi Terakhir</h2>
                        <button className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                            Lihat Semua
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left bg-gray-50/50 dark:bg-gray-800/30">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tgl Transaksi</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aktivitas</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Nominal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {TRANSACTIONS.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group">
                                        <td className="px-6 py-5 text-[11px] font-medium text-gray-400 font-mono">{tx.id}</td>
                                        <td className="px-6 py-5 text-gray-600 dark:text-gray-400 font-medium">{tx.date}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 dark:text-white">{tx.activity}</span>
                                                <span className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${tx.type === 'TOPUP' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                    {tx.type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-5 text-right font-bold text-base ${tx.isPositive ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>
                                            {tx.isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
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
