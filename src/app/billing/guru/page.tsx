"use client"

import { useState, useMemo, useEffect } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import Link from "next/link"
import Image from "next/image"
import {
    Search, ChevronLeft, ChevronRight, Star, Eye, Users,
    ChevronsUpDown, Sparkles, BadgeCheck, ShieldOff, ShieldCheck,
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

// ── helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? null
}

function getFallbackAvatar(seed: unknown) {
    let numSeed = 1
    if (typeof seed === "number" && Number.isFinite(seed)) {
        numSeed = seed
    } else if (typeof seed === "string" && seed.length > 0) {
        let hash = 0
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash)
        }
        numSeed = Math.abs(hash) || 1
    } else {
        const numberValue = Number(seed)
        numSeed = Number.isFinite(numberValue) ? numberValue : 1
    }
    return `https://i.pravatar.cc/150?img=${(numSeed % 70) + 1}`
}

// ── status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
    verified: { label: "Terverifikasi", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", icon: BadgeCheck },
    pending: { label: "Menunggu", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", icon: ShieldOff },
    suspended: { label: "Nonaktif", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500", icon: ShieldOff },
    rejected: { label: "Ditolak", bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500", icon: ShieldOff },
} as const

type GuruStatus = "all" | "verified" | "pending" | "suspended" | "rejected"

// ── API Only ─────────────────────────────────────────────────────────────

type SortField = "name" | "rating" | "totalStudents" | "totalRevenue"
const PAGE_SIZE = 10

function GuruContent() {
    const [apiGurus, setApiGurus] = useState<any[]>([])
    const [guruStatuses, setGuruStatuses] = useState<Record<number, "verified" | "pending" | "suspended" | "rejected">>({})

    useEffect(() => {
        const token = getClientToken()
        const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
        fetch(`${API_BASE_URL}/api/v1/Trainers`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
            .then(res => {
                if (res.status === 401) {
                    console.warn("API returned 401 Unauthorized. Using dummy data instead.")
                    return []
                }
                if (!res.ok) throw new Error(`HTTP Error ${res.status}`)
                return res.json()
            })
            .then(data => {
                const trainers = data.data || data
                if (!Array.isArray(trainers)) return
                // Filter: only include trainers with a real username (not auto-generated "guru{id}@...")
                const realTrainers = trainers.filter((d: any) => {
                    const uname = d.username || d.userName || ""
                    // Exclude generic/auto-generated usernames
                    if (/^guru\d+$/.test(uname)) return false
                    if (!uname || uname.trim() === "") return false
                    // Filter out generic names like "Guru -"
                    if (uname.includes("Guru -") || (d.name && d.name.includes("Guru -"))) return false
                    if (d.userName && d.userName.includes("Guru -")) return false
                    return true
                })
                const mappedReal = realTrainers.map((d: any) => {
                    const rawStatus = String(d.status || "verified").toLowerCase()
                    const validStatus = (rawStatus === "active" || rawStatus === "verified") ? "verified" : rawStatus === "suspended" ? "suspended" : rawStatus === "rejected" ? "rejected" : rawStatus === "pending" ? "pending" : "verified"
                    
                    const name = d.userName || d.name || `Guru #${d.id}`
                    
                    return {
                        id: d.id,
                        name: name,
                        // Show username below name (not email)
                        email: d.email || "",
                        username: d.username || d.userUsername || name.toLowerCase().replace(/\s+/g, ""),
                        specialization: d.expertise?.join?.(", ") || d.headline || "Pengajar Al-Qur'an",
                        avatar: d.userImage || d.avatar || getFallbackAvatar(d.id ?? name),
                        rating: d.averageRating || d.rating || 0,
                        status: validStatus,
                        teachingMethod: (Array.isArray(d.expertise) && d.expertise.length > 0) ? d.expertise[0] : (typeof d.expertise === "string" ? d.expertise : "Umum"),
                    joinDate: d.createdAt ? d.createdAt.substring(0, 10) : "2025-01-01",
                    stats: {
                        totalStudents: d.totalStudents || 0,
                        totalSessions: d.totalCourses || 0,
                        totalRevenue: d.totalRevenue || 0,
                        activeBookings: 0
                    }
                }})
                setApiGurus(mappedReal)
            })
            .catch(err => {
                console.error("Failed to fetch trainers:", err)
                setApiGurus([])
            })
    }, [])

    const guruList = useMemo(() => {
        return apiGurus.map(g => ({
            ...g,
            status: guruStatuses[g.id] ?? g.status,
        }))
    }, [apiGurus, guruStatuses])

    function handleGuruAction(guruId: number, guruName: string, currentStatus: "verified" | "pending" | "suspended") {
        if (currentStatus === "pending") {
            setGuruStatuses(prev => ({ ...prev, [guruId]: "verified" }))
            showToast({ type: "success", title: `${guruName} berhasil diverifikasi`, message: "Guru sekarang dapat menerima murid.", endpoint: `PUT / api / v1 / Trainers / ${guruId}/verify` })
        } else if (currentStatus === "verified") {
            setGuruStatuses(prev => ({ ...prev, [guruId]: "suspended" }))
            showToast({ type: "info", title: `${guruName} dinonaktifkan`, message: "Guru tidak dapat menerima pesanan baru.", endpoint: `PUT /api/v1/Trainers/${guruId}/suspend` })
        } else { // currentStatus === "suspended"
            setGuruStatuses(prev => ({ ...prev, [guruId]: "verified" }))
            showToast({ type: "info", title: `${guruName} diaktifkan kembali`, message: "Status guru dikembalikan menjadi Terverifikasi.", endpoint: `PUT /api/v1/Trainers/${guruId}/unsuspend` })
        }
    }

    const [search, setSearch] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [statusFilter, setStatus] = useState<GuruStatus>("all")
    const [sortField, setSortField] = useState<SortField>("name")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
    const [page, setPage] = useState(1)

    const handleSearch = () => {
        setSearch(searchInput)
        setPage(1)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return guruList
            .filter(g => {
                const matchSearch = !q || g.name.toLowerCase().includes(q) || g.specialization.toLowerCase().includes(q) || g.email.toLowerCase().includes(q)
                const matchStatus = statusFilter === "all" || g.status === statusFilter
                return matchSearch && matchStatus
            })
            .sort((a, b) => {
                let av: number | string = a.name, bv: number | string = b.name
                if (sortField === "rating") { av = a.rating; bv = b.rating }
                else if (sortField === "totalStudents") { av = a.stats.totalStudents; bv = b.stats.totalStudents }
                else if (sortField === "totalRevenue") { av = a.stats.totalRevenue; bv = b.stats.totalRevenue }
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
                return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
            })
    }, [guruList, search, statusFilter, sortField, sortDir])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function handleSort(f: SortField) {
        if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortField(f); setSortDir("asc") }
        setPage(1)
    }

    function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 ml-0.5 opacity-40 inline-block" />
        return <span className="ml-0.5 text-emerald-500 inline-block">{sortDir === "asc" ? "↑" : "↓"}</span>
    }

    // summary counts
    const countVerified = guruList.filter(g => g.status === "verified").length
    const countPending = guruList.filter(g => g.status === "pending").length
    const countSuspended = guruList.filter(g => g.status === "suspended").length
    const countRejected = guruList.filter(g => g.status === "rejected").length

    const STATUS_TABS: { key: GuruStatus; label: string; count: number; color: string }[] = [
        { key: "all", label: "Semua", count: guruList.length, color: "emerald" },
        { key: "verified", label: "Terverifikasi", count: countVerified, color: "emerald" },
        { key: "pending", label: "Menunggu", count: countPending, color: "amber" },
        { key: "suspended", label: "Nonaktif", count: countSuspended, color: "red" },
        { key: "rejected", label: "Ditolak", count: countRejected, color: "rose" },
    ]

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <ToastContainer />
            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guru</h1>
                    </div>
                </div>

                {/* ── Status filter tabs + Search bar ── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        {STATUS_TABS.map(t => {
                            const active = statusFilter === t.key
                            const colorMap: Record<string, string> = {
                                emerald: active ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400",
                                amber: active ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-amber-400",
                                red: active ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-red-400",
                                rose: active ? "bg-rose-500 text-white border-rose-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-rose-400",
                            }
                            return (
                                <button key={t.key}
                                    onClick={() => { setStatus(t.key); setPage(1) }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${colorMap[t.color]}`}>
                                    {t.key === "all" && <Sparkles className="w-3.5 h-3.5" />}
                                    {t.label}: {t.count}
                                </button>
                            )
                        })}
                    </div>

                    {/* ── Search bar (kanan, sejajar tabs) ── */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex w-full lg:w-[22rem]">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    value={searchInput}
                                    onChange={e => setSearchInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Cari nama, email, atau spesialisasi..."
                                    className="w-full pl-9 pr-4 py-2 text-sm rounded-l-lg border border-r-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-r-lg border border-emerald-500 transition-colors flex items-center gap-2"
                            >
                                <Search className="w-4 h-4" /> Cari
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Guru
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("rating")}>
                                        Rating <SortIcon field="rating" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Metode Mengaji
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("totalStudents")}>
                                        Murid <SortIcon field="totalStudents" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                                        onClick={() => handleSort("totalRevenue")}>
                                        Total Revenue <SortIcon field="totalRevenue" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Pesanan Aktif
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Status
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada data yang ditemukan</p>
                                        </td>
                                    </tr>
                                ) : paged.map(guru => {
                                    const st = STATUS_CFG[guru.status as keyof typeof STATUS_CFG]
                                    return (
                                        <tr key={guru.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                            {/* Guru */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Link
                                                        href={`/billing/guru/${guru.id}`}
                                                        className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/30 hover:ring-emerald-400 dark:hover:ring-emerald-500 transition-all hover:scale-110"
                                                        title={`Lihat profil ${guru.name}`}
                                                    >
                                                        <Image
                                                            src={guru.avatar}
                                                            alt={guru.name}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                        />
                                                    </Link>
                                                    <div>
                                                        <Link
                                                            href={`/billing/guru/${guru.id}`}
                                                            className="font-bold text-gray-900 dark:text-white text-xs leading-tight hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors"
                                                        >
                                                            {guru.name}
                                                        </Link>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[160px]">
                                                            @{guru.username}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Rating */}
                                            <td className="px-4 py-3">
                                                {guru.rating > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{guru.rating.toFixed(1)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            {/* Metode */}
                                            <td className="px-4 py-3 text-xs italic font-semibold text-gray-700 dark:text-gray-300">
                                                {guru.teachingMethod}
                                            </td>
                                            {/* Murid */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">
                                                {guru.status === "verified"
                                                    ? <>{guru.stats.totalStudents} murid</>
                                                    : <span className="text-gray-400 dark:text-gray-600">—</span>}
                                            </td>
                                            {/* Revenue */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">
                                                {guru.status === "verified"
                                                    ? formatRupiah(guru.stats.totalRevenue)
                                                    : <span className="text-gray-400 dark:text-gray-600">—</span>}
                                            </td>
                                            {/* Aktif */}
                                            <td className="px-4 py-3">
                                                {guru.status === "verified" ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        {guru.stats.activeBookings} aktif
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st?.bg ?? ""} ${st?.text ?? ""}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st?.dot ?? ""}`} />
                                                    {st?.label ?? guru.status}
                                                </span>
                                            </td>
                                            {/* Aksi */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/billing/guru/${guru.id}`}
                                                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg transition-colors">
                                                        <Eye className="w-3.5 h-3.5" /> Detail
                                                    </Link>
                                                    {guru.status === "pending" && (
                                                        <button
                                                            onClick={() => handleGuruAction(guru.id, guru.name, guru.status)}
                                                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors">
                                                            <BadgeCheck className="w-3.5 h-3.5" /> Verifikasi
                                                        </button>
                                                    )}
                                                    {guru.status === "verified" && (
                                                        <button
                                                            onClick={() => handleGuruAction(guru.id, guru.name, guru.status)}
                                                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-semibold border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg transition-colors">
                                                            <ShieldOff className="w-3.5 h-3.5" /> Nonaktifkan
                                                        </button>
                                                    )}
                                                    {guru.status === "suspended" && (
                                                        <button
                                                            onClick={() => handleGuruAction(guru.id, guru.name, guru.status)}
                                                            className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg transition-colors">
                                                            <ShieldCheck className="w-3.5 h-3.5" /> Aktifkan Kembali
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination ── */}
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${p === page
                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                        : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}>
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default function GuruPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <GuruContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
