"use client"

import { useState, useMemo, useEffect } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, ChevronLeft, ChevronRight, Package, Users,
    Sparkles, ChevronsUpDown, Eye, Check, X, Filter, Star
} from "lucide-react"
import Image from "next/image"
import dummyData from "@/data/billing-dummy.json"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

// ── Helpers ───────────────────────────────────────────────────────────────────
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

const PAGE_SIZE = 10

// ── Types ─────────────────────────────────────────────────────────────────────
type Trainer = {
    id: number
    name: string
    avatar: string
    specialization: string
    rating: number
    totalStudents: number
    totalCourses: number
}

type Course = {
    id: string | number
    trainerId: number
    trainerName: string
    trainerAvatar: string
    name: string
    sessions: number
    basePrice: number
    totalPrice: number
    status: "active" | "inactive" | string
    description: string
    totalOrders: number
    totalRevenue: number
    features?: string[]
}

// ── Components ────────────────────────────────────────────────────────────────

function CourseCard({ course }: { course: Course }) {
    const isFree = course.basePrice === 0
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-colors shadow-sm hover:shadow-md relative overflow-hidden group">
            {/* Sesi badge */}
            <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-md">
                {course.sessions > 0 ? `${course.sessions} Sesi` : "-"}
            </div>

            <div>
                <h3 className="font-bold text-gray-900 dark:text-white pr-14 leading-tight">{course.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 min-h-[32px]">
                    {course.description || "Tidak ada deskripsi."}
                </p>

                {/* Features list placeholder */}
                <ul className="mt-4 space-y-2">
                    {course.features && course.features.length > 0 ? (
                        course.features.map((feat, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>{feat}</span>
                            </li>
                        ))
                    ) : (
                        <>
                            <li className="flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500 italic">
                                <span>-</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500 italic">
                                <span>-</span>
                            </li>
                        </>
                    )}
                </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-end justify-between">
                <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Harga Paket</p>
                    <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                        {isFree ? "Gratis" : formatRupiah(course.basePrice)}
                    </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md font-medium">
                    <Users className="w-3 h-3" />
                    {course.totalOrders} Pendaftar
                </div>
            </div>
        </div>
    )
}

function DetailModal({ trainer, courses, onClose }: { trainer: Trainer, courses: Course[], onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-950 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header Modal */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-950 sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Detail Guru & Paket</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-8">
                    {/* Info Guru Card */}
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-emerald-50 dark:ring-emerald-900/20">
                                <Image src={trainer.avatar} alt={trainer.name} fill className="object-cover" unoptimized />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{trainer.name}</h3>
                                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Aktif
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{trainer.specialization}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                        <span className="text-gray-900 dark:text-white font-bold">{trainer.rating > 0 ? trainer.rating.toFixed(1) : "Baru"}</span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                                    <div className="text-xs text-gray-500 font-medium">Online</div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex-1 md:w-32 text-center">
                                <Package className="w-5 h-5 text-emerald-500 mx-auto mb-1 opacity-80" />
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Total Kursus</p>
                                <p className="font-bold text-gray-900 dark:text-white text-lg">{trainer.totalCourses}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex-1 md:w-32 text-center">
                                <Users className="w-5 h-5 text-blue-500 mx-auto mb-1 opacity-80" />
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Total Murid</p>
                                <p className="font-bold text-gray-900 dark:text-white text-lg">{trainer.totalStudents}</p>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100 dark:border-gray-800" />

                    {/* Grid Paket */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Package className="w-4 h-4 text-emerald-500" />
                                Daftar Paket / Kursus
                            </h4>
                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                                {courses.length} paket
                            </span>
                        </div>
                        {courses.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                                <Package className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Belum ada paket yang dibuat</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {courses.map(c => (
                                    <CourseCard key={c.id} course={c} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function FilterModal({ 
    trainers, 
    selectedIds, 
    onApply, 
    onClose 
}: { 
    trainers: Trainer[], 
    selectedIds: Set<number>, 
    onApply: (ids: Set<number>) => void, 
    onClose: () => void 
}) {
    const [search, setSearch] = useState("")
    const [tempSelected, setTempSelected] = useState<Set<number>>(new Set(selectedIds))

    const filteredTrainers = useMemo(() => {
        const q = search.toLowerCase()
        return trainers
            .filter(t => !q || t.name.toLowerCase().includes(q) || t.specialization.toLowerCase().includes(q))
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [trainers, search])

    const allSelected = filteredTrainers.length > 0 && filteredTrainers.every(t => tempSelected.has(t.id))

    const toggleAll = () => {
        const newSet = new Set(tempSelected)
        if (allSelected) {
            filteredTrainers.forEach(t => newSet.delete(t.id))
        } else {
            filteredTrainers.forEach(t => newSet.add(t.id))
        }
        setTempSelected(newSet)
    }

    const toggleOne = (id: number) => {
        const newSet = new Set(tempSelected)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setTempSelected(newSet)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Filter per Guru</h3>
                        <p className="text-xs text-gray-500">Pilih satu atau lebih guru</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama guru atau spesialisasi..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[40vh] p-2">
                    {filteredTrainers.length > 0 && (
                        <div 
                            className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 mb-1"
                            onClick={toggleAll}
                        >
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Pilih semua</span>
                            <span className="text-xs text-gray-400">{tempSelected.size} dipilih</span>
                        </div>
                    )}
                    
                    {filteredTrainers.map(t => {
                        const isSelected = tempSelected.has(t.id)
                        return (
                            <div 
                                key={t.id} 
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? "bg-emerald-50 dark:bg-emerald-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
                                onClick={() => toggleOne(t.id)}
                            >
                                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                    <Image src={t.avatar} alt={t.name} fill className="object-cover" unoptimized />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-gray-200"}`}>{t.name}</p>
                                    <p className="text-[10px] text-gray-500 truncate">{t.specialization} · {t.totalCourses} kursus</p>
                                </div>
                                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-300 dark:border-gray-600"}`}>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                            </div>
                        )
                    })}
                    {filteredTrainers.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">Tidak ada guru ditemukan</div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex gap-3">
                    <button 
                        onClick={() => setTempSelected(new Set())}
                        className="flex-1 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Reset
                    </button>
                    <button 
                        onClick={() => { onApply(tempSelected); onClose() }}
                        className="flex-1 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
                    >
                        Terapkan ({tempSelected.size})
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main Content ──────────────────────────────────────────────────────────────
function PaketContent() {
    const [trainers, setTrainers] = useState<Trainer[]>([])
    const [allCourses, setAllCourses] = useState<Course[]>([])
    
    const [selectedTrainerIds, setSelectedTrainerIds] = useState<Set<number>>(new Set())
    const [showFilterModal, setShowFilterModal] = useState(false)
    const [detailTrainer, setDetailTrainer] = useState<Trainer | null>(null)
    
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
    const [sortField, setSortField] = useState<"name" | "sessions" | "totalPrice" | "totalOrders" | "totalRevenue">("totalRevenue")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
    const [page, setPage] = useState(1)
    const [courseStatuses, setCourseStatuses] = useState<Record<string, "active" | "inactive">>({})

    // Fetch API Data
    useEffect(() => {
        const token = getClientToken()
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
        const API_BASE = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

        // 1. Ambil data Trainer
        fetch(`${API_BASE}/api/v1/Trainers`, { headers })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                const apiTrainers = Array.isArray(data?.data || data) ? (data.data || data) : []
                const mergedTrainers: Map<number, Trainer> = new Map()

                // Masukkan API trainers
                apiTrainers.forEach((t: any) => {
                    if (!t.id) return
                    mergedTrainers.set(t.id, {
                        id: t.id,
                        name: t.userName || t.name || `Guru #${t.id}`,
                        avatar: t.userImage || t.avatar || `https://i.pravatar.cc/150?img=${(t.id % 70) + 1}`,
                        specialization: t.expertise?.join(", ") || t.headline || "Guru Ngaji",
                        rating: t.averageRating || t.rating || 0,
                        totalStudents: t.totalStudents || 0,
                        totalCourses: t.totalCourses || 0,
                    })
                })

                // Masukkan Dummy trainers sebagai pelengkap / fallback
                const seenDummyIds = new Set<number>()
                dummyData.trainerPackages.forEach(p => {
                    if (!seenDummyIds.has(p.trainerId)) {
                        seenDummyIds.add(p.trainerId)
                        if (!mergedTrainers.has(p.trainerId)) {
                            mergedTrainers.set(p.trainerId, {
                                id: p.trainerId,
                                name: p.trainerName,
                                avatar: p.trainerAvatar,
                                specialization: "Guru Ngaji",
                                rating: 4.8,
                                totalStudents: 15,
                                totalCourses: 2,
                            })
                        }
                    }
                })

                setTrainers(Array.from(mergedTrainers.values()))
            })
            .catch(err => console.error("Error fetching trainers:", err))

        // 2. Ambil data Courses
        fetch(`${API_BASE}/api/v1/Courses`, { headers: headers as HeadersInit })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                const apiCourses = Array.isArray(data?.data || data) ? (data.data || data) : []
                const coursesList: Course[] = []

                apiCourses.forEach((c: any) => {
                    if (!c.id) return
                    coursesList.push({
                        id: c.id,
                        trainerId: c.trainerId || 0,
                        trainerName: c.trainerName || `Guru #${c.trainerId}`,
                        trainerAvatar: `https://i.pravatar.cc/150?img=${((c.trainerId || 0) % 70) + 1}`,
                        name: c.title || c.name || `Paket ${c.id}`,
                        sessions: c.sessions || 0,
                        basePrice: c.price || 0,
                        totalPrice: c.price || 0,
                        status: c.status || "active",
                        description: c.description || "",
                        totalOrders: c.totalOrders || 0,
                        totalRevenue: c.totalRevenue || 0,
                        features: c.features || [],
                    })
                })

                // Gabung dummy courses (Hindari duplikasi)
                dummyData.trainerPackages.forEach(dp => {
                    coursesList.push({
                        id: dp.id,
                        trainerId: dp.trainerId,
                        trainerName: dp.trainerName,
                        trainerAvatar: dp.trainerAvatar,
                        name: dp.name,
                        sessions: dp.sessions,
                        basePrice: dp.basePrice,
                        totalPrice: dp.totalPrice,
                        status: dp.status,
                        description: dp.description,
                        totalOrders: dp.totalOrders,
                        totalRevenue: dp.totalRevenue,
                    })
                })

                setAllCourses(coursesList)
            })
            .catch(err => {
                console.error("Error fetching courses:", err)
                // Fallback dummy jika API gagal total
                setAllCourses(dummyData.trainerPackages as Course[])
            })
    }, [])

    // ── Logic Filter & Sort ──────────────────────────────────────────────────
    
    // Sinkronkan nama dan avatar trainer di course agar rapi jika API courses kekurangan data
    const enrichedCourses = useMemo(() => {
        return allCourses.map(c => {
            const t = trainers.find(tr => tr.id === c.trainerId)
            return {
                ...c,
                trainerName: t?.name || c.trainerName,
                trainerAvatar: t?.avatar || c.trainerAvatar,
                status: courseStatuses[c.id] ?? c.status,
            }
        })
    }, [allCourses, trainers, courseStatuses])

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return enrichedCourses
            .filter(p => {
                const matchTrainer = selectedTrainerIds.size === 0 || selectedTrainerIds.has(p.trainerId)
                const matchSearch = !q || p.name.toLowerCase().includes(q) || p.trainerName.toLowerCase().includes(q)
                const matchStatus = statusFilter === "all" || p.status === statusFilter
                return matchTrainer && matchSearch && matchStatus
            })
            .sort((a, b) => {
                let av: number | string = a[sortField] ?? 0
                let bv: number | string = b[sortField] ?? 0
                if (typeof av === "string" && typeof bv === "string") {
                    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
                }
                return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
            })
    }, [enrichedCourses, search, statusFilter, sortField, sortDir, selectedTrainerIds])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const stats = useMemo(() => ({
        totalPkgs: enrichedCourses.length,
        totalTrainers: trainers.length,
        totalOrders: enrichedCourses.reduce((s, p) => s + p.totalOrders, 0),
        totalRevenue: enrichedCourses.reduce((s, p) => s + p.totalRevenue, 0),
        activePkgs: enrichedCourses.filter(p => p.status === "active").length,
    }), [enrichedCourses, trainers])

    function handleSort(f: typeof sortField) {
        if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortField(f); setSortDir("asc") }
        setPage(1)
    }

    function SortIcon({ field }: { field: typeof sortField }) {
        if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 ml-0.5 opacity-40 inline-block" />
        return <span className="ml-0.5 text-emerald-500 inline-block">{sortDir === "asc" ? "↑" : "↓"}</span>
    }

    function handleTogglePackage(pkg: Course) {
        const currentStatus = pkg.status
        const nextStatus: "active" | "inactive" = currentStatus === "active" ? "inactive" : "active"
        setCourseStatuses(prev => ({ ...prev, [String(pkg.id)]: nextStatus }))
        showToast({ 
            type: nextStatus === "active" ? "success" : "info", 
            title: `Paket "${pkg.name}" di${nextStatus === "active" ? "aktifkan" : "nonaktifkan"}`, 
            message: `Guru: ${pkg.trainerName}`
        })
    }

    function openTrainerDetail(trainerId: number) {
        const t = trainers.find(x => x.id === trainerId)
        if (t) setDetailTrainer(t)
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
            <ToastContainer />
            
            {showFilterModal && (
                <FilterModal 
                    trainers={trainers} 
                    selectedIds={selectedTrainerIds} 
                    onApply={(ids) => { setSelectedTrainerIds(ids); setPage(1) }} 
                    onClose={() => setShowFilterModal(false)} 
                />
            )}

            {detailTrainer && (
                <DetailModal 
                    trainer={detailTrainer} 
                    courses={enrichedCourses.filter(c => c.trainerId === detailTrainer.id)} 
                    onClose={() => setDetailTrainer(null)} 
                />
            )}

            <div className="max-w-[1600px] mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paket Guru</h1>
                    </div>
                </div>

                {/* ── Summary Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><Package className="w-4 h-4" /></div>
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Paket</span>
                        </div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalPkgs}</div>
                        <p className="text-[10px] text-gray-400 mt-1">{stats.activePkgs} aktif</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><Users className="w-4 h-4" /></div>
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Guru</span>
                        </div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalTrainers}</div>
                        <p className="text-[10px] text-gray-400 mt-1">punya paket</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Users className="w-4 h-4" /></div>
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Pesanan</span>
                        </div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalOrders}</div>
                        <p className="text-[10px] text-gray-400 mt-1">dari semua paket</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg"><Sparkles className="w-4 h-4" /></div>
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Revenue</span>
                        </div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{formatRupiah(stats.totalRevenue)}</div>
                        <p className="text-[10px] text-gray-400 mt-1">dari paket</p>
                    </div>
                </div>

                {/* ── Filter Bar ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Tabs Status Paket */}
                        <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            {(["all", "active", "inactive"] as const).map(s => (
                                <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${statusFilter === s ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                                    {s === "all" ? "Semua" : s === "active" ? "Aktif" : "Nonaktif"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1) }}
                                placeholder="Cari nama paket, guru..."
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                            />
                        </div>
                        <button 
                            onClick={() => setShowFilterModal(true)}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${selectedTrainerIds.size > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400" : "bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filter Guru</span>
                            {selectedTrainerIds.size > 0 && (
                                <span className="bg-emerald-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                                    {selectedTrainerIds.size}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-5 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("name")}>
                                        Nama Paket <SortIcon field="name" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-5 py-3 whitespace-nowrap">
                                        Guru Pemilik
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-5 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("sessions")}>
                                        Sesi <SortIcon field="sessions" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-5 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("totalPrice")}>
                                        Harga <SortIcon field="totalPrice" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-5 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("totalOrders")}>
                                        Total Pesanan <SortIcon field="totalOrders" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-5 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("totalRevenue")}>
                                        Revenue <SortIcon field="totalRevenue" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-5 py-3 whitespace-nowrap">Status</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-5 py-3 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada paket yang sesuai</p>
                                        </td>
                                    </tr>
                                ) : paged.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                        {/* Nama Paket */}
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-gray-900 dark:text-white text-xs leading-tight mb-0.5">{p.name}</p>
                                            <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{p.description || "-"}</p>
                                        </td>
                                        {/* Guru Pemilik */}
                                        <td className="px-5 py-4">
                                            <div 
                                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 -ml-1.5 rounded-lg transition-colors inline-flex"
                                                onClick={() => openTrainerDetail(p.trainerId)}
                                                title="Lihat profil guru"
                                            >
                                                <Image src={p.trainerAvatar} alt={p.trainerName} width={28} height={28} className="rounded-full object-cover ring-2 ring-transparent group-hover:ring-emerald-200 dark:group-hover:ring-emerald-800 transition-all" unoptimized />
                                                <p className="font-semibold text-gray-900 dark:text-gray-200 text-xs">{p.trainerName}</p>
                                            </div>
                                        </td>
                                        {/* Sesi */}
                                        <td className="px-5 py-4 text-xs font-bold text-gray-900 dark:text-white">
                                            {p.sessions > 0 ? `${p.sessions}x sesi` : "-"}
                                        </td>
                                        {/* Harga */}
                                        <td className="px-5 py-4">
                                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">{p.basePrice === 0 ? "Gratis" : formatRupiah(p.basePrice)}</p>
                                            <p className="text-[9px] text-gray-400 font-medium">Fee: {formatRupiah(p.totalPrice - p.basePrice)}</p>
                                        </td>
                                        {/* Pesanan */}
                                        <td className="px-5 py-4 text-xs font-bold text-gray-900 dark:text-white">
                                            {p.totalOrders} <span className="font-medium text-gray-500">pesanan</span>
                                        </td>
                                        {/* Revenue */}
                                        <td className="px-5 py-4 text-xs font-bold text-gray-900 dark:text-white">
                                            {formatRupiah(p.totalRevenue)}
                                        </td>
                                        {/* Status */}
                                        <td className="px-5 py-4">
                                            {p.status === "active" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                    <span className="w-1 h-1 rounded-full bg-emerald-500" /> Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                    <span className="w-1 h-1 rounded-full bg-gray-400" /> Nonaktif
                                                </span>
                                            )}
                                        </td>
                                        {/* Aksi */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => openTrainerDetail(p.trainerId)}
                                                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> Detail
                                                </button>
                                                <div className="w-px h-3 bg-gray-200 dark:bg-gray-700"></div>
                                                <button 
                                                    onClick={() => handleTogglePackage(p)}
                                                    className={`text-[11px] font-semibold transition-colors ${p.status === "active" ? "text-red-500 hover:text-red-600" : "text-emerald-500 hover:text-emerald-600"}`}
                                                >
                                                    {p.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <span className="text-xs text-gray-500">
                            Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white disabled:opacity-40 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${p === page
                                        ? "bg-emerald-500 text-white border-emerald-500"
                                        : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50"
                                        }`}>
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white disabled:opacity-40 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default function PaketPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <PaketContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
