"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, Filter, MoreHorizontal, Calendar,
    ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle,
    Building2, Users, ChevronDown, Check,
    X, FileText, Mail, Phone, MapPin, Globe,
    Building, AlertCircle, CheckCircle, Eye, RotateCcw,
    ArrowDown, ArrowUp, ArrowUpDown
} from "lucide-react"
import { useKycOrganisasi, ApiOrg, FilterState, EMPTY_FILTER } from "@/hooks/use-kyc-organisasi"

// ─── Tipe badge config ────────────────────────────────────────────────────────
const TIPE_CONFIG: Record<string, { cls: string; icon: React.ReactNode }> = {
    YAYASAN: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    PESANTREN: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    LEMBAGA: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    KOMUNITAS: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    MADRASAH: { cls: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Building2 className="w-3 h-3 mr-1 inline" /> },
    PENDIDIKAN: { cls: "bg-blue-100 text-blue-700 border border-blue-200", icon: <Users className="w-3 h-3 mr-1 inline" /> },
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
    menunggu: { label: "Pending", cls: "bg-amber-50 text-amber-600 border border-amber-200", icon: Clock },
    disetujui: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: CheckCircle2 },
    ditolak: { label: "Ditolak", cls: "bg-red-50 text-red-600 border border-red-200", icon: XCircle },
}

const STATUS_BADGE: Record<string, string> = {
    menunggu: "bg-amber-100 text-amber-700 border border-amber-200",
    disetujui: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    ditolak: "bg-red-100 text-red-600 border border-red-200",
}

// ─── Toast Component ───────────────────────────────────────────────────────
type ToastData = { id: number; message: string; type: "success" | "error" }

function Toast({ toasts, onRemove }: { toasts: ToastData[]; onRemove: (id: number) => void }) {
    return (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto
                        animate-in slide-in-from-right-5 duration-300
                        ${t.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                            : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"
                        }`}
                >
                    {t.type === "success"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    }
                    <span>{t.message}</span>
                    <button
                        onClick={() => onRemove(t.id)}
                        className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    )
}

// ─── Per-Page Custom Dropdown ─────────────────────────────────────────────────
const PER_PAGE_OPTIONS = [10, 25, 50, 100]

function PerPageSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="relative inline-block ml-2">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                {value} <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {open && (
                <div
                    className="absolute bottom-full left-0 mb-1 w-28 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden py-1"
                    onMouseLeave={() => setOpen(false)}
                >
                    {PER_PAGE_OPTIONS.map(n => (
                        <button
                            key={n}
                            onClick={() => { onChange(n); setOpen(false) }}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${value === n
                                ? "bg-orange-50 dark:bg-emerald-900/20 text-gray-900 dark:text-white font-medium"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                }`}
                        >
                            {n}
                            {value === n && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Dropdown Aksi ────────────────────────────────────────────────────────────
function AksiDropdown({ id, onView }: { id: number; onView: () => void }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="relative" onClick={e => e.stopPropagation()}>
            <button
                onClick={() => setOpen(o => !o)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>
            {open && (
                <div
                    className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
                    onMouseLeave={() => setOpen(false)}
                >
                    <button
                        onClick={() => setOpen(false)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Setujui
                    </button>
                    <button
                        onClick={() => setOpen(false)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Tolak
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── Dokumen Card (persis MagangHub) ─────────────────────────────────────────────────
function DocCard({
    nama, file, warning, hasValidasi, noPreview, iconType,
}: {
    nama: string
    file?: string
    warning?: string
    hasValidasi?: boolean
    noPreview?: boolean
    iconType?: "doc" | "building"
}) {
    const IconComp = iconType === "building" ? Building2 : FileText
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 overflow-hidden">
            {/* Card header */}
            <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
                <div className="flex items-start gap-2.5">
                    <IconComp className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">{nama}</p>
                        {warning && (
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mt-0.5">{warning}</p>
                        )}
                    </div>
                </div>
                {/* Plain ✓ and × — no button border, just icons */}
                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <button className="text-gray-300 hover:text-emerald-500 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button className="text-gray-300 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Card body — plain white area, file name at bottom (lebih tinggi seperti MagangHub) */}
            <div className="mx-4 mb-3 h-28 rounded-lg bg-white dark:bg-gray-800/30 flex items-end justify-center pb-2">
                {noPreview ? (
                    <div className="flex flex-col items-center gap-1 mb-6">
                        <Eye className="w-5 h-5 text-gray-300" />
                        <span className="text-xs text-gray-400">No Preview</span>
                    </div>
                ) : file ? (
                    <span className="text-xs text-blue-400 dark:text-blue-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {file}
                    </span>
                ) : null}
            </div>

            {/* Validasi Real-time button */}
            {hasValidasi && (
                <div className="px-4 pb-4">
                    <button className="w-full py-2 bg-gray-900 dark:bg-gray-950 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors">
                        Validasi Real-time
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── KYC Detail Modal ─────────────────────────────────────────────────────────
function KycDetailModal({
    org,
    onClose,
    onVerify,
    onReject,
}: {
    org: ApiOrg
    onClose: () => void
    onVerify: (id: number) => Promise<void>
    onReject: (id: number, reason: string) => Promise<void>
}) {
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [selectedReasons, setSelectedReasons] = useState<string[]>([])
    const [additionalNote, setAdditionalNote] = useState("")

    const tglLabel = new Date(org.createdAt || Date.now()).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    })

    const orgStatus = org.isVerified === 1 ? "disetujui" : org.isVerified === 2 ? "ditolak" : "menunggu"
    const status = STATUS_CONFIG[orgStatus]
    const StatusIcon = status.icon

    const handleSetujui = async () => {
        await onVerify(org.id)
        onClose()
    }

    const handleTolak = async () => {
        if (!additionalNote.trim() && selectedReasons.length === 0) return
        const reason = [...selectedReasons, additionalNote.trim()].filter(Boolean).join(". ")
        await onReject(org.id, reason)
        setShowRejectModal(false)
        onClose()
    }

    const REJECTION_REASONS = [
        "Data Penanggung Jawab Tidak Lengkap",
        "Surat Kuasa Tidak Ditandatangani",
        "Kualitas Dokumen Buruk (Blur)",
        "Indikasi Data Palsu",
        "NIB Tidak Valid / Kadaluwarsa",
        "NPWP Tidak Sesuai",
        "SK Kemenkumham Tidak Ditemukan",
        "Alamat Tidak Sesuai Akta",
        "NPSN Tidak Terdaftar di Dapodik",
        "Akreditasi Tidak Valid",
        "Izin Operasional Kadaluwarsa",
        "Bukan Institusi Pendidikan Resmi",
    ]

    const toggleReason = (reason: string) => {
        setSelectedReasons(prev =>
            prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxWidth: "calc(100vw - 80px)", maxHeight: "96vh" }}>

                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Building className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Verifikasi Organisasi</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_BADGE[orgStatus]}`}>
                            {status.label.toUpperCase()}
                        </span>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-950/50">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* LEFT COLUMN - INFO UTAMA & HUKUM */}
                        <div className="lg:col-span-4 space-y-6">

                            {/* Card Profil Utama */}
                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 shadow-inner mb-4">
                                        {org.logoUrl ? (
                                            <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover rounded-3xl" />
                                        ) : (
                                            <span className="text-4xl font-black text-emerald-600">{String(org.name || "O").charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-3">{org.name}</h2>
                                    <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
                                            {org.type || "Organisasi"}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 px-3 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                                            <Building className="w-3.5 h-3.5" /> {org.categoryName || org.category || "Umum"}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-5 border-t border-gray-100 dark:border-gray-800">
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Penanggung Jawab</span>
                                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                {org.ownerName || (org as any).user || org.ownerUsername || "Tanpa Pemilik"}
                                            </p>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">@{org.ownerUsername || (org as any).userUsername || "anon"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Data Hukum */}
                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-emerald-500" /> Legalitas & Hukum
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <span className="block text-xs font-medium text-gray-500 mb-1">Nama Resmi (Legal)</span>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{org.legalName || org.name || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-medium text-gray-500 mb-1">Tipe Legalitas</span>
                                        <span className="inline-block px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-md">{org.legalType || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-medium text-gray-500 mb-1">No. Izin / NIB / Registrasi</span>
                                        <span className="text-sm font-mono font-bold text-gray-900 dark:text-white break-all">{org.registrationNumber || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-medium text-gray-500 mb-1">NPWP</span>
                                        <span className="text-sm font-mono font-bold text-gray-900 dark:text-white break-all">{org.taxId || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-medium text-gray-500 mb-1">Tanggal Berdiri</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {org.foundedDate ? new Date(org.foundedDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN - DETAIL & DOKUMEN */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* Deskripsi & Info Sistem */}
                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Deskripsi Organisasi</h4>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 mb-6 border border-gray-100 dark:border-gray-800">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {org.description || <span className="italic text-gray-400">Belum ada deskripsi yang ditambahkan.</span>}
                                    </p>
                                </div>

                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Pengaturan Sistem</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Slug URL</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate block">{org.slug || "-"}</span>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Bahasa</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate block">{(org as any).language || "-"}</span>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Mata Uang</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate block">{(org as any).currency || "-"}</span>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Timezone</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate block">{(org as any).timezone || "-"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Kontak & Alamat */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-emerald-500" /> Informasi Kontak
                                    </h4>
                                    <div className="space-y-5">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-blue-800/50">
                                                <Mail className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <div className="pt-0.5">
                                                <span className="block text-xs font-medium text-gray-500 mb-0.5">Email</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-white break-all">{org.email || org.ownerEmail || "-"}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 border border-emerald-100 dark:border-emerald-800/50">
                                                <Phone className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div className="pt-0.5">
                                                <span className="block text-xs font-medium text-gray-500 mb-0.5">Telepon</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-white break-all">{org.phone || "-"}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 border border-purple-100 dark:border-purple-800/50">
                                                <Globe className="w-4 h-4 text-purple-500" />
                                            </div>
                                            <div className="pt-0.5">
                                                <span className="block text-xs font-medium text-gray-500 mb-0.5">Website</span>
                                                {org.website ? (
                                                    <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-500 hover:text-blue-600 hover:underline break-all transition-colors">
                                                        {org.website}
                                                    </a>
                                                ) : <span className="text-sm font-bold text-gray-900 dark:text-white">-</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-emerald-500" /> Alamat Lengkap
                                    </h4>
                                    <div className="flex items-start gap-4 mb-5">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 border border-orange-100 dark:border-orange-800/50">
                                            <MapPin className="w-4 h-4 text-orange-500" />
                                        </div>
                                        <div className="pt-0.5">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
                                                {org.address || <span className="text-gray-400 italic">Alamat belum diisi</span>}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div>
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Kota</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{(org as any).city || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Provinsi</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{(org as any).state || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Negara</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{(org as any).country || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Kode Pos</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{org.postalCode || "-"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dokumen Verifikasi */}
                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-emerald-500" /> Dokumen Pendukung
                                    </h4>
                                    <span className="text-xs font-bold px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">
                                        {org.verificationDocs ? "1 Dokumen" : "0 Dokumen"}
                                    </span>
                                </div>

                                {org.verificationDocs ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <DocCard
                                            nama="Dokumen Registrasi"
                                            file={org.verificationDocs || undefined}
                                            hasValidasi={true}
                                            iconType="building"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
                                        <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-4 shadow-sm">
                                            <FileText className="w-7 h-7 text-gray-400" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white text-center mb-1.5">Belum Ada Dokumen</p>
                                        <p className="text-xs text-gray-500 text-center max-w-sm">
                                            Organisasi ini belum mengunggah dokumen verifikasi legalitas.
                                        </p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900 gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition-colors"
                    >
                        Tutup
                    </button>
                    {orgStatus === "menunggu" && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="px-6 py-2.5 bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 text-sm font-bold rounded-xl transition-all shadow-sm"
                            >
                                Tolak
                            </button>
                            <button
                                onClick={handleSetujui}
                                className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20"
                            >
                                Setujui KYC
                            </button>
                        </div>
                    )}
                </div>

                {showRejectModal && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowRejectModal(false)} />
                        <div className="relative bg-white dark:bg-gray-900 rounded-[28px] shadow-2xl p-8 w-[600px] max-w-full animate-in fade-in zoom-in duration-200">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tolak Organisasi?</h3>
                            <div className="space-y-3 mb-6">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none pl-1">Pilih Alasan (Maks. 3)</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {REJECTION_REASONS.map((reason) => (
                                        <button
                                            key={reason}
                                            onClick={() => toggleReason(reason)}
                                            disabled={selectedReasons.length >= 3 && !selectedReasons.includes(reason)}
                                            className={`px-3.5 py-2 rounded-full border text-[11px] font-bold transition-all ${selectedReasons.includes(reason)
                                                    ? "bg-[#FF7070] border-[#FF7070] text-white shadow-md shadow-red-500/10"
                                                    : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-300 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                                }`}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2 mb-8">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1 leading-none">Pesan Tambahan</span>
                                <textarea
                                    rows={3}
                                    value={additionalNote}
                                    onChange={e => setAdditionalNote(e.target.value)}
                                    placeholder="Contoh: Dokumen NIB buram, mohon upload ulang..."
                                    className="w-full px-4 py-3.5 text-[13px] border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all resize-none placeholder:text-gray-400"
                                />
                            </div>
                            <div className="flex gap-3 justify-end items-center">
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    className="px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors border border-gray-100 dark:border-gray-800"
                                >
                                    Batal
                                </button>
                                <button
                                    disabled={selectedReasons.length === 0 && !additionalNote.trim()}
                                    onClick={handleTolak}
                                    className="px-8 py-2.5 bg-[#FF7070] hover:bg-[#FF5C5C] disabled:opacity-40 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]"
                                >
                                    Konfirmasi Penolakan
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Filter Constants ─────────────────────────────────────────────────────────
const TIPE_OPTIONS = ["YAYASAN", "PESANTREN", "LEMBAGA", "KOMUNITAS", "MADRASAH", "PENDIDIKAN"] as const


// ─── FilterModal Component ────────────────────────────────────────────────────
function FilterModal({
    initial,
    onApply,
    onClose,
}: {
    initial: FilterState
    onApply: (f: FilterState) => void
    onClose: () => void
}) {
    const [draft, setDraft] = useState<FilterState>(initial)

    const setVal = (key: keyof FilterState, val: string) => {
        setDraft(prev => ({ ...prev, [key]: val }))
    }

    const ChipBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${active
                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-gray-800"
                }`}
        >
            {label}
        </button>
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Filter Data</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                    <p className="text-sm text-emerald-500 mb-5">tampilkan data spesifik berdasarkan kriteria.</p>

                    {/* ── Tipe Organisasi ── */}
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Building2 className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tipe Organisasi</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <ChipBtn label="Semua" active={!draft.type} onClick={() => setVal("type", "")} />
                            {TIPE_OPTIONS.map(t => (
                                <ChipBtn
                                    key={t}
                                    label={t}
                                    active={draft.type === t}
                                    onClick={() => setVal("type", t)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* ── Status Aktif ── */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Status Akun</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <ChipBtn label="Semua" active={draft.isActive === ""} onClick={() => setVal("isActive", "")} />
                            <ChipBtn label="Aktif" active={draft.isActive === "true"} onClick={() => setVal("isActive", "true")} />
                            <ChipBtn label="Nonaktif" active={draft.isActive === "false"} onClick={() => setVal("isActive", "false")} />
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={() => setDraft(EMPTY_FILTER)}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset
                        </button>
                        <button
                            onClick={() => { onApply(draft); onClose() }}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function KycOrganisasiContent() {
    const {
        orgs: filteredData,
        loading,
        totalCount,
        page,
        perPage,
        tabCounts,
        activeTab,
        search,
        filter: appliedFilter,
        setPage,
        setPerPage,
        setActiveTab,
        setSearch,
        setFilter: setAppliedFilter,
        sortOrder,
        setSortOrder,
        verifyOrg,
        rejectOrg,
        toasts,
        removeToast,
    } = useKycOrganisasi()

    const [selectedOrg, setSelectedOrg] = useState<ApiOrg | null>(null)
    const [showFilter, setShowFilter] = useState(false)

    const totalPages = Math.max(1, Math.ceil(totalCount / perPage))

    const activeFiltersCount = (appliedFilter.type ? 1 : 0) + (appliedFilter.isActive ? 1 : 0) + (appliedFilter.categoryId ? 1 : 0) + (appliedFilter.dateFrom ? 1 : 0) + (appliedFilter.dateTo ? 1 : 0)

    const tabs: { key: typeof activeTab; label: string }[] = [
        { key: "menunggu", label: "Menunggu" },
        { key: "disetujui", label: "Disetujui" },
        { key: "ditolak", label: "Ditolak" },
        { key: "semua", label: "Semua" },
    ]

    const getVisiblePages = () => {
        if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (page <= 3) return [1, 2, 3, 4, 5];
        if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [page - 2, page - 1, page, page + 1, page + 2];
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5">
            <Toast toasts={toasts} onRemove={removeToast} />
            {/* Detail Modal */}
            {selectedOrg && (
                <KycDetailModal
                    org={selectedOrg}
                    onClose={() => setSelectedOrg(null)}
                    onVerify={verifyOrg}
                    onReject={rejectOrg}
                />
            )}

            {/* Filter Modal */}
            {showFilter && (
                <FilterModal
                    initial={appliedFilter}
                    onApply={f => { setAppliedFilter(f); setPage(1) }}
                    onClose={() => setShowFilter(false)}
                />
            )}

            <div className="max-w-[1600px] mx-auto">

                {/* ── Search + Filter Bar ── */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama organisasi..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors">
                        <Search className="w-3.5 h-3.5" /> Cari
                    </button>
                    <button
                        onClick={() => setShowFilter(true)}
                        className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${activeFiltersCount > 0
                            ? "border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                    >
                        <Filter className="w-4 h-4" /> Filter
                        {activeFiltersCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-0 mb-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setPage(1) }}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${activeTab === tab.key
                                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.key && tabCounts[tab.key] > 0 && (
                                <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-emerald-500 text-white">
                                    {tabCounts[tab.key] > 99 ? "99+" : tabCounts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Table Card ── */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-5 py-3 w-[28%]">Organisasi</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[10%]">Tipe</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[15%]">Kategori</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[15%]">User</th>
                                    <th
                                        className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[15%] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-colors select-none"
                                        onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Tgl Pengajuan
                                            {sortOrder === "newest" ? (
                                                <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : sortOrder === "oldest" ? (
                                                <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-400" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[10%]">Status</th>
                                    <th className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 w-[7%]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-20 text-gray-400 text-sm">
                                            Memuat data organisasi...
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-20 text-gray-400 text-sm">
                                            Tidak ada data organisasi ditemukan
                                        </td>
                                    </tr>
                                ) : filteredData.map(org => {
                                    const orgStatus = org.isVerified === 1 ? "disetujui" : org.isVerified === 2 ? "ditolak" : "menunggu"
                                    const status = STATUS_CONFIG[orgStatus]
                                    const StatusIcon = status.icon
                                    const tglPengajuan = new Date(org.createdAt || Date.now()).toLocaleDateString("id-ID", {
                                        day: "numeric", month: "short", year: "numeric"
                                    })
                                    return (
                                        <tr
                                            key={org.id}
                                            onClick={() => setSelectedOrg(org)}
                                            className="border-b border-gray-50 dark:border-gray-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors cursor-pointer"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-emerald-700 text-xs font-bold">
                                                            {String(org.name || "O").charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{org.name}</p>
                                                        {org.legalName && (
                                                            <p className="text-gray-400 text-xs mt-0.5">{org.legalName}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tipe */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                                                        {org.type || "Organisasi"}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Kategori */}
                                            <td className="px-4 py-4">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{org.categoryName || org.category || "Umum"}</p>
                                            </td>

                                            {/* User */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{org.ownerName || (org as any).user || org.ownerUsername || "-"}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">@{org.ownerUsername || (org as any).userUsername || "-"}</p>
                                                </div>
                                            </td>

                                            {/* Tgl Pengajuan */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    {tglPengajuan}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {status.label}
                                                </span>
                                            </td>

                                            {/* Aksi */}
                                            <td className="px-4 py-4">
                                                <AksiDropdown id={org.id} onView={() => setSelectedOrg(org)} />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Pagination (OUTSIDE the card) ── */}
                <div className="flex items-center justify-between px-1 py-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center flex-wrap gap-1">
                        Menampilkan{" "}
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {totalCount === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, totalCount)}
                        </span>{" "}
                        dari <span className="font-semibold text-gray-700 dark:text-gray-300">{totalCount}</span> data
                        &nbsp;
                        <span className="text-gray-400">Baris:</span>
                        <PerPageSelect value={perPage} onChange={v => { setPerPage(v); setPage(1) }} />
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {getVisiblePages().map(p => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${page === p
                                    ? "bg-emerald-500 text-white"
                                    : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default function KycOrganisasiPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["common"]}>
                <KycOrganisasiContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
