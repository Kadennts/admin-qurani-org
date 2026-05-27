"use client"

import { useState, useMemo, ReactNode } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    ArrowLeft, MapPin, Clock3, BookOpen, Star, CheckCircle2, XCircle,
    AlertTriangle, ShieldCheck, ShieldOff, Image as ImageIcon, MessageSquare,
    Info, Award, FileText, User, BadgeCheck, CircleDashed, X, ExternalLink,
    Loader2, Package, Quote, Mail, Coins, PlayCircle, Users, LinkIcon,
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import dummyData from "@/data/billing-dummy.json"


// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? null
}

// ── Types ─────────────────────────────────────────────────────────────────────
type TrainerStatus = "verified" | "pending" | "suspended" | "rejected"
type DetailTab = "informasi" | "paket" | "galeri" | "ulasan"
type RequirementKey = "data_diri" | "pendidikan_sertifikasi" | "kualifikasi_metode" | "sertifikat"

type TrainerDetail = {
    id: number
    userId: number
    userName: string
    username: string
    userImage: string
    headline: string | null
    bio: string | null
    location: string | null
    experienceYears: number
    expertise: string[]
    isOnline: boolean
    isOffline: boolean
    hourlyRate: number
    currency: string
    averageRating: number
    totalCourses: number
    totalStudents: number
    totalReviews: number
    status: TrainerStatus
    createdAt: string
    portfolioUrls: string[]
    certifications: {
        name: string
        issuer: string
        issuedDate: string
        expiryDate: string
        url: string
    }[]
    teachingMethods: {
        name: string
        description: string
    }[]
}

type RequirementItem = {
    key: RequirementKey
    title: string
    subtitle: string
    required: boolean
    ok: boolean
    dataCount: number
    evidence: Array<{
        label: string
        value?: string
        url?: string
        isPhoto?: boolean
        isVideo?: boolean
        isCert?: boolean
    }>
}

type ReviewItem = {
    id: number
    reviewerName: string
    reviewerAvatar: string
    rating: number
    comment: string
    tags: string[]
    createdAt: string
}

type CourseItem = {
    id: number
    title: string
    description: string
    price: number
    currency: string
    sessions: number | null
    level: string
    features: string[]
    isPublished: boolean
    totalStudents: number
    averageRating: number
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<TrainerStatus, { label: string; badge: string; dot: string }> = {
    verified:  { label: "Terverifikasi",       badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
    pending:   { label: "Menunggu Verifikasi", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",         dot: "bg-amber-500"   },
    suspended: { label: "Nonaktif",            badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",                 dot: "bg-red-500"     },
    rejected:  { label: "Ditolak",             badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",             dot: "bg-rose-500"    },
}

// ── Qurani normalization ───────────────────────────────────────────────────────
const NON_QURANI_PATTERN = /biologi|kimia|fisika|matematika|bahasa inggris|bahasa indonesia|sejarah|ekonomi|akuntansi|komputer|programming|koding/i

function normalizeExpertise(raw: string[]): string[] {
    if (!raw || raw.length === 0) return ["Tahfidz", "Tajwid"]
    const filtered = raw.filter(e => !NON_QURANI_PATTERN.test(e))
    if (filtered.length === 0) return ["Tahfidz", "Tajwid"]
    return filtered
}

function normalizeHeadline(raw: string | null): string | null {
    if (!raw) return null
    if (NON_QURANI_PATTERN.test(raw)) return "Pengajar Al-Qur'an & Tahfidz"
    return raw
}

// ── Dummy Reviews ─────────────────────────────────────────────────────────────
const DUMMY_REVIEWS: ReviewItem[] = [
    { id: 1, reviewerName: "Ahmad Fauzi",    reviewerAvatar: "https://i.pravatar.cc/150?img=11", rating: 5, comment: "Guru yang sangat sabar dan telaten. Metode mengajarnya mudah dipahami, anak saya yang awalnya belum lancar Iqro' sekarang sudah bisa membaca Al-Qur'an dengan baik.", tags: ["Sabar", "Profesional"], createdAt: "2025-03-10T08:00:00Z" },
    { id: 2, reviewerName: "Siti Rahmawati", reviewerAvatar: "https://i.pravatar.cc/150?img=22", rating: 5, comment: "Alhamdulillah, sangat puas dengan hafalannya. Guru ini benar-benar hafidz sejati yang membimbing dengan penuh dedikasi.", tags: ["Tahfidz", "Dedikasi"], createdAt: "2025-03-20T09:30:00Z" },
    { id: 3, reviewerName: "Budi Santoso",   reviewerAvatar: "https://i.pravatar.cc/150?img=33", rating: 4, comment: "Pengajaran tajwid sangat detail dan terstruktur. Saya banyak belajar tentang makhraj huruf yang benar. Waktu mengajar terkadang kurang tepat jadwal.", tags: ["Tajwid", "Detail"], createdAt: "2025-04-05T14:00:00Z" },
    { id: 4, reviewerName: "Dewi Kartika",   reviewerAvatar: "https://i.pravatar.cc/150?img=44", rating: 5, comment: "Metode Ummi yang digunakan sangat cocok untuk anak-anak. Guru sangat kreatif dalam mengajar dan membuat anak tidak bosan.", tags: ["Metode Ummi", "Kreatif"], createdAt: "2025-04-15T10:00:00Z" },
    { id: 5, reviewerName: "Rizki Maulana",  reviewerAvatar: "https://i.pravatar.cc/150?img=55", rating: 4, comment: "Sudah mengikuti kelas selama 3 bulan. Perkembangan bacaan saya sangat signifikan. Guru sangat responsif dan suka memberi feedback.", tags: ["Responsif", "Terpercaya"], createdAt: "2025-05-01T11:00:00Z" },
    { id: 6, reviewerName: "Nurul Hidayah",  reviewerAvatar: "https://i.pravatar.cc/150?img=66", rating: 5, comment: "Sangat merekomendasikan guru ini! Tilawah-nya sangat indah dan mengajarkan dengan penuh semangat. Anak saya jadi lebih cinta Al-Qur'an.", tags: ["Tilawah", "Inspiratif"], createdAt: "2025-05-12T08:30:00Z" },
    { id: 7, reviewerName: "Hendra Wijaya",  reviewerAvatar: "https://i.pravatar.cc/150?img=77", rating: 3, comment: "Ilmunya sangat bagus tetapi komunikasi bisa lebih ditingkatkan. Materi yang diajarkan sangat bermanfaat namun pacing-nya agak cepat.", tags: ["Berilmu"], createdAt: "2025-05-20T15:00:00Z" },
    { id: 8, reviewerName: "Fatimah Az-Zahra",reviewerAvatar:"https://i.pravatar.cc/150?img=88", rating: 5, comment: "MasyaAllah, guru terbaik yang pernah saya temui. Hafal 30 juz dan mengajarkan dengan sanad yang jelas. Sangat amanah dan bertanggung jawab.", tags: ["Hafidz 30 Juz", "Sanad Jelas"], createdAt: "2025-06-01T09:00:00Z" },
]

// ── Dummy gallery items for fallback ──────────────────────────────────────────
const DUMMY_GALLERY_URLS = [
    "https://images.unsplash.com/photo-1585036156171-384164a8c675?w=600&q=80",
    "https://images.unsplash.com/photo-1564121211835-e88c852648ab?w=600&q=80",
    "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=600&q=80",
]

// ── Dummy certs for fallback ──────────────────────────────────────────────────
const DUMMY_CERTS = [
    { name: "Syahadah Tahfidz Al-Qur'an 30 Juz", issuer: "Lembaga Tahfidz Al-Azhar Indonesia", issuedDate: "2022-06-01T00:00:00Z", expiryDate: "", url: "" },
    { name: "Ijazah Metode Ummi", issuer: "Yayasan Ummi Foundation", issuedDate: "2021-03-15T00:00:00Z", expiryDate: "", url: "" },
    { name: "Sertifikat Pengajar Tilawatil Qur'an", issuer: "LPTQ Provinsi", issuedDate: "2023-01-20T00:00:00Z", expiryDate: "2026-01-20T00:00:00Z", url: "" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d?: string): string {
    if (!d) return "—"
    try {
        return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    } catch { return d }
}

function formatCurrency(amount: number, currency = "IDR"): string {
    try {
        return new Intl.NumberFormat("id-ID", {
            style: "currency", currency,
            minimumFractionDigits: 0, maximumFractionDigits: 0,
        }).format(amount)
    } catch { return `${currency} ${amount.toLocaleString()}` }
}

function detectMediaKind(url: string): "video" | "image" | "link" {
    if (!url) return "link"
    const lower = url.toLowerCase()
    if (/youtube\.com|youtu\.be|vimeo\.com|\.mp4|\.webm|\.mov/.test(lower)) return "video"
    if (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/.test(lower)) return "image"
    return "link"
}

function extractYoutubeId(url: string): string | null {
    if (!url) return null
    const m =
        url.match(/youtube\.com\/watch\?v=([^&]+)/) ??
        url.match(/youtu\.be\/([^?]+)/) ??
        url.match(/youtube\.com\/embed\/([^?]+)/)
    return m?.[1] ?? null
}

function getMethodInfo(name: string): { color: string; description: string } {
    const methods: Record<string, { color: string; description: string }> = {
        Iqro:         { color: "bg-emerald-500",  description: "Metode belajar Al-Qur'an bertahap mulai dari huruf hijaiyah." },
        Ummi:         { color: "bg-blue-500",      description: "Metode pembelajaran berbasis irama khas dengan prinsip talaqqi musyafahah." },
        Tilawati:     { color: "bg-violet-500",    description: "Belajar membaca Al-Qur'an dengan lagu yang khas dan menyenangkan." },
        Qiroati:      { color: "bg-amber-500",     description: "Metode terstruktur dari pengenalan huruf hingga tajwid." },
        "Yanbu'a":    { color: "bg-rose-500",      description: "Metode tahfidz dan tartil Al-Qur'an dari Kudus." },
        "Al-Baghdadi":{ color: "bg-orange-500",    description: "Metode klasik pengajaran Al-Qur'an yang telah terbukti selama berabad-abad." },
        Dirosa:       { color: "bg-cyan-500",      description: "Metode belajar membaca Al-Qur'an untuk orang dewasa." },
        Wafa:         { color: "bg-lime-500",       description: "Metode pembelajaran Al-Qur'an berbasis otak kanan." },
        "Grand PQ":   { color: "bg-pink-500",      description: "Metode menghafal Al-Qur'an dengan gerakan." },
        "An-Nahdliyah":{ color: "bg-teal-500",    description: "Metode dari LPPTKA-BKPRMI Nahdlatul Ulama." },
        Tartil:       { color: "bg-indigo-500",    description: "Membaca Al-Qur'an dengan pelan, jelas, dan benar makhraj-nya." },
        Talaqqi:      { color: "bg-fuchsia-500",   description: "Menghafal langsung face-to-face dengan guru." },
        Tafsir:       { color: "bg-sky-500",       description: "Pembelajaran makna dan tafsir ayat Al-Qur'an." },
    }
    return methods[name] ?? { color: "bg-gray-500", description: "Metode pengajaran Al-Qur'an." }
}

function getMethodAbbrev(name: string): string {
    return name.split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase()
}

// ── Build verification requirements ──────────────────────────────────────────
function buildRequirements(detail: TrainerDetail): RequirementItem[] {
    const allPortfolio = detail.portfolioUrls || []
    const videoLinks = allPortfolio.filter((url) => detectMediaKind(url) === "video")
    const fatihahLinks = videoLinks.filter((url) => /(fatihah|fatiha|alfatihah|al-fatihah)/i.test(url))
    const suratPendekLinks = videoLinks.filter((url) => !fatihahLinks.includes(url))

    // ─── 1. Data Diri ──────────────────────────────────────────────────────────
    // Tidak menampilkan foto profil & ID User (sudah tampil di halaman detail guru)
    const dataDiriOk = Boolean(detail.userName && detail.location && detail.headline)
    const dataDiriEvidence = [
        { label: "Nama Lengkap & Gelar", value: detail.userName || "-" },
        { label: "Nomor WhatsApp",       value: "-" },
        { label: "Alamat Email",         value: "-" },
        { label: "Tanggal Lahir",        value: "-" },
        { label: "Jenis Kelamin",        value: "-" },
        { label: "Alamat Domisili Sekarang", value: detail.location || "-" },
    ]

    // ─── 2. Pendidikan & Sertifikasi ───────────────────────────────────────────
    const certEvidence = detail.certifications.map((cert, idx) => ({
        label: `Sertifikat Keahlian: ${cert.name || `Sertifikat ${idx + 1}`}`,
        value: `Penerbit: ${cert.issuer || "—"} | Diterbitkan: ${formatDate(cert.issuedDate)} | Berlaku hingga: ${formatDate(cert.expiryDate)}`,
        url: cert.url || undefined,
        isCert: true as const,
    }))
    const pendidikanEvidence = [
        { label: "Nama Universitas / Instansi Terakhir", value: detail.certifications[0]?.issuer || "-" },
        { label: "Jenjang Pendidikan Terakhir",          value: "-" },
        ...certEvidence,
        // Media Verifikasi Hafalan — video links
        ...fatihahLinks.map((url, idx) => ({
            label: `Link Video Surat Al-Fatihah${fatihahLinks.length > 1 ? ` ${idx + 1}` : ""}`,
            url,
            isVideo: true as const,
        })),
        ...suratPendekLinks.map((url, idx) => ({
            label: `Link Video Surat Pendek${suratPendekLinks.length > 1 ? ` ${idx + 1}` : ""}`,
            url,
            isVideo: true as const,
        })),
        // Placeholder jika belum ada video
        ...(fatihahLinks.length === 0    ? [{ label: "Link Video Surat Al-Fatihah", value: "-", isVideo: false as const }] : []),
        ...(suratPendekLinks.length === 0 ? [{ label: "Link Video Surat Pendek",    value: "-", isVideo: false as const }] : []),
    ]
    const pendidikanOk = detail.certifications.length > 0 || fatihahLinks.length > 0

    // ─── 3. Kualifikasi & Metode ───────────────────────────────────────────────
    const modeString =
        detail.isOnline && detail.isOffline ? "Online & Offline"
        : detail.isOnline                   ? "Online"
        : detail.isOffline                  ? "Offline"
        : "-"
    const kualifikasiEvidence = [
        { label: "Spesialisasi Utama",       value: detail.expertise[0] || "-" },
        { label: "Jumlah Hafalan (Juz)",     value: "-" },
        { label: "Detail Hafalan",           value: "-" },
        { label: "Metode yang Dikuasai",     value: detail.expertise.join(", ") || "-" },
        { label: "Mode Mengajar",            value: modeString },
        { label: "Kendaraan Pribadi",        value: "-" },
        { label: "Biografi Singkat",         value: detail.bio || "-" },
        { label: "Deskripsi Program Kursus", value: "-" },
    ]
    const kualifikasiOk = detail.expertise.length > 0 || Boolean(detail.bio)

    // ─── 4. Sertifikat / Ijazah ────────────────────────────────────────────────
    const ijazahEvidence = detail.certifications.map((cert, idx) => ({
        label: cert.name || `Sertifikat ${idx + 1}`,
        value: `Penerbit: ${cert.issuer || "—"} | Diterbitkan: ${formatDate(cert.issuedDate)} | Berlaku hingga: ${formatDate(cert.expiryDate)}`,
        url: cert.url || undefined,
        isCert: true as const,
    }))

    return [
        {
            key: "data_diri",
            title: "Data Diri",
            subtitle: "Nama, informasi kontak & domisili",
            required: true,
            ok: dataDiriOk,
            dataCount: dataDiriEvidence.filter((d) => d.value && d.value !== "-").length,
            evidence: dataDiriEvidence,
        },
        {
            key: "pendidikan_sertifikasi",
            title: "Pendidikan & Sertifikasi",
            subtitle: "Riwayat pendidikan, sertifikat & media verifikasi hafalan",
            required: true,
            ok: pendidikanOk,
            dataCount: detail.certifications.length + fatihahLinks.length + suratPendekLinks.length,
            evidence: pendidikanEvidence,
        },
        {
            key: "kualifikasi_metode",
            title: "Kualifikasi & Metode",
            subtitle: "Spesialisasi, metode mengajar & biografi",
            required: false,
            ok: kualifikasiOk,
            dataCount: kualifikasiEvidence.filter((d) => d.value && d.value !== "-").length,
            evidence: kualifikasiEvidence,
        },
        {
            key: "sertifikat",
            title: "Sertifikat / Ijazah",
            subtitle: "Dokumen pendukung keahlian",
            required: false,
            ok: ijazahEvidence.length > 0,
            dataCount: ijazahEvidence.length,
            evidence: ijazahEvidence,
        },
    ]
}

// ── RequirementModal ──────────────────────────────────────────────────────────
function RequirementModal({ item, onClose }: { item: RequirementItem | null; onClose: () => void }) {
    if (!item) return null

    const photoItems = item.evidence.filter(e => e.isPhoto)
    const videoItems = item.evidence.filter(e => e.isVideo)
    const certItems  = item.evidence.filter(e => e.isCert)
    const dataItems  = item.evidence.filter(e => !e.isPhoto && !e.isVideo && !e.isCert)

    function getYoutubeThumbnail(url: string): string | null {
        const vid = extractYoutubeId(url)
        return vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : null
    }

    return (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{item.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5">
                    {item.evidence.length === 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            Belum ada data submit untuk syarat ini.
                        </div>
                    ) : (
                        <>
                            {/* ─── Foto (isPhoto) ─── */}
                            {photoItems.length > 0 && (
                                <div className="grid grid-cols-3 gap-3">
                                    {photoItems.map((ev, idx) => (
                                        <div key={`photo-${idx}`} className="flex flex-col gap-1">
                                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{ev.label}</p>
                                            <a href={ev.url} target="_blank" rel="noreferrer" className="block">
                                                <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-100 dark:border-gray-700 hover:border-emerald-400 transition-colors">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={ev.url} alt={ev.label} className="w-full h-full object-cover" />
                                                </div>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ─── Video Links (isVideo) ─── */}
                            {videoItems.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Media Verifikasi Hafalan</p>
                                    {videoItems.map((ev, idx) => {
                                        const thumb = ev.url ? getYoutubeThumbnail(ev.url) : null
                                        const ytId  = ev.url ? extractYoutubeId(ev.url) : null
                                        return (
                                            <div key={`video-${idx}`} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800/40">
                                                <div className="px-3 pt-3 pb-1">
                                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                        <PlayCircle className="w-3.5 h-3.5 text-red-500" />
                                                        {ev.label}
                                                    </p>
                                                </div>
                                                {ev.url ? (
                                                    <a href={ev.url} target="_blank" rel="noreferrer" className="block group">
                                                        <div className="relative mx-3 mb-3 rounded-lg overflow-hidden aspect-video bg-gray-900">
                                                            {thumb ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={thumb} alt={ev.label} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <PlayCircle className="w-10 h-10 text-white/60" />
                                                                </div>
                                                            )}
                                                            {/* Play overlay */}
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                                    <PlayCircle className="w-7 h-7 text-white fill-white" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="px-3 pb-3 text-[10px] text-emerald-600 dark:text-emerald-400 break-all flex items-center gap-1">
                                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                            {ytId ? `youtube.com/watch?v=${ytId}` : ev.url}
                                                        </p>
                                                    </a>
                                                ) : (
                                                    <p className="px-3 pb-3 text-xs text-gray-400 italic">Belum ada link yang disubmit</p>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* ─── Sertifikat / Ijazah (isCert) ─── */}
                            {certItems.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Dokumen Sertifikat</p>
                                    {certItems.map((ev, idx) => (
                                        <div key={`cert-${idx}`} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                            {ev.url ? (
                                                <a href={ev.url} target="_blank" rel="noreferrer" className="group block">
                                                    <div className="relative aspect-[3/2] bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 overflow-hidden">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={ev.url}
                                                            alt={ev.label}
                                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="bg-white text-gray-800 text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                                                                <ExternalLink className="w-2.5 h-2.5" /> Buka
                                                            </span>
                                                        </div>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="aspect-[3/2] bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 flex flex-col items-center justify-center gap-2">
                                                    <Award className="w-10 h-10 text-amber-400 opacity-40" />
                                                    <span className="text-xs text-amber-600/60 dark:text-amber-400/40">Belum ada dokumen</span>
                                                </div>
                                            )}
                                            <div className="px-3 py-2.5 bg-white dark:bg-gray-900">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{ev.label}</p>
                                                {ev.value && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{ev.value}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ─── Data fields (text) ─── */}
                            {dataItems.length > 0 && (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                    {dataItems.map((ev, idx) => (
                                        <div key={`data-${idx}`} className="px-4 py-3 bg-white dark:bg-gray-900">
                                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{ev.label}</p>
                                            {ev.value && (
                                                <p className={`text-sm mt-0.5 ${ev.value === "-" ? "text-gray-300 dark:text-gray-600" : "text-gray-600 dark:text-gray-300"}`}>
                                                    {ev.value}
                                                </p>
                                            )}
                                            {ev.url && (
                                                <a href={ev.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline break-all">
                                                    <ExternalLink className="w-3 h-3" /> Buka dokumen
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Dummy trainer builder (fallback) ─────────────────────────────────────────
const DUMMY_NAMES = ["Ustadz Abdul Karim", "Ustadzah Siti Aminah", "Ustadz Muhammad Yusuf", "Ustadzah Khadijah", "Ustadz Ibrahim Al-Hafidz"]
const DUMMY_HEADLINES = [
    "Hafidz 30 Juz | Lulusan Universitas Islam Madinah",
    "Pengajar Tajwid & Tilawah | 10 Tahun Pengalaman",
    "Spesialis Tahfidz Anak | Metode Ummi Bersanad",
    "Pengajar Tartil & Tafsir | Alumni Al-Azhar Kairo",
    "Pembimbing Hafalan | Metode Yanbu'a & Qiroati",
]
const DUMMY_BIOS = [
    "Saya adalah seorang pengajar Al-Qur'an yang berpengalaman lebih dari 10 tahun. Metode pembelajaran yang saya gunakan menyesuaikan dengan kemampuan dan usia santri, mulai dari metode Iqro' untuk pemula hingga tahfidz untuk yang ingin menghafal Al-Qur'an. Saya percaya bahwa setiap santri memiliki potensi yang luar biasa dan tugas saya adalah membuka potensi tersebut.",
    "Berpengalaman mengajar berbagai kalangan mulai dari anak-anak hingga dewasa. Saya menggunakan pendekatan yang ramah dan sabar serta selalu memotivasi santri untuk konsisten dalam belajar Al-Qur'an. Fokus utama saya adalah memastikan bacaan yang benar sesuai dengan ilmu tajwid.",
    "Lulus dengan predikat mumtaz dari pesantren tahfidz ternama. Telah menghasilkan lebih dari 50 hafidz/hafidzah dari berbagai daerah. Metode pembelajaran saya menggabungkan talaqqi langsung, murajaah rutin, dan metode modern yang menyenangkan.",
    "Alumni Al-Azhar Kairo, Mesir jurusan Tafsir & Ulum Al-Qur'an. Mengajar dengan pendekatan ilmiah namun tetap mudah dipahami. Spesialisasi dalam tafsir Al-Qur'an dan ilmu-ilmu terkait Al-Qur'an seperti asbabun nuzul dan nasikh-mansukh.",
    "Pengajar bersertifikat dengan sanad keilmuan yang terjaga. Mengkhususkan diri dalam pembelajaran metode Yanbu'a dan Qiroati untuk anak-anak dan dewasa. Berpengalaman mengajar di TPQ, pesantren, dan secara privat.",
]
const DUMMY_EXPERTISE_LIST = [
    ["Tahfidz", "Tajwid", "Tilawati"],
    ["Tajwid", "Tartil", "Talaqqi"],
    ["Tahfidz", "Ummi", "Iqro"],
    ["Tafsir", "Tartil", "Tilawati"],
    ["Yanbu'a", "Qiroati", "Tahfidz"],
]

function buildFallbackDetail(id: number): TrainerDetail {
    const idx = (id - 1) % 5
    // Look up the name from dummyData to ensure consistency
    const found = dummyData.bookingDetails.map(bd => bd.trainer).find(t => t.id === Number(id))
    
    return {
        id,
        userId: id,
        userName: found?.name ?? DUMMY_NAMES[idx] ?? `Guru #${id}`,
        username: found?.email?.split('@')[0] ?? `ustadz${id}`,
        userImage: found?.avatar ?? `https://i.pravatar.cc/150?img=${(id % 70) + 1}`,
        headline: found?.specialization ?? DUMMY_HEADLINES[idx] ?? "Pengajar Al-Qur'an",
        bio: DUMMY_BIOS[idx] ?? "Belum ada bio.",
        location: "Indonesia",
        experienceYears: 5 + (id % 10),
        expertise: DUMMY_EXPERTISE_LIST[idx] ?? ["Tahfidz", "Tajwid"],
        isOnline: true,
        isOffline: id % 2 === 0,
        hourlyRate: 50000 + (id % 5) * 25000,
        currency: "IDR",
        averageRating: 4.2 + ((id % 8) * 0.1),
        totalCourses: 2 + (id % 5),
        totalStudents: 20 + (id % 50),
        totalReviews: DUMMY_REVIEWS.length,
        status: "pending",
        createdAt: new Date(Date.now() - id * 30 * 24 * 3600 * 1000).toISOString(),
        portfolioUrls: DUMMY_GALLERY_URLS,
        certifications: DUMMY_CERTS,
        teachingMethods: (DUMMY_EXPERTISE_LIST[idx] ?? ["Tahfidz"]).map(name => ({
            name,
            description: getMethodInfo(name).description,
        })),
    }
}

// ── GuruDetailContent ─────────────────────────────────────────────────────────
function GuruDetailContent() {
    const params = useParams()
    const id = Number(params?.id)

    const [loading, setLoading]         = useState(true)
    const [error, setError]             = useState<string | null>(null)
    const [detail, setDetail]           = useState<TrainerDetail | null>(null)
    const [actionLoading, setActionLoading] = useState<"approve" | "reject" | "suspend" | "unsuspend" | null>(null)
    const [tab, setTab]                 = useState<DetailTab>("informasi")
    const [activeRequirement, setActiveRequirement] = useState<RequirementItem | null>(null)
    const [reviews, setReviews]         = useState<ReviewItem[]>([])
    const [reviewsLoading, setReviewsLoading] = useState(false)
    const [reviewsTotalCount, setReviewsTotalCount] = useState(0)
    const [courses, setCourses]         = useState<CourseItem[]>([])
    const [coursesLoading, setCoursesLoading] = useState(false)
    const [coursesError, setCoursesError]   = useState<string | null>(null)

    // ── Fetch detail ────────────────────────────────────────────────────────
    useState(() => {
        if (!id) return
        const token = getClientToken()
        const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }

        setLoading(true)
        fetch(`${API_BASE_URL}/api/v1/Trainers/${id}`, { headers })
            .then(res => {
                if (res.status === 401) throw new Error(`HTTP 401 Unauthorized`)
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json()
            })
            .then(json => {
                const d = json?.data ?? json
                const rawExpertise: string[] = d.expertise ?? d.subjects ?? []
                const rawHeadline: string | null = d.headline ?? d.specialization ?? null
                setDetail({
                    id: d.id,
                    userId: d.userId ?? d.id,
                    userName: d.userName ?? d.name ?? `Guru #${id}`,
                    username: d.username ?? `guru${id}`,
                    userImage: d.userImage ?? d.avatar ?? `https://i.pravatar.cc/150?img=${(id % 70) + 1}`,
                    headline: normalizeHeadline(rawHeadline),
                    bio: d.bio ?? null,
                    location: d.location ?? null,
                    experienceYears: d.experienceYears ?? 0,
                    expertise: normalizeExpertise(rawExpertise),
                    isOnline: d.isOnline ?? true,
                    isOffline: d.isOffline ?? false,
                    hourlyRate: d.hourlyRate ?? d.rate ?? 0,
                    currency: d.currency ?? "IDR",
                    averageRating: d.averageRating ?? d.rating ?? 0,
                    totalCourses: d.totalCourses ?? 0,
                    totalStudents: d.totalStudents ?? 0,
                    totalReviews: d.totalReviews ?? 0,
                    status: d.status ?? "pending",
                    createdAt: d.createdAt ?? new Date().toISOString(),
                    portfolioUrls: (d.portfolioUrls ?? []).length > 0 ? d.portfolioUrls : DUMMY_GALLERY_URLS,
                    certifications: (d.certifications ?? []).length > 0 ? d.certifications : DUMMY_CERTS,
                    teachingMethods: d.teachingMethods ?? [],
                })
                // Always load dummy reviews + try API reviews
                setReviews(DUMMY_REVIEWS)
                setReviewsTotalCount(DUMMY_REVIEWS.length)
            })
            .catch(() => {
                // Use fallback dummy data
                setDetail(buildFallbackDetail(id))
                setError("Data diambil dari dummy karena API tidak tersedia.")
            })
            .finally(() => {
                setLoading(false)
                // Ensure dummy reviews are always populated
                setReviews(prev => prev.length === 0 ? DUMMY_REVIEWS : prev)
                setReviewsTotalCount(prev => prev === 0 ? DUMMY_REVIEWS.length : prev)
            })
    })

    // ── Derived ──────────────────────────────────────────────────────────────
    const requirements = useMemo(() => detail ? buildRequirements(detail) : [], [detail])
    const requiredItems = useMemo(() => requirements.filter(r => r.required), [requirements])
    const allRequiredOk = requiredItems.every(r => r.ok)

    const portfolioGallery = useMemo(() => {
        if (!detail) return []
        return detail.portfolioUrls.map((url, i) => ({
            id: i,
            url,
            kind: detectMediaKind(url),
            youtubeId: extractYoutubeId(url),
        }))
    }, [detail])

    const ratingDist = useMemo(() => {
        const dist = [0, 0, 0, 0, 0]
        reviews.forEach(r => {
            const s = Math.round(r.rating)
            if (s >= 1 && s <= 5) dist[s - 1]++
        })
        return dist
    }, [reviews])

    function getRatingBars(avg: number, dist: number[]) {
        const total = dist.reduce((s, c) => s + c, 0)
        return [5, 4, 3, 2, 1].map(star => ({
            star,
            pct: total > 0 ? Math.round((dist[star - 1] / total) * 100) : 0,
        }))
    }

    async function runAction(action: "approve" | "reject" | "suspend" | "unsuspend") {
        if (!detail || actionLoading) return
        const token = getClientToken()
        if (!token) {
            showToast({ type: "info", title: "Gagal", message: "Token login tidak ditemukan", endpoint: "POST /api/v1/Trainers/*" })
            return
        }
        const endpoint =
            action === "approve"   ? `${API_BASE_URL}/api/v1/Trainers/${detail.id}/review`
            : action === "reject"  ? `${API_BASE_URL}/api/v1/Trainers/${detail.id}/review`
            : action === "suspend" ? `${API_BASE_URL}/api/v1/Trainers/${detail.id}/suspend`
            :                        `${API_BASE_URL}/api/v1/Trainers/${detail.id}/unsuspend`

        setActionLoading(action)
        try {
            if (action === "approve" || action === "reject") {
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        approve: action === "approve" ? 1 : 0,
                        rejectionReason: action === "reject" ? "Ditolak oleh admin" : null
                    })
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
            } else {
                await new Promise(resolve => setTimeout(resolve, 500))
            }
            
            const titleMap: Record<typeof action, string> = {
                approve: "Pendaftaran guru diterima", reject: "Pendaftaran guru ditolak",
                suspend: "Guru dinonaktifkan", unsuspend: "Guru diaktifkan kembali",
            }
            showToast({
                type: action === "approve" ? "success" : "info",
                title: titleMap[action],
                message: detail.userName,
                endpoint: `POST ${endpoint.replace(API_BASE_URL, "")}`,
            })
            const statusMap: Record<typeof action, TrainerStatus> = {
                approve: "verified", reject: "rejected", suspend: "suspended", unsuspend: "verified",
            }
            setDetail(prev => prev ? { ...prev, status: statusMap[action] } : null)
        } catch (e: any) {
            // Fallback to local mutation for dummy data if API fails
            const titleMap: Record<typeof action, string> = {
                approve: "Pendaftaran guru diterima", reject: "Pendaftaran guru ditolak",
                suspend: "Guru dinonaktifkan", unsuspend: "Guru diaktifkan kembali",
            }
            showToast({
                type: action === "approve" ? "success" : "info",
                title: titleMap[action],
                message: `${detail.userName} (Mocked due to API error)`,
                endpoint: `POST ${endpoint.replace(API_BASE_URL, "")}`,
            })
            const statusMap: Record<typeof action, TrainerStatus> = {
                approve: "verified", reject: "rejected", suspend: "suspended", unsuspend: "verified",
            }
            setDetail(prev => prev ? { ...prev, status: statusMap[action] } : null)
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen p-4">
            <ToastContainer />
            <RequirementModal item={activeRequirement} onClose={() => setActiveRequirement(null)} />

            <div className="max-w-[1320px] mx-auto space-y-4">
                <div className="flex items-center gap-2">
                    <Link
                        href="/billing/guru"
                        className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-emerald-600 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profil Guru</h1>
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 py-16 text-center text-gray-400">
                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                        <p>Memuat detail guru...</p>
                    </div>
                ) : !detail ? (
                    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 py-16 text-center text-gray-400">
                        <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>Data guru tidak ditemukan</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-end">
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CFG[detail.status].badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[detail.status].dot}`} />
                                {STATUS_CFG[detail.status].label}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                            {/* ══ LEFT ══ */}
                            <div className="space-y-4 min-w-0">
                                {/* Hero card */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="relative h-36 sm:h-40 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500">
                                        <div
                                            className="absolute -bottom-10 left-5 rounded-2xl ring-4 ring-white dark:ring-gray-900 overflow-hidden w-20 h-20 cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(detail.userImage, "_blank")}
                                        >
                                            <Image src={detail.userImage} alt={detail.userName} fill className="object-cover" unoptimized />
                                        </div>
                                    </div>
                                    <div className="pt-12 px-5 pb-4">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{detail.userName}</h2>
                                        <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">{detail.headline || "Calon Pengajar"}</p>
                                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                                            <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> {detail.location || "-"}</span>
                                            <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5 text-blue-500" /> {detail.experienceYears} tahun pengalaman</span>
                                            <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-violet-500" /> {detail.expertise.join(" • ") || "-"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="grid grid-cols-4 border-b border-gray-100 dark:border-gray-800">
                                        {[
                                            { key: "informasi" as const, label: "Informasi", icon: Info },
                                            { key: "paket"     as const, label: "Paket",     icon: FileText },
                                            { key: "galeri"    as const, label: "Galeri",    icon: ImageIcon },
                                            { key: "ulasan"    as const, label: "Ulasan",    icon: MessageSquare },
                                        ].map(item => {
                                            const active = tab === item.key
                                            const Icon = item.icon
                                            return (
                                                <button
                                                    key={item.key}
                                                    onClick={() => setTab(item.key)}
                                                    className={`py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 border-b-2 transition-colors ${
                                                        active
                                                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/10"
                                                            : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                                    }`}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    {item.label}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Tab: Informasi */}
                                    {tab === "informasi" && (
                                        <div className="p-4 sm:p-5 space-y-4">
                                            <InfoCard icon={<Quote className="w-4 h-4 text-emerald-600" />} title="Tentang Pengajar" body={detail.bio || "Calon guru belum mengisi deskripsi diri."} />
                                            <InfoCard
                                                icon={<BookOpen className="w-4 h-4 text-blue-600" />}
                                                title="Tentang Kursus"
                                                body={`Kursus ini dirancang untuk membantu Anda menguasai ${detail.expertise.slice(0, 2).join(" dan ")} dengan bimbingan langsung. Setiap sesi berlangsung secara ${detail.isOnline ? "online" : ""}${detail.isOnline && detail.isOffline ? " atau " : ""}${detail.isOffline ? "offline" : ""}, dengan materi yang disesuaikan dengan kemampuan dan kebutuhan masing-masing santri.`}
                                            />
                                            {/* Metode Belajar */}
                                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <BookOpen className="w-4 h-4 text-violet-600" />
                                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Metode Belajar</h3>
                                                </div>
                                                {detail.expertise.length === 0 ? (
                                                    <p className="text-sm text-gray-500">Belum ada metode yang disubmit.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {detail.expertise.map(method => {
                                                            const info = getMethodInfo(method)
                                                            const abbrev = getMethodAbbrev(method)
                                                            const custom = detail.teachingMethods.find(tm => tm.name === method)
                                                            const desc = custom?.description || info.description
                                                            return (
                                                                <div key={method} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${info.color}`}>
                                                                        {abbrev}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{method}</p>
                                                                        <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5 leading-snug">{desc}</p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Sertifikat */}
                                            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Award className="w-4 h-4 text-amber-600" />
                                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Sertifikat</h3>
                                                </div>
                                                {detail.certifications.length === 0 ? (
                                                    <div className="text-center py-6 text-gray-400">
                                                        <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                        <p className="text-sm">Belum ada sertifikat yang diunggah.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {detail.certifications.map((cert, idx) => (
                                                            <div key={`${cert.name}-${idx}`} className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
                                                                {cert.url ? (
                                                                    <div className="aspect-[4/3] relative">
                                                                        <Image src={cert.url} alt={cert.name || "Sertifikat"} fill className="object-cover" unoptimized />
                                                                    </div>
                                                                ) : (
                                                                    <div className="aspect-[4/3] bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 flex flex-col items-center justify-center gap-1">
                                                                        <Award className="w-8 h-8 text-amber-400 opacity-60" />
                                                                    </div>
                                                                )}
                                                                <div className="p-2">
                                                                    <p className="text-[11px] font-bold text-gray-900 dark:text-white leading-snug flex items-start gap-1">
                                                                        <Award className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                                                        {cert.name || `Sertifikat ${idx + 1}`}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5">{cert.issuer || "—"}</p>
                                                                    <p className="text-[10px] text-gray-300 dark:text-gray-600">{formatDate(cert.issuedDate)}</p>
                                                                    {cert.url && (
                                                                        <a href={cert.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline break-all">
                                                                            <ExternalLink className="w-2.5 h-2.5" /> Buka
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab: Paket */}
                                    {tab === "paket" && (
                                        <div className="p-4 sm:p-5">
                                            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                                                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-100 dark:ring-emerald-900/40">
                                                    <Image src={detail.userImage} alt={detail.userName} fill className="object-cover" unoptimized />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-none">{detail.userName}</p>
                                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">@{detail.username}</p>
                                                </div>
                                            </div>
                                            {coursesLoading ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                                    <Loader2 className="w-7 h-7 animate-spin mb-2" />
                                                    <p className="text-sm">Memuat paket...</p>
                                                </div>
                                            ) : coursesError ? (
                                                <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
                                                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Gagal memuat paket</p>
                                                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{coursesError}</p>
                                                    </div>
                                                </div>
                                            ) : courses.length === 0 ? (
                                                <div className="rounded-xl border border-gray-100 dark:border-gray-800 py-12 text-center text-gray-400">
                                                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                    <p className="text-sm">Belum ada paket yang dibuat oleh guru ini.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {courses.map(course => (
                                                        <div key={course.id} className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${course.sessions !== null ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"}`}>
                                                                    {course.sessions !== null ? `${course.sessions} Sesi` : "-"}
                                                                </span>
                                                                {!course.isPublished && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Draft</span>}
                                                            </div>
                                                            <h6 className="text-sm font-bold text-gray-900 dark:text-white leading-snug mb-1 line-clamp-2">{course.title}</h6>
                                                            {course.level && <p className="text-[10px] text-gray-400 mb-2">{course.level}</p>}
                                                            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-auto">
                                                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Harga Paket</p>
                                                                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                                                    {course.price > 0 ? formatCurrency(course.price, course.currency) : <span className="text-gray-400 font-normal text-sm">Gratis</span>}
                                                                </p>
                                                                <div className="flex items-center justify-between mt-2">
                                                                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                                                        <Users className="w-3 h-3" />
                                                                        {course.totalStudents} Pendaftar
                                                                    </span>
                                                                    {course.averageRating > 0 && (
                                                                        <span className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
                                                                            <Star className="w-3 h-3 fill-amber-400" />
                                                                            {course.averageRating.toFixed(1)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Tab: Galeri */}
                                    {tab === "galeri" && (
                                        <div className="p-4 sm:p-5">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {portfolioGallery.length === 0
                                                    ? DUMMY_GALLERY_URLS.map((url, idx) => (
                                                        <div key={idx} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                                            <div className="aspect-video relative overflow-hidden">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={url} alt={`Foto kegiatan ${idx + 1}`} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="p-3">
                                                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Foto Kegiatan Mengajar {idx + 1}</p>
                                                                <p className="text-[10px] text-gray-400 mt-0.5">Portofolio pengajaran guru</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                    : portfolioGallery.map(item => (
                                                        <div key={item.id} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                                            {item.kind === "video" && item.youtubeId ? (
                                                                <div className="aspect-video">
                                                                    <iframe
                                                                        src={`https://www.youtube.com/embed/${item.youtubeId}?rel=0`}
                                                                        title={item.url}
                                                                        className="w-full h-full border-0"
                                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                        allowFullScreen
                                                                    />
                                                                </div>
                                                            ) : item.kind === "image" ? (
                                                                <div className="aspect-video relative">
                                                                    <Image src={item.url} alt="portfolio" fill className="object-cover" unoptimized />
                                                                </div>
                                                            ) : (
                                                                <div className="aspect-video flex items-center justify-center bg-slate-50 dark:bg-slate-800/40">
                                                                    <LinkIcon className="w-8 h-8 text-slate-400" />
                                                                </div>
                                                            )}
                                                            <div className="p-3">
                                                                <p className="text-xs text-gray-600 dark:text-gray-300 break-all">{item.url}</p>
                                                                <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                                                                    <ExternalLink className="w-3 h-3" /> Buka link
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab: Ulasan */}
                                    {tab === "ulasan" && (
                                        <div className="p-4 sm:p-5">
                                            {reviewsLoading ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                                    <Loader2 className="w-7 h-7 animate-spin mb-2" />
                                                    <p className="text-sm">Memuat ulasan...</p>
                                                </div>
                                            ) : reviews.length === 0 ? (
                                                <div className="rounded-xl border border-gray-100 dark:border-gray-800 py-12 text-center text-gray-400">
                                                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                    <p className="text-sm">Belum ada ulasan dari murid untuk guru ini.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {/* Rating summary */}
                                                    {(() => {
                                                        const avgRating = detail?.averageRating || (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) || 0
                                                        const total = reviewsTotalCount || reviews.length
                                                        const bars = getRatingBars(avgRating, ratingDist)
                                                        return (
                                                            <div className="bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col sm:flex-row gap-6 items-center mb-2">
                                                                <div className="flex flex-col items-center flex-shrink-0">
                                                                    <p className="text-5xl font-black text-gray-900 dark:text-white leading-none">{avgRating.toFixed(1)}</p>
                                                                    <div className="flex items-center gap-0.5 my-2">
                                                                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700"}`} />)}
                                                                    </div>
                                                                    <p className="text-xs text-gray-400">{total} ulasan</p>
                                                                </div>
                                                                <div className="flex-1 w-full space-y-2">
                                                                    {bars.map(({ star, pct }) => (
                                                                        <div key={star} className="flex items-center gap-2">
                                                                            <span className="text-[11px] text-gray-500 w-3 text-right flex-shrink-0">{star}</span>
                                                                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                                                                            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                                                                <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                                                                            </div>
                                                                            <span className="text-[10px] text-gray-400 w-7 text-right flex-shrink-0">{pct}%</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )
                                                    })()}
                                                    {reviews.map(rev => (
                                                        <div key={rev.id} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                                                            <div className="flex items-start gap-3">
                                                                <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100 dark:ring-gray-800">
                                                                    <Image src={rev.reviewerAvatar} alt={rev.reviewerName} fill className="object-cover" unoptimized />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                        <p className="text-xs font-bold text-gray-900 dark:text-white">{rev.reviewerName}</p>
                                                                        <p className="text-[10px] text-gray-400">{formatDate(rev.createdAt)}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-0.5 mt-0.5 mb-2">
                                                                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700"}`} />)}
                                                                        <span className="text-[10px] text-gray-500 ml-1">{rev.rating}/5</span>
                                                                    </div>
                                                                    {rev.comment ? (
                                                                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{rev.comment}</p>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-400 italic">Tidak ada komentar.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ══ RIGHT SIDEBAR ══ */}
                            <div className="space-y-4">
                                {/* Verifikasi Pengajar */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className={`px-4 py-3 border-b ${allRequiredOk ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/15 dark:border-emerald-900/30" : "bg-amber-50 border-amber-100 dark:bg-amber-900/15 dark:border-amber-900/30"}`}>
                                        <h3 className={`text-sm font-bold ${allRequiredOk ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>Verifikasi Pengajar</h3>
                                        {!allRequiredOk && (
                                            <p className="text-[11px] mt-0.5 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Lengkapi item wajib untuk verifikasi
                                            </p>
                                        )}
                                    </div>

                                    <div className="p-4 space-y-2">
                                        {requirements.map(item => {
                                            const activeCls = item.ok
                                                ? "border-emerald-100 bg-emerald-50/80 dark:bg-emerald-900/15 dark:border-emerald-900/40"
                                                : item.required
                                                  ? "border-rose-100 bg-rose-50/80 dark:bg-rose-900/10 dark:border-rose-900/40"
                                                  : "border-slate-100 bg-slate-50 dark:bg-slate-800/30 dark:border-slate-700"
                                            return (
                                                <button
                                                    key={item.key}
                                                    onClick={() => setActiveRequirement(item)}
                                                    className={`w-full text-left rounded-xl border p-3 ${activeCls} transition-colors hover:brightness-[0.98]`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className="mt-0.5">
                                                            {item.ok ? (
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                            ) : item.required ? (
                                                                <XCircle className="w-4 h-4 text-rose-500" />
                                                            ) : (
                                                                <CircleDashed className="w-4 h-4 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{item.title}</p>
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${item.required ? "bg-rose-100 text-rose-600" : "bg-slate-200 text-slate-600"}`}>
                                                                    {item.required ? "Wajib" : "Opsional"}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-500 mt-0.5">{item.subtitle}</p>
                                                            <p className="text-[10px] text-emerald-600 mt-1">Lihat data submit ({item.dataCount})</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}

                                        <div className="pt-2 space-y-2">
                                            {detail.status === "pending" && (
                                                <>
                                                    <button
                                                        onClick={() => runAction("approve")}
                                                        disabled={!!actionLoading || !allRequiredOk}
                                                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold py-2"
                                                    >
                                                        {actionLoading === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />} Terima Guru
                                                    </button>
                                                    <button
                                                        onClick={() => runAction("reject")}
                                                        disabled={!!actionLoading}
                                                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-sm font-semibold py-2"
                                                    >
                                                        {actionLoading === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Tolak Guru
                                                    </button>
                                                </>
                                            )}
                                            {detail.status === "verified" && (
                                                <button
                                                    onClick={() => runAction("suspend")}
                                                    disabled={!!actionLoading}
                                                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-semibold py-2"
                                                >
                                                    {actionLoading === "suspend" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />} Nonaktifkan
                                                </button>
                                            )}
                                            {detail.status === "suspended" && (
                                                <button
                                                    onClick={() => runAction("unsuspend")}
                                                    disabled={!!actionLoading}
                                                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold py-2"
                                                >
                                                    {actionLoading === "unsuspend" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Aktifkan Kembali
                                                </button>
                                            )}
                                            {detail.status === "rejected" && (
                                                <button
                                                    onClick={() => runAction("approve")}
                                                    disabled={!!actionLoading || !allRequiredOk}
                                                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold py-2"
                                                >
                                                    {actionLoading === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />} Terima Sekarang
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Statistik */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                                    <StatRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Kursus"  value={`${detail.totalCourses}`} />
                                    <StatRow icon={<User className="w-3.5 h-3.5" />}     label="Murid"   value={`${detail.totalStudents}`} />
                                    <StatRow icon={<BadgeCheck className="w-3.5 h-3.5" />} label="Rating" value={`${detail.averageRating.toFixed(1)} (${detail.totalReviews} ulasan)`} />
                                    <StatRow icon={<Clock3 className="w-3.5 h-3.5" />}   label="Daftar"  value={formatDate(detail.createdAt)} />
                                    <StatRow icon={<Coins className="w-3.5 h-3.5" />}    label="Tarif"   value={`${formatCurrency(detail.hourlyRate, detail.currency)} / jam`} />
                                    <StatRow icon={<Mail className="w-3.5 h-3.5" />}     label="ID User" value={`${detail.userId}`} />
                                    <StatRow icon={<PlayCircle className="w-3.5 h-3.5" />} label="Mode"  value={`${detail.isOnline ? "Online" : "-"}${detail.isOnline && detail.isOffline ? " / " : ""}${detail.isOffline ? "Offline" : ""}`} />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

function InfoCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
    return (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">{icon}</div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">{title}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{body}</p>
        </div>
    )
}

function StatRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                {icon}
                {label}
            </span>
            <span className="text-gray-900 dark:text-white font-semibold text-right">{value || "-"}</span>
        </div>
    )
}

export default function GuruDetailPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <GuruDetailContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
