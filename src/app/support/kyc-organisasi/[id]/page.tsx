"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useKycOrganisasi, ApiOrg, OrgMember } from "@/hooks/use-kyc-organisasi"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    ChevronLeft, CheckCircle2, MapPin, Calendar, Users, Building,
    Building2, CheckCircle, Mail, Phone, Globe, FileText, Check, Eye, Star
} from "lucide-react"
import DUMMY_TEACHERS from "@/data/dummy-teachers.json"

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
    aktif: { label: "Aktif", cls: "bg-emerald-50 text-emerald-600 border border-emerald-200", icon: CheckCircle2 },
    nonaktif: { label: "Nonaktif", cls: "bg-red-50 text-red-600 border border-red-200", icon: CheckCircle2 }, // Using CheckCircle2 as fallback
}

const STATUS_BADGE: Record<string, string> = {
    aktif: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    nonaktif: "bg-red-100 text-red-600 border border-red-200",
}

// ─── DocCard Component ────────────────────────────────────────────────────────
function DocCard({
    nama,
    file,
    hasValidasi,
    iconType = "file"
}: {
    nama: string
    file?: string
    hasValidasi?: boolean
    iconType?: "user" | "building" | "file"
}) {
    const Icon = iconType === "user" ? Users : iconType === "building" ? Building2 : FileText

    return (
        <div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 transition-all hover:border-emerald-200 hover:shadow-sm">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm flex items-center justify-center flex-shrink-0 text-emerald-500">
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 pt-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={nama}>{nama}</p>
                    <p className="text-[11px] text-gray-500 font-medium">Dokumen Pendukung</p>
                </div>
            </div>

            <div className="mt-auto space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-500 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Validasi Sistem
                    </span>
                    <span className={hasValidasi ? "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded" : "text-gray-400 bg-gray-100 px-2 py-0.5 rounded"}>
                        {hasValidasi ? "Lengkap" : "Manual"}
                    </span>
                </div>

                <a
                    href={file || "#"}
                    target={file ? "_blank" : undefined}
                    rel="noreferrer"
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all border
                        ${file
                            ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-500 hover:text-emerald-600 shadow-sm"
                            : "bg-gray-100 dark:bg-gray-800 border-transparent text-gray-400 cursor-not-allowed"
                        }`}
                >
                    <Eye className="w-3.5 h-3.5" />
                    {file ? "Lihat Dokumen" : "Tidak Ada Dokumen"}
                </a>
            </div>
        </div>
    )
}

function ProfileContent() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const orgId = params?.id

    const {
        detailOrg: org,
        fetchDetail,
        detailLoading,
        orgMembers,
        orgMembersLoading,
        fetchOrgMembers,
        verifyOrg,
        rejectOrg,
    } = useKycOrganisasi()

    const [activeTab, setActiveTab] = useState<"profil" | "guru" | "galeri">("profil")
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        if (orgId) {
            fetchDetail(orgId)
        }
    }, [orgId, fetchDetail])

    useEffect(() => {
        if (activeTab === "guru" && orgId) {
            fetchOrgMembers(orgId)
        }
    }, [activeTab, orgId, fetchOrgMembers])

    const handleVerify = async () => {
        if (!org) return
        setVerifying(true)
        await verifyOrg(org.id)
        setVerifying(false)
    }

    const handleReject = async () => {
        if (!org) return
        const reason = window.prompt("Masukkan alasan penolakan:");
        if (!reason) return;
        setVerifying(true)
        await rejectOrg(org.id, reason)
        setVerifying(false)
    }

    if (detailLoading && !org) {
        return (
            <div className="flex h-[80vh] items-center justify-center text-emerald-500 font-medium">
                <div className="animate-spin mr-3 rounded-full h-5 w-5 border-t-2 border-b-2 border-emerald-500"></div>
                Memuat Profil Organisasi...
            </div>
        )
    }

    if (!org && !detailLoading) {
        return (
            <div className="flex flex-col h-[80vh] items-center justify-center">
                <p className="mb-4 text-gray-500 font-medium text-lg">Organisasi tidak ditemukan</p>
                <button
                    onClick={() => router.push('/support/kyc-organisasi')}
                    className="flex items-center gap-2 text-emerald-500 hover:text-emerald-600 hover:underline font-semibold"
                >
                    <ChevronLeft className="w-4 h-4" /> Kembali ke Daftar
                </button>
            </div>
        )
    }

    if (!org) return null

    const tglBerdiri = org.foundedDate ? new Date(org.foundedDate).getFullYear() : "-"

    return (
        <div className="relative w-full h-full bg-gray-50 dark:bg-gray-950 flex flex-col min-h-screen">

            {/* BACK BUTTON */}
            <button
                onClick={() => router.push('/support/kyc-organisasi')}
                className="absolute top-4 left-4 z-20 flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-sm font-semibold rounded-full transition-colors"
            >
                <ChevronLeft className="w-4 h-4" /> Kembali ke Daftar
            </button>

            {/* BANNER SECTION */}
            <div className="relative w-full h-64 md:h-80 bg-emerald-900 overflow-hidden flex-shrink-0">
                {org.banner ? (
                    <img src={org.banner} alt="Banner" className="w-full h-full object-cover opacity-60" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-emerald-800 to-teal-900 opacity-90 flex items-center justify-center">
                        <span className="text-white/20 text-6xl font-bold uppercase tracking-widest">{org.name.slice(0, 8)}</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50/20 to-transparent dark:from-gray-950 dark:via-gray-950/20" />
            </div>

            {/* PROFILE HEADER & INFO */}
            <div className="max-w-[1200px] w-full mx-auto px-6 relative -mt-24 z-10 flex-shrink-0">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                    {/* Logo */}
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl md:rounded-[32px] bg-white dark:bg-gray-900 border-4 border-white dark:border-gray-950 shadow-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                        {org.logo ? (
                            <img src={org.logo} alt={org.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-5xl font-black text-emerald-600">{String(org.name || "O").charAt(0).toUpperCase()}</span>
                        )}
                    </div>

                    {/* Title Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white drop-shadow-sm">{org.name}</h1>
                            {org.isVerified === 1 && (
                                <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-100 dark:fill-blue-900" />
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300 font-medium mb-4">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wide">
                                {org.categoryName || org.category || org.type || "Organisasi"}
                            </span>
                            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {org.city || "Kota Tidak Diketahui"}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" /> Berdiri {tglBerdiri}</span>
                            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-400" /> {org.memberCount || 0} Anggota</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-4 md:mt-0 w-full md:w-auto">
                        {org.isVerified === 2 && (
                            <span className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-xl text-sm border border-red-200 flex items-center gap-2">
                                Ditolak
                            </span>
                        )}
                        {org.isVerified === 1 ? (
                            <span className="px-4 py-2 bg-blue-100 text-blue-600 font-bold rounded-xl text-sm border border-blue-200 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Organisasi Unggulan
                            </span>
                        ) : (
                            <button
                                onClick={handleVerify}
                                disabled={verifying}
                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Jadikan Unggulan
                            </button>
                        )}
                    </div>
                </div>
            </div>


            {/* NAVIGATION TABS */}
            <div className="max-w-[1200px] w-full mx-auto px-6 mt-6 flex-shrink-0">
                <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-px">
                    {[
                        { id: "profil", label: "Profil", icon: Building },
                        { id: "guru", label: "Daftar Guru", icon: Users },
                        { id: "galeri", label: "Galeri", icon: Globe },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-xl transition-all border-b-2 ${activeTab === t.id
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                }`}
                        >
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="max-w-[1200px] w-full mx-auto px-6 py-8 flex-1">

                {/* TAB: PROFIL */}
                {activeTab === "profil" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Deskripsi */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                    <Building2 className="w-4 h-4 text-emerald-500" /> Tentang Organisasi
                                </h3>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {org.description || "Belum ada deskripsi yang ditambahkan untuk organisasi ini."}
                                </p>
                            </div>

                            {/* Visi & Misi */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                        <CheckCircle className="w-4 h-4 text-orange-500" /> Visi
                                    </h3>
                                    <p className="text-sm italic text-gray-700 dark:text-gray-300">
                                        "Menghadirkan pesona Al-Qur'an di setiap keluarga Muslim Indonesia." (Contoh Visi)
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                        <CheckCircle className="w-4 h-4 text-blue-500" /> Misi
                                    </h3>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                                        <li>Mensosialisasikan pentingnya membaca Al-Qur'an.</li>
                                        <li>Menyelenggarakan kelas tahsin dan tahfidz.</li>
                                        <li>Membina komunitas pecinta Al-Qur'an.</li>
                                        <li>Mengembangkan metode pembelajaran inovatif.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Dokumen */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                    <FileText className="w-4 h-4 text-emerald-500" /> Dokumen Legalitas
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DocCard
                                        nama="Dokumen Verifikasi"
                                        file={org.verificationDocs || undefined}
                                        hasValidasi={!!org.verificationDocs}
                                        iconType="building"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            {/* Lokasi */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4 text-red-500" /> Lokasi Organisasi
                                </h3>
                                <p className="text-xs text-gray-500 mb-4">Lokasi terdaftar pada sistem.</p>
                                <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4 flex items-center justify-center border border-gray-200 dark:border-gray-700 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Bandung&zoom=13&size=400x200&sensor=false')] bg-cover bg-center opacity-50 grayscale" />
                                    <MapPin className="w-8 h-8 text-red-500 relative z-10" />
                                </div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{org.city || "Alamat Tidak Diketahui"}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{org.address || "Belum ada detail alamat lengkap."}</p>
                            </div>

                            {/* Kontak */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Informasi Kontak</h3>
                                <div className="space-y-4">
                                    {org.email && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center"><Mail className="w-4 h-4 text-blue-500" /></div>
                                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{org.email}</span>
                                        </div>
                                    )}
                                    {org.phone && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center"><Phone className="w-4 h-4 text-emerald-500" /></div>
                                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{org.phone}</span>
                                        </div>
                                    )}
                                    {org.website && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center"><Globe className="w-4 h-4 text-purple-500" /></div>
                                            <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline font-medium">{org.website}</a>
                                        </div>
                                    )}
                                    {!org.email && !org.phone && !org.website && (
                                        <p className="text-sm text-gray-500 italic">Informasi kontak tidak tersedia.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: GURU */}
                {activeTab === "guru" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Daftar Pengajar */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 min-h-[400px]">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">Daftar Pengajar</h3>

                                {orgMembersLoading ? (
                                    <div className="flex justify-center py-20 text-emerald-500">Memuat data pengajar...</div>
                                ) : orgMembers.length === 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {DUMMY_TEACHERS.map((teacher, idx) => (
                                            <div key={teacher.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${idx === 0 ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800'}`}>
                                                <div className="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                                    <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap gap-1 mb-1.5">
                                                        {teacher.skills.map(skill => (
                                                            <span key={skill} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate mb-1">{teacher.name}</p>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{teacher.rating}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 truncate">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            <span className="truncate">{teacher.location}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {orgMembers.map((member, idx) => (
                                            <div key={member.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${idx === 0 ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800'}`}>
                                                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex flex-shrink-0 items-center justify-center text-emerald-600 font-bold text-lg">
                                                    {member.userName?.charAt(0).toUpperCase() || "U"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{member.role || "Pengajar"}</p>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate mb-1">{member.userName || "Tanpa Nama"}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Bergabung: {new Date(member.joinedAt).toLocaleDateString("id-ID")}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Lokasi Organisasi */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4 text-emerald-500" /> Lokasi Organisasi
                                </h3>
                                <p className="text-xs text-gray-500 mb-4">Kunjungi kami untuk informasi lebih lanjut.</p>
                                <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4 flex items-center justify-center border border-gray-200 dark:border-gray-700 overflow-hidden relative group cursor-pointer">
                                    <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Bandung&zoom=13&size=400x200&sensor=false')] bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-white/20 group-hover:bg-white/0 transition-colors" />
                                    <div className="relative z-10 bg-white dark:bg-gray-900 shadow-lg p-2 rounded-full mb-4">
                                        <MapPin className="w-6 h-6 text-red-500" />
                                    </div>
                                    <div className="absolute top-2 left-2 right-2 flex justify-between">
                                        <span className="bg-white/90 text-blue-600 text-[10px] font-bold px-2 py-1 rounded shadow-sm hover:underline">Buka di Maps</span>
                                        <div className="flex gap-1">
                                            <span className="bg-white/90 p-1 rounded shadow-sm cursor-pointer hover:bg-gray-50"><ChevronLeft className="w-3 h-3 text-gray-600" /></span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{org.city || "Bandung"}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{org.address || "Jl. Dago No. 123, Coblong, Bandung"}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: GALERI */}
                {activeTab === "galeri" && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">Galeri Aktivitas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="aspect-[4/3] rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-xs border border-gray-200 dark:border-gray-700">
                                    Foto/Media {i}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function ProfileOrganisasiPage() {
    return (
        <I18nProvider>
            <DashboardLayout>
                <ProfileContent />
            </DashboardLayout>
        </I18nProvider>
    )
}
