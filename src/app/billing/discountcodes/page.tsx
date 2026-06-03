"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, ChevronLeft, ChevronRight, Tag, Users,
    ChevronsUpDown, CheckCircle2, XCircle, Copy,
    Trash2, Plus, Pencil, Zap,
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}
function isExpired(until: string) { return new Date(until) < new Date() }
function isUpcoming(from: string) { return new Date(from) > new Date() }

// ── Types ──────────────────────────────────────────────────────────────────────
interface DiscountCode {
    id: number
    code: string
    name: string
    description: string
    deskripsi: string
    type: string
    value: number
    minOrderAmount: number
    maxDiscountAmount: number
    usageLimit: number
    usageCount: number
    validFrom: string
    validUntil: string
    isActive: boolean
    isReferral: boolean
    trainerId: number | null
    trainerName: string | null
    campaignId: string | null
    createdBy: string
    createdAt: string
    _deleted?: boolean
}
type FilterStatus = "all" | "active" | "inactive" | "referral"
type FilterType = "all" | "percentage" | "fixed"
type SortField = "code" | "value" | "usageCount" | "validUntil" | "createdAt"

const PAGE_SIZE = 6

interface FormState {
    code: string
    name: string
    description: string
    deskripsi: string
    type: "percentage" | "fixed"
    value: string
    usageLimit: string
    minOrderAmount: string
    maxDiscountAmount: string
    validFrom: string
    validUntil: string
    isReferral: boolean
}

const EMPTY_FORM: FormState = {
    code: "", name: "", description: "", deskripsi: "", type: "percentage",
    value: "", usageLimit: "100", minOrderAmount: "0",
    maxDiscountAmount: "999999", validFrom: "", validUntil: "",
    isReferral: false,
}

function genId() { return Date.now() }

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, message, endpoint, onConfirm, onCancel }: {
    open: boolean; title: string; message: string; endpoint: string
    onConfirm: () => void; onCancel: () => void
}) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{message}</p>

                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Batal</button>
                    <button onClick={onConfirm} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Konfirmasi</button>
                </div>
            </div>
        </div>
    )
}

// ── Code Form Modal ────────────────────────────────────────────────────────────
function CodeFormModal({ open, editItem, onSave, onClose }: {
    open: boolean
    editItem: DiscountCode | null
    onSave: (form: FormState, isEdit: boolean) => void
    onClose: () => void
}) {
    const [form, setForm] = useState<FormState>(EMPTY_FORM)

    // sync form when editItem changes
    useMemo(() => {
        if (editItem) {
            setForm({
                code: editItem.code,
                name: editItem.name || editItem.description,
                description: editItem.description,
                deskripsi: editItem.deskripsi || "",
                type: editItem.type as "percentage" | "fixed",
                value: String(editItem.value),
                usageLimit: String(editItem.usageLimit),
                minOrderAmount: String(editItem.minOrderAmount),
                maxDiscountAmount: String(editItem.maxDiscountAmount),
                validFrom: editItem.validFrom.slice(0, 10),
                validUntil: editItem.validUntil.slice(0, 10),
                isReferral: editItem.isReferral,
            })
        } else {
            setForm(EMPTY_FORM)
        }
    }, [editItem, open])

    if (!open) return null

    function f(key: keyof FormState, val: string | boolean) {
        setForm(prev => ({ ...prev, [key]: val }))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                            {editItem ? "Edit Kode Diskon" : "Buat Kode Diskon Baru"}
                        </h3>

                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl font-light">×</button>
                </div>
                <div className="px-6 py-4 space-y-4">
                    {/* Row 1: Kode Promo + Nama Promo */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Kode Promo *</label>
                            <input value={form.code} onChange={e => f("code", e.target.value.toUpperCase())}
                                placeholder="HEMAT25, RAMADAN2026..."
                                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Promo *</label>
                            <input value={form.name} onChange={e => f("name", e.target.value)}
                                placeholder="Diskon Ramadan 2026"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    {/* Row 1b: Deskripsi (textarea) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                        <textarea value={form.deskripsi} onChange={e => f("deskripsi", e.target.value)}
                            rows={2}
                            placeholder="Isi deskripsi singkat tentang promo ini..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-white resize-none" />
                    </div>
                    {/* Row 2: Tipe Diskon + Nilai */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipe Diskon</label>
                            <select value={form.type} onChange={e => f("type", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white">
                                <option value="percentage">Persentase (%)</option>
                                <option value="fixed">Nominal (Rp)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Nilai {form.type === "percentage" ? "(%)" : "(Rp)"}
                            </label>
                            <input type="number" value={form.value} onChange={e => f("value", e.target.value)}
                                placeholder={form.type === "percentage" ? "15" : "50000"}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    {/* Row 3: Maks. Diskon (full width) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Maks. Diskon (IDR)</label>
                        <input type="number" value={form.maxDiscountAmount} onChange={e => f("maxDiscountAmount", e.target.value)}
                            placeholder="Kosongkan jika tidak ada batas"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                    </div>
                    {/* Row 4: Min. Pembelian + Batas Penggunaan */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Min. Pembelian (Rp)</label>
                            <input type="number" value={form.minOrderAmount} onChange={e => f("minOrderAmount", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Batas Penggunaan</label>
                            <input type="number" value={form.usageLimit} onChange={e => f("usageLimit", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    {/* Row 5: Berlaku Dari + Berlaku Sampai */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Dari</label>
                            <input type="date" value={form.validFrom} onChange={e => f("validFrom", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Berlaku Sampai</label>
                            <input type="date" value={form.validUntil} onChange={e => f("validUntil", e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Batal</button>
                    <button onClick={() => onSave(form, !!editItem)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors">
                        {editItem ? "Simpan Perubahan" : "save"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Bulk Generate Modal ────────────────────────────────────────────────────────
function BulkModal({ open, onClose, onGenerate }: { open: boolean; onClose: () => void; onGenerate: (prefix: string, count: number, discount: number) => void }) {
    const [prefix, setPrefix] = useState("BULK")
    const [count, setCount] = useState(5)
    const [discount, setDiscount] = useState(10)
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Bulk Generate Kode</h3>

                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-light">×</button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Prefix Kode</label>
                        <input value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Jumlah Kode</label>
                            <input type="number" min={1} max={50} value={count} onChange={e => setCount(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Diskon (%)</label>
                            <input type="number" min={1} max={100} value={discount} onChange={e => setDiscount(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 justify-end mt-5">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Batal</button>
                    <button onClick={() => onGenerate(prefix, count, discount)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors">
                        <Zap className="w-3.5 h-3.5" /> Generate {count} Kode
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main Content ───────────────────────────────────────────────────────────────
function DiscountCodesContent() {
    const [codes, setCodes] = useState<DiscountCode[]>(() => dummyData.discountCodes as DiscountCode[])
    const [search, setSearch] = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")
    const [typeFilter, setTypeFilter] = useState<FilterType>("all")
    const [sortField, setSortField] = useState<SortField>("code")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
    const [page, setPage] = useState(1)
    const [copiedId, setCopiedId] = useState<number | null>(null)

    // Modals
    const [formOpen, setFormOpen] = useState(false)
    const [editItem, setEditItem] = useState<DiscountCode | null>(null)
    const [bulkOpen, setBulkOpen] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState<DiscountCode | null>(null)

    const liveCodes = codes.filter(c => !c._deleted)

    const stats = useMemo(() => ({
        total: liveCodes.length,
        active: liveCodes.filter(c => c.isActive).length,
        usageRate: liveCodes.length > 0
            ? Math.round((liveCodes.reduce((s, c) => s + c.usageCount, 0) / liveCodes.reduce((s, c) => s + c.usageLimit, 0)) * 100)
            : 0,
        totalUsage: liveCodes.reduce((s, c) => s + c.usageCount, 0),
    }), [liveCodes])

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return liveCodes
            .filter(c => {
                const matchSearch = !q || c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || (c.trainerName?.toLowerCase().includes(q) ?? false)
                const matchStatus = statusFilter === "all" || (statusFilter === "active" && c.isActive) || (statusFilter === "inactive" && !c.isActive) || (statusFilter === "referral" && c.isReferral)
                const matchType = typeFilter === "all" || c.type === typeFilter
                return matchSearch && matchStatus && matchType
            })
            .sort((a, b) => {
                let av: number | string = a.code
                let bv: number | string = b.code
                if (sortField === "value") { av = a.value; bv = b.value }
                else if (sortField === "usageCount") { av = a.usageCount; bv = b.usageCount }
                else if (sortField === "validUntil") { av = a.validUntil; bv = b.validUntil }
                if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
                return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
            })
    }, [liveCodes, search, statusFilter, typeFilter, sortField, sortDir])

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
    function handleCopy(id: number, code: string) {
        navigator.clipboard.writeText(code)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 1500)
    }
    function getCodeStatus(c: DiscountCode) {
        if (!c.isActive) return { label: "Nonaktif", color: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" }
        if (isExpired(c.validUntil)) return { label: "Kedaluwarsa", color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" }
        if (isUpcoming(c.validFrom)) return { label: "Terjadwal", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" }
        if (c.usageCount >= c.usageLimit) return { label: "Habis", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" }
        return { label: "Aktif", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" }
    }

    // ── CRUD handlers ──────────────────────────────────────────────────────────
    function handleSaveForm(form: FormState, isEdit: boolean) {
        if (!form.code || !form.name || !form.value || !form.validFrom || !form.validUntil) {
            showToast({ type: "info", title: "Form tidak lengkap", message: "Kode Promo, Nama Promo, nilai diskon, dan tanggal berlaku wajib diisi." })
            return
        }
        if (isEdit && editItem) {
            setCodes(prev => prev.map(c => c.id === editItem.id ? {
                ...c, code: form.code, name: form.name, description: form.name, deskripsi: form.deskripsi, type: form.type,
                value: Number(form.value), usageLimit: Number(form.usageLimit),
                minOrderAmount: Number(form.minOrderAmount), maxDiscountAmount: Number(form.maxDiscountAmount),
                validFrom: form.validFrom, validUntil: form.validUntil, isReferral: form.isReferral,
            } : c))
            showToast({ type: "success", title: "Kode berhasil diupdate", message: `Kode "${form.code}" telah disimpan.`, endpoint: `PUT /api/v1/DiscountCodes/${editItem.id}` })
        } else {
            const existing = liveCodes.find(c => c.code === form.code)
            if (existing) { showToast({ type: "info", title: "Kode sudah ada", message: `"${form.code}" sudah digunakan.` }); return }
            const newCode: DiscountCode = {
                id: genId(), code: form.code, name: form.name, description: form.name, deskripsi: form.deskripsi,
                type: form.type, value: Number(form.value), usageLimit: Number(form.usageLimit),
                usageCount: 0, minOrderAmount: Number(form.minOrderAmount),
                maxDiscountAmount: Number(form.maxDiscountAmount), validFrom: form.validFrom + "T00:00:00Z",
                validUntil: form.validUntil + "T00:00:00Z", isReferral: form.isReferral,
                isActive: true, createdBy: "Admin", trainerId: null, trainerName: null, campaignId: null,
                createdAt: new Date().toISOString(),
            }
            setCodes(prev => [newCode, ...prev])
            showToast({ type: "success", title: "Kode berhasil dibuat", message: `"${form.code}" ditambahkan ke daftar.`, endpoint: "POST /api/v1/DiscountCodes" })
        }
        setFormOpen(false)
        setEditItem(null)
    }

    function handleToggle(c: DiscountCode) {
        const next = !c.isActive
        setCodes(prev => prev.map(x => x.id === c.id ? { ...x, isActive: next } : x))
        if (next) {
            showToast({ type: "success", title: `Kode "${c.code}" diaktifkan`, endpoint: `POST /api/v1/DiscountCodes/${c.id}/activate` })
        } else {
            showToast({ type: "info", title: `Kode "${c.code}" dijeda`, endpoint: `POST /api/v1/DiscountCodes/${c.id}/pause` })
        }
    }

    function handleDelete(c: DiscountCode) {
        setCodes(prev => prev.map(x => x.id === c.id ? { ...x, _deleted: true } : x))
        setConfirmDelete(null)
        showToast({ type: "error", title: `Kode "${c.code}" dihapus`, message: "Data kode telah dihapus dari sistem.", endpoint: `DELETE /api/v1/DiscountCodes/${c.id}` })
    }

    function handleBulkGenerate(prefix: string, count: number, discount: number) {
        const now = new Date()
        const until = new Date(now); until.setMonth(until.getMonth() + 3)
        const generated: DiscountCode[] = Array.from({ length: count }, (_, i) => ({
            id: genId() + i, code: `${prefix}${String(i + 1).padStart(3, "0")}`,
            name: `${prefix} Bulk #${i + 1}`,
            description: `${prefix} Bulk #${i + 1}`,
            deskripsi: `Kode bulk generate — diskon ${discount}%`,
            type: "percentage",
            value: discount, usageLimit: 50, usageCount: 0, minOrderAmount: 0, maxDiscountAmount: 999999,
            validFrom: now.toISOString(), validUntil: until.toISOString(), isReferral: false,
            isActive: true, createdBy: "Admin (Bulk)", trainerId: null, trainerName: null, campaignId: `BULK-${prefix}`,
            createdAt: now.toISOString(),
        }))
        setCodes(prev => [...generated, ...prev])
        setBulkOpen(false)
        showToast({ type: "success", title: `${count} kode berhasil digenerate`, message: `Prefix: ${prefix} — Diskon ${discount}%`, endpoint: "POST /api/v1/DiscountCodes/bulk-generate" })
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-950 p-4">
            <ToastContainer />
            <ConfirmModal
                open={!!confirmDelete}
                title={`Hapus kode "${confirmDelete?.code}"?`}
                message="Kode yang sudah dihapus tidak bisa dikembalikan. Pengguna yang belum memakai kode ini tidak bisa menggunakannya lagi."
                endpoint={`DELETE /api/v1/DiscountCodes/${confirmDelete?.id}`}
                onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
                onCancel={() => setConfirmDelete(null)}
            />
            <CodeFormModal open={formOpen} editItem={editItem} onSave={handleSaveForm} onClose={() => { setFormOpen(false); setEditItem(null) }} />
            <BulkModal open={bulkOpen} onClose={() => setBulkOpen(false)} onGenerate={handleBulkGenerate} />

            <div className="max-w-[1600px] mx-auto space-y-4">



                {/* Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Kode", value: stats.total, icon: Tag, color: "violet", isPercent: false },
                        { label: "Aktif", value: stats.active, icon: CheckCircle2, color: "emerald", isPercent: false },
                        { label: "Tingkat Penggunaan", value: stats.usageRate, icon: Zap, color: "orange", isPercent: true },
                        { label: "Total Pemakaian", value: stats.totalUsage, icon: Users, color: "blue", isPercent: false },
                    ].map(card => {
                        const Icon = card.icon
                        const clr: Record<string, { bg: string; icon: string }> = {
                            violet: { bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-600 dark:text-violet-400" },
                            emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: "text-emerald-600 dark:text-emerald-400" },
                            orange: { bg: "bg-orange-100 dark:bg-orange-900/20", icon: "text-orange-500 dark:text-orange-400" },
                            blue: { bg: "bg-blue-100 dark:bg-blue-900/20", icon: "text-blue-600 dark:text-blue-400" },
                        }
                        return (
                            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-9 h-9 rounded-lg ${clr[card.color].bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-4 h-4 ${clr[card.color].icon}`} />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {card.value}{card.isPercent ? "%" : ""}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {/* Search + Button Row */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center w-full md:max-w-md h-10 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-emerald-400">
                        <Search className="ml-3 h-4 w-4 text-gray-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Cari kode atau nama promo..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    setSearch(searchInput);
                                    setPage(1);
                                }
                            }}
                            className="w-full h-full px-3 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-700 dark:text-gray-200"
                        />
                        <button
                            onClick={() => { setSearch(searchInput); setPage(1); }}
                            className="h-full px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors flex items-center gap-2"
                        >
                            <Search className="w-4 h-4" /> Cari
                        </button>
                    </div>
                    <button onClick={() => { setEditItem(null); setFormOpen(true) }}
                        className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Buat Promo
                    </button>
                </div>

                {/* Filter Tabs (MagangHub style) */}
                <div className="flex items-center gap-6 border-b border-gray-100 dark:border-gray-800">
                    {([
                        { key: "all", label: "Semua", count: stats.total },
                        { key: "active", label: "Aktif", count: stats.active },
                        { key: "inactive", label: "Nonaktif", count: liveCodes.filter(c => !c.isActive).length },
                    ] as { key: FilterStatus; label: string; count: number }[]).map(tab => (
                        <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                            className={`flex items-center gap-1.5 pb-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${statusFilter === tab.key
                                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                }`}>
                            {tab.label}
                            <span className={`text-xs font-bold ${statusFilter === tab.key ? "text-emerald-500" : "text-gray-400"
                                }`}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort("code")}>
                                        Kode Promo <SortIcon field="code" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3">Nama</th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort("value")}>
                                        Diskon <SortIcon field="value" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort("usageCount")}>
                                        Penggunaan <SortIcon field="usageCount" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap cursor-pointer select-none" onClick={() => handleSort("validUntil")}>
                                        Berlaku <SortIcon field="validUntil" />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada kode diskon ditemukan</p>
                                        </td>
                                    </tr>
                                ) : paged.map(c => {
                                    const st = getCodeStatus(c)
                                    const usagePercent = Math.min(100, Math.round((c.usageCount / c.usageLimit) * 100))
                                    const barColor = usagePercent >= 100 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-emerald-500"
                                    return (
                                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                            {/* Kode Promo */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <code className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">{c.code}</code>
                                                    <button onClick={() => handleCopy(c.id, c.code)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-emerald-500 transition-all flex-shrink-0" title="Salin kode">
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                    {copiedId === c.id && <span className="text-[10px] text-emerald-500 font-semibold animate-pulse">Disalin!</span>}
                                                </div>
                                            </td>
                                            {/* Nama */}
                                            <td className="px-4 py-3 max-w-[220px]">
                                                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{c.name || c.description}</p>
                                                {(c.deskripsi || (c.name && c.description !== c.name)) && (
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{c.deskripsi || c.description}</p>
                                                )}
                                            </td>
                                            {/* Diskon */}
                                            <td className="px-4 py-3">
                                                {c.isReferral ? (
                                                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">{c.value}%</span>
                                                ) : c.type === "percentage" ? (
                                                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{c.value}%</span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">{formatRupiah(c.value)}</span>
                                                )}
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${st.color}`}>
                                                    {st.label === "Aktif" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                    {st.label}
                                                </span>
                                            </td>
                                            {/* Penggunaan */}
                                            <td className="px-4 py-3 min-w-[140px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{c.usageCount}/{c.usageLimit}</span>
                                                    <span className="text-[10px] text-gray-400">{usagePercent}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
                                                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${usagePercent}%` }} />
                                                </div>
                                            </td>
                                            {/* Berlaku */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <p className="text-xs text-gray-600 dark:text-gray-400">{formatDate(c.validFrom)} → {formatDate(c.validUntil)}</p>
                                            </td>
                                            {/* Aksi */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditItem(c); setFormOpen(true) }}
                                                        className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors" title="Edit">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setConfirmDelete(c)}
                                                        className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors" title="Hapus">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Menampilkan {filtered.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
                        </span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${p === page ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                    {p}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
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

export default function DiscountCodesPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <DiscountCodesContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
