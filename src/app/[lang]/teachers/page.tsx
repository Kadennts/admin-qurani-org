"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import Link from "next/link"
import Image from "next/image"
import {
    Search, ChevronLeft, ChevronRight, Star, Eye, Users,
    ChevronsUpDown, Sparkles, BadgeCheck, ShieldOff, ShieldCheck, XCircle, AlertTriangle,
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    try {
        const stored = localStorage.getItem("myqurani_auth")
        if (stored) {
            const auth = JSON.parse(stored)
            return auth.accessToken || null
        }
    } catch {
        return null
    }
    return null
}

const STATUS_CFG = {
    verified: { label: "Aktif", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", icon: BadgeCheck },
    suspended: { label: "Tidak Aktif", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500", icon: ShieldOff },
    rejected: { label: "Ditolak", bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500", icon: ShieldOff },
} as const

type GuruStatus = "all" | "verified" | "suspended" | "rejected"
type SortField = "name" | "rating" | "totalStudents" | "totalRevenue"

const PAGE_SIZE = 10

function GuruContent() {
    const [apiGurus, setApiGurus] = useState<any[]>([])
    const [guruStatuses, setGuruStatuses] = useState<Record<number, "verified" | "suspended" | "rejected">>({})

    // ── Deactivation Modal State ──────────────────────────────────────────
    const [deactivateModal, setDeactivateModal] = useState<{ open: boolean; guruId: number | null; guruName: string }>({ open: false, guruId: null, guruName: "" })
    const [deactivateReason, setDeactivateReason] = useState("")
    const [deactivateDuration, setDeactivateDuration] = useState("")
    const [isSuspending, setIsSuspending] = useState(false)
    const [reactivateModal, setReactivateModal] = useState<{ open: boolean; guruId: number | null; guruName: string; guruUsername: string }>({ open: false, guruId: null, guruName: "", guruUsername: "" })

    useEffect(() => {
        const token = getClientToken()
        const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

        const mapData = (d: any) => {
            const rawStatus = String(d.status || "verified").toLowerCase()
            const validStatus = (rawStatus === "active" || rawStatus === "verified") ? "verified" : rawStatus === "suspended" ? "suspended" : rawStatus === "rejected" ? "rejected" : "verified"
            const name = d.userName || d.name || `Guru #${d.id}`
            return {
                id: d.id,
                name: name,
                email: d.email || "",
                username: d.username || d.userUsername || name.toLowerCase().replace(/\s+/g, ""),
                specialization: d.expertise?.join?.(", ") || d.headline || "Pengajar Al-Qur'an",
                avatar: d.userImage || d.avatar || "",
                rating: d.averageRating || d.rating || 0,
                status: validStatus,
                teachingMethod: (Array.isArray(d.expertise) && d.expertise.length > 0) ? d.expertise.join(", ") : (typeof d.expertise === "string" ? d.expertise : "Umum"),
                stats: {
                    totalStudents: d.totalStudents || 0,
                    totalSessions: d.totalCourses || 0,
                    totalRevenue: d.totalRevenue || 0,
                    activeBookings: 0
                }
            }
        }

        fetch(`${API_BASE_URL}/api/v1/Trainers`, { headers })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                const trainers = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
                const realTrainers = trainers.filter((d: any) => {
                    const uname = d.username || d.userName || ""
                    if (!uname || uname.trim() === "") return false
                    return true
                })
                let mappedGurus = realTrainers.map((d: any) => mapData(d))
                setApiGurus(mappedGurus)
                
                // Inject dummy accepted gurus
                try {
                    const pengajuanStatuses = JSON.parse(sessionStorage.getItem("pengajuanGuruStatuses") || "{}")
                    const acceptedIds = Object.keys(pengajuanStatuses).filter(id => pengajuanStatuses[id] === "diterima").map(Number)
                    if (acceptedIds.length > 0) {
                        import("@/data/pending-trainers-list.json").then(dummies => {
                            const newGurus = dummies.default.filter(d => acceptedIds.includes(d.id)).map((d: any) => ({
                                id: d.id,
                                name: d.userName || d.name || `Guru #${d.id}`,
                                email: d.email || "",
                                username: d.username || d.userUsername || (d.userName || d.name || "guru").toLowerCase().replace(/\s+/g, ""),
                                specialization: d.headline || (Array.isArray(d.expertise) ? d.expertise.join(", ") : "Pengajar Al-Qur'an"),
                                avatar: d.userImage || d.avatar || "",
                                rating: 0,
                                status: "verified",
                                teachingMethod: d.isOnline && d.isOffline ? "Online / Offline" : d.isOnline ? "Online" : "Offline",
                                stats: { totalStudents: 0, totalSessions: 0, totalRevenue: 0, activeBookings: 0 }
                            }))
                            
                            setApiGurus(prev => {
                                const currentIds = new Set(prev.map(g => g.id))
                                const toAdd = newGurus.filter(g => !currentIds.has(g.id))
                                return [...prev, ...toAdd]
                            })
                        })
                    }
                } catch(e) {}
            }).catch(console.error)
    }, [])
    
    const [suspendReasons, setSuspendReasons] = useState<Record<number, string>>({})
    useEffect(() => {
        try {
            const reasons = sessionStorage.getItem("guruSuspendReasons")
            if (reasons) setSuspendReasons(JSON.parse(reasons))
        } catch {}
    }, [])

    const effectiveApiGurus = useMemo(() => {
        return apiGurus.map(g => ({ ...g, status: guruStatuses[g.id] ?? g.status }))
    }, [apiGurus, guruStatuses])

    useEffect(() => {
        try {
            const stored = sessionStorage.getItem("guruStatuses")
            if (stored) setGuruStatuses(JSON.parse(stored))
        } catch {}
    }, [])

    // Open deactivation modal (instead of directly calling API)
    function openDeactivateModal(guruId: number, guruName: string) {
        setDeactivateReason("")
        setDeactivateModal({ open: true, guruId, guruName })
    }

    // Confirm deactivation with reason
    async function confirmDeactivate() {
        if (!deactivateModal.guruId) return
        const { guruId, guruName } = deactivateModal
        setIsSuspending(true)

        const token = getClientToken()
        const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
        const headers: HeadersInit = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/Trainers/${guruId}/suspend`, {
                method: "PUT",
                headers,
                body: JSON.stringify({ reason: deactivateReason }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
        } catch (e) {
            // fallback mock — still apply locally
        } finally {
            setGuruStatuses(prev => {
                const updated: Record<number, "verified" | "suspended" | "rejected"> = { ...prev, [guruId]: "suspended" }
                try { sessionStorage.setItem("guruStatuses", JSON.stringify(updated)) } catch {}
                return updated
            })
            setSuspendReasons(prev => {
                const payload = JSON.stringify({ reason: deactivateReason, duration: deactivateDuration || "Tidak ditentukan", date: new Date().toISOString() })
                const updated = { ...prev, [guruId]: payload }
                try { sessionStorage.setItem("guruSuspendReasons", JSON.stringify(updated)) } catch {}
                return updated
            })
            showToast({
                type: "info",
                title: `${guruName} dinonaktifkan`,
                message: deactivateReason ? `Alasan: ${deactivateReason}` : "Guru tidak dapat menerima pesanan baru.",
                endpoint: `PUT /api/v1/Trainers/${guruId}/suspend`,
            })
            setIsSuspending(false)
            setDeactivateModal({ open: false, guruId: null, guruName: "" })
            setDeactivateReason("")
            setDeactivateDuration("")
        }
    }

    // Re-activate guru directly (no modal needed)
    async function handleReactivate(guruId: number, guruName: string) {
        const token = getClientToken()
        const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
        const headers: HeadersInit = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/Trainers/${guruId}/unsuspend`, { method: "PUT", headers })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
        } catch (e) {
            // fallback mock
        } finally {
            setGuruStatuses(prev => {
                const updated: Record<number, "verified" | "suspended" | "rejected"> = { ...prev, [guruId]: "verified" }
                try { sessionStorage.setItem("guruStatuses", JSON.stringify(updated)) } catch {}
                return updated
            })
            showToast({ type: "success", title: `${guruName} diaktifkan kembali`, message: "Status guru dikembalikan menjadi Aktif.", endpoint: `PUT /api/v1/Trainers/${guruId}/unsuspend` })
        }
    }

    const [search, setSearch] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [statusFilter, setStatus] = useState<GuruStatus>("verified")
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
        return effectiveApiGurus
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
    }, [effectiveApiGurus, search, statusFilter, sortField, sortDir])

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

    const countVerified = effectiveApiGurus.filter(g => g.status === "verified").length
    const countSuspended = effectiveApiGurus.filter(g => g.status === "suspended").length

    const STATUS_TABS: { key: GuruStatus; label: string; count: number; color: string }[] = [
        { key: "verified", label: "Aktif", count: countVerified, color: "emerald" },
        { key: "suspended", label: "Tidak Aktif", count: countSuspended, color: "red" },
        { key: "all", label: "Semua", count: effectiveApiGurus.length, color: "emerald" },
    ]

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <ToastContainer />
            <div className="max-w-[1600px] mx-auto space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Guru</h1>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
                        {STATUS_TABS.map(t => {
                            const active = statusFilter === t.key
                            const colorMap: Record<string, string> = {
                                emerald: active ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400",
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

                {/* ── Desktop Table ── */}
                <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Guru</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("rating")}>Rating <SortIcon field="rating" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Metode Mengaji</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("totalStudents")}>Murid <SortIcon field="totalStudents" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("totalRevenue")}>Total Revenue <SortIcon field="totalRevenue" /></th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Pesanan Aktif</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Aksi</th>
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
                                        <tr key={guru.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Link href={`/teachers/${guru.id}`} className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/30 hover:ring-emerald-400 dark:hover:ring-emerald-500 transition-all hover:scale-110" title={`Lihat profil ${guru.name}`}>
                                                        {guru.avatar ? (
                                                            <Image src={guru.avatar} alt={guru.name} fill className="object-cover" unoptimized />
                                                        ) : (
                                                            <div className="w-full h-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 flex items-center justify-center font-bold">{guru.name.charAt(0).toUpperCase()}</div>
                                                        )}
                                                    </Link>
                                                    <div>
                                                        <Link href={`/teachers/${guru.id}`} className="font-bold text-gray-900 dark:text-white text-xs leading-tight hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors">{guru.name}</Link>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[160px]">@{guru.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {guru.rating > 0 ? (
                                                    <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="text-xs font-bold text-gray-900 dark:text-white">{guru.rating.toFixed(1)}</span></div>
                                                ) : <span className="text-xs text-gray-400 dark:text-gray-600">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs italic font-semibold text-gray-700 dark:text-gray-300">{guru.teachingMethod}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{guru.status === "verified" ? <>{guru.stats.totalStudents} murid</> : <span className="text-gray-400 dark:text-gray-600">—</span>}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{guru.status === "verified" ? formatRupiah(guru.stats.totalRevenue) : <span className="text-gray-400 dark:text-gray-600">—</span>}</td>
                                            <td className="px-4 py-3">{guru.status === "verified" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{guru.stats.activeBookings} aktif</span>
                                            ) : <span className="text-xs text-gray-400 dark:text-gray-600">—</span>}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st?.bg ?? ""} ${st?.text ?? ""}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st?.dot ?? ""}`} />{st?.label ?? guru.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/teachers/${guru.id}`} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg transition-colors"><Eye className="w-3.5 h-3.5" /> Detail</Link>
                                                    {guru.status === "verified" && (
                                                        <button onClick={() => openDeactivateModal(guru.id, guru.name)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-semibold border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg transition-colors"><ShieldOff className="w-3.5 h-3.5" /> Nonaktifkan</button>
                                                    )}
                                                    {guru.status === "suspended" && (
                                                        <button onClick={() => setReactivateModal({ open: true, guruId: guru.id, guruName: guru.name, guruUsername: guru.username })} className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg transition-colors"><ShieldCheck className="w-3.5 h-3.5" /> Aktifkan Kembali</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Mobile Card Layout ── */}
                <div className="block md:hidden space-y-3">
                    {paged.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm text-gray-400">Tidak ada data yang ditemukan</p>
                        </div>
                    ) : paged.map(guru => {
                        const st = STATUS_CFG[guru.status as keyof typeof STATUS_CFG]
                        return (
                            <div key={guru.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm">
                                {/* Header: Avatar + Nama + Status + Rating */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Link href={`/teachers/${guru.id}`} className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/30">
                                            {guru.avatar ? (
                                                <Image src={guru.avatar} alt={guru.name} fill className="object-cover" unoptimized />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">{guru.name.charAt(0).toUpperCase()}</div>
                                            )}
                                        </Link>
                                        <div className="min-w-0">
                                            <Link href={`/teachers/${guru.id}`} className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate block hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{guru.name}</Link>
                                            <p className="text-[11px] text-gray-400 truncate">@{guru.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st?.bg ?? ""} ${st?.text ?? ""}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${st?.dot ?? ""}`} />{st?.label ?? guru.status}
                                        </span>
                                        {guru.rating > 0 && (
                                            <span className="flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300">
                                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{guru.rating.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                                        <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Metode Mengaji</p>
                                        <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{guru.teachingMethod}</p>
                                    </div>
                                    {guru.status === "verified" ? (
                                        <>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                                                <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Murid</p>
                                                <p className="font-bold text-emerald-600 dark:text-emerald-400">{guru.stats.totalStudents}</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                                                <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Total Revenue</p>
                                                <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(guru.stats.totalRevenue)}</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                                                <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Pesanan Aktif</p>
                                                <p className="font-bold text-blue-600 dark:text-blue-400">{guru.stats.activeBookings}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="col-span-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                                            <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Info</p>
                                            <p className="text-gray-500 dark:text-gray-400 italic">Data tidak tersedia untuk guru non-aktif</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                    <Link href={`/teachers/${guru.id}`} className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                        <Eye className="w-3.5 h-3.5" /> Detail
                                    </Link>
                                    {guru.status === "verified" && (
                                        <button onClick={() => openDeactivateModal(guru.id, guru.name)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-semibold border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                            <ShieldOff className="w-3.5 h-3.5" /> Nonaktifkan
                                        </button>
                                    )}
                                    {guru.status === "suspended" && (
                                        <button onClick={() => setReactivateModal({ open: true, guruId: guru.id, guruName: guru.name, guruUsername: guru.username })} className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Aktifkan Kembali
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Pagination (shared) ── */}
                <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)} className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${p === page ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>{p}</button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Modal: Reactivate & Reason ─────────────────────── */}
            {reactivateModal.open && (() => {
                const rawReason = reactivateModal.guruId ? suspendReasons[reactivateModal.guruId] : null
                let reasonText = "Alasan tidak dicantumkan."
                let dateText = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                let durationText = "Tidak ditentukan"

                if (rawReason) {
                    try {
                        const parsed = JSON.parse(rawReason)
                        reasonText = parsed.reason || reasonText
                        durationText = parsed.duration || durationText
                        if (parsed.date) {
                            dateText = new Date(parsed.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        }
                    } catch {
                        reasonText = rawReason
                    }
                }

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-emerald-100 dark:border-emerald-900/50 overflow-hidden">
                            {/* Header (Emerald) */}
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 flex items-start gap-4 border-b border-emerald-100 dark:border-emerald-800">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                    <ShieldOff className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Guru dinonaktifkan</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{reactivateModal.guruName} • @{reactivateModal.guruUsername}</p>
                                </div>
                            </div>

                            {/* Body (Light grey) */}
                            <div className="p-5 space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                                        <AlertTriangle className="w-4 h-4 text-emerald-500" /> Alasan
                                    </h3>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {reasonText}
                                    </p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-100 dark:border-gray-800">
                                    <div>
                                        <p className="text-[11px] font-semibold text-gray-400 mb-1">Dinonaktifkan sejak</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{dateText}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-gray-400 mb-1">Durasi</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{durationText}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-5 flex items-center gap-3 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={() => setReactivateModal({ open: false, guruId: null, guruName: "", guruUsername: "" })}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Tutup
                                </button>
                                <button
                                    onClick={() => {
                                        if (reactivateModal.guruId) {
                                            handleReactivate(reactivateModal.guruId, reactivateModal.guruName);
                                            setReactivateModal({ open: false, guruId: null, guruName: "", guruUsername: "" });
                                        }
                                    }}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-sm font-bold text-white transition-colors"
                                >
                                    Aktifkan kembali
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* ─── Modal: Konfirmasi Nonaktifkan ─────────────────────── */}
            {deactivateModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-red-50 dark:bg-red-900/20 rounded-t-2xl">
                            <div className="flex items-center gap-2">
                                <ShieldOff className="w-5 h-5 text-red-500" />
                                <h2 className="text-base font-bold text-gray-900 dark:text-white">Nonaktifkan Guru</h2>
                            </div>
                            <button onClick={() => setDeactivateModal({ open: false, guruId: null, guruName: "" })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            {/* Warning */}
                            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    Guru <span className="font-bold">{deactivateModal.guruName}</span> akan dinonaktifkan dan tidak dapat menerima pesanan baru.
                                </p>
                            </div>

                            {/* Reason textarea */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">
                                    Alasan Penonaktifan <span className="text-gray-400 font-normal"></span>
                                </label>
                                <textarea
                                    value={deactivateReason}
                                    onChange={e => setDeactivateReason(e.target.value)}
                                    placeholder="Contoh: Melanggar ketentuan platform, laporan dari murid, dll..."
                                    rows={3}
                                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 resize-none"
                                />
                            </div>

                            {/* Duration input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">
                                    Durasi Penonaktifan <span className="text-gray-400 font-normal"></span>
                                </label>
                                <input
                                    value={deactivateDuration}
                                    onChange={e => setDeactivateDuration(e.target.value)}
                                    placeholder="Contoh: 10 Hari, Permanen, dll..."
                                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-2 px-5 pb-5">
                            <button
                                onClick={() => setDeactivateModal({ open: false, guruId: null, guruName: "" })}
                                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDeactivate}
                                disabled={isSuspending}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-60"
                            >
                                <ShieldOff className="w-4 h-4" />
                                {isSuspending ? "Memproses..." : "Ya, Nonaktifkan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function GuruPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <Suspense fallback={<div className="p-4 text-gray-500">Memuat data...</div>}>
                    <GuruContent />
                </Suspense>
            </I18nProvider>
        </DashboardLayout>
    )
}
