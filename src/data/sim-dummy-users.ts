// --- sim-dummy-users.ts ---------------------------------------------------
// Sumber kebenaran tunggal untuk semua data dummy user & trainer.
// userId  889977665544101-889977665544110 = Member/User
// trainerId 301-305 = Trainer/Guru

export interface SimUserProfile {
    id: number
    name: string
    username: string
    email: string
    hp?: string
    gender?: "m" | "f"
    dob?: string
    job?: string
    timezone?: string
    bio?: string
    cityName?: string
    stateName?: string
    countryName?: string
    role: string
    isVerify: boolean
    isBlocked: boolean
    created_at: string
    avatar?: string
}

export interface SimTrainerProfile {
    id: number
    name: string
    email: string
    username: string
    avatar?: string
    specialty?: string
}

// --- USER REGISTRY (Member) ------------------------------------------------

export const SIM_USERS: Record<number, SimUserProfile> = {
    889977665544101: { id: 889977665544101, name: "Siti Rahmawati", username: "siti_rahma", email: "siti.rahma@example.com", hp: "081234567801", gender: "f", dob: "1995-03-12", job: "Guru SD", timezone: "Asia/Jakarta", bio: "Ibu rumah tangga yang ingin memperdalam ilmu Al-Quran.", cityName: "Jakarta Selatan", stateName: "DKI Jakarta", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-06-15T08:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=47" },
    889977665544102: { id: 889977665544102, name: "Ahmad Fauzan", username: "fauzan_ahmad", email: "ahmad.fauzan@example.com", hp: "081234567802", gender: "m", dob: "1992-07-20", job: "Wiraswasta", timezone: "Asia/Jakarta", bio: "Pengusaha muda yang aktif mengaji setiap hari.", cityName: "Bandung", stateName: "Jawa Barat", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-07-01T09:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=12" },
    889977665544103: { id: 889977665544103, name: "Siti Aminah", username: "siti_a", email: "siti.aminah@yahoo.com", hp: "081234567803", gender: "f", dob: "1998-11-05", job: "Mahasiswa", timezone: "Asia/Makassar", bio: "Mahasiswi Teknik yang hobi menghafal Al-Quran.", cityName: "Makassar", stateName: "Sulawesi Selatan", countryName: "Indonesia", role: "member", isVerify: false, isBlocked: false, created_at: "2025-08-10T10:30:00.000Z", avatar: "https://i.pravatar.cc/150?img=48" },
    889977665544104: { id: 889977665544104, name: "Budi Santoso", username: "budi_santoso", email: "budi.santoso@email.com", hp: "081234567804", gender: "m", dob: "1988-09-30", job: "PNS", timezone: "Asia/Jakarta", bio: "Pegawai negeri yang ingin belajar tajwid lebih dalam.", cityName: "Surabaya", stateName: "Jawa Timur", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-05-20T07:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=33" },
    889977665544105: { id: 889977665544105, name: "Dewi Rahayu", username: "dewi_rahayu", email: "dewi.rahayu@gmail.com", hp: "081234567805", gender: "f", dob: "1993-04-18", job: "Karyawan Swasta", timezone: "Asia/Jakarta", bio: "Ingin memperbaiki bacaan Quran sejak kecil dan mengajari keluarga.", cityName: "Yogyakarta", stateName: "DI Yogyakarta", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-04-05T06:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=44" },
    889977665544106: { id: 889977665544106, name: "Nur Hidayah", username: "nur_hidayah", email: "nur.hidayah@example.com", hp: "081234567806", gender: "f", dob: "2000-01-25", job: "Freelancer", timezone: "Asia/Jakarta", bio: "Desainer grafis yang ingin lebih dekat dengan Al-Quran.", cityName: "Semarang", stateName: "Jawa Tengah", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-09-01T08:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=49" },
    889977665544107: { id: 889977665544107, name: "Nia Hidayati", username: "nia_hidayati", email: "nia.hidayati@mail.com", hp: "081234567807", gender: "f", dob: "1996-08-10", job: "Guru Ngaji", timezone: "Asia/Jakarta", bio: "Guru ngaji yang ingin meningkatkan kualitas mengajar Al-Quran.", cityName: "Bekasi", stateName: "Jawa Barat", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-10-10T07:30:00.000Z", avatar: "https://i.pravatar.cc/150?img=46" },
    889977665544108: { id: 889977665544108, name: "Farid Al-Amin", username: "farid_alamin", email: "farid.alamin@edu.id", hp: "081234567808", gender: "m", dob: "1993-06-15", job: "Dokter", timezone: "Asia/Medan", bio: "Dokter yang rutin mengaji setelah jam praktik.", cityName: "Medan", stateName: "Sumatera Utara", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-03-20T06:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=15" },
    889977665544109: { id: 889977665544109, name: "Halimah Tussa'diyah", username: "halimah_ts", email: "halimah.ts@gmail.com", hp: "081234567809", gender: "f", dob: "1985-12-08", job: "Ibu Rumah Tangga", timezone: "Asia/Jakarta", bio: "Ingin memperbaiki bacaan Al-Quran untuk mengajari anak-anak.", cityName: "Bogor", stateName: "Jawa Barat", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-11-05T09:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=52" },
    889977665544110: { id: 889977665544110, name: "Muhammad Yusuf", username: "m_yusuf", email: "m.yusuf@qurani.id", hp: "081234567810", gender: "m", dob: "1997-02-14", job: "Software Engineer", timezone: "Asia/Jakarta", bio: "Programmer yang menyempatkan waktu untuk belajar tajwid setiap malam.", cityName: "Depok", stateName: "Jawa Barat", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2026-01-12T10:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=57" },
    889977665544111: { id: 889977665544111, name: "Fauzia Nurrohma", username: "fauzianurrohma", email: "fauzia.nurrohma@example.com", hp: "081234567811", gender: "f", dob: "2001-05-17", job: "Mahasiswa", timezone: "Asia/Jakarta", bio: "Mahasiswi yang ingin memperdalam bacaan Al-Quran sejak dini.", cityName: "Tangerang", stateName: "Banten", countryName: "Indonesia", role: "member", isVerify: false, isBlocked: false, created_at: "2026-03-15T08:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=41" },
    889977665544112: { id: 889977665544112, name: "Rahma Aulia", username: "rahmaaulia", email: "rahma.aulia@example.com", hp: "081234567812", gender: "f", dob: "1999-09-23", job: "Karyawan Swasta", timezone: "Asia/Jakarta", bio: "Karyawati yang ingin belajar Al-Quran di sela kesibukan kerja.", cityName: "Jakarta Timur", stateName: "DKI Jakarta", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2026-03-20T09:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=43" }
}

// --- TRAINER REGISTRY (Guru) -----------------------------------------------

export const SIM_TRAINERS: Record<number, SimTrainerProfile> = {
    301: { id: 301, name: "Hasyim Asy'ari, Lc", email: "hasyim.asyari@qurani.id", username: "hasyim_asyari", avatar: "https://i.pravatar.cc/150?img=57", specialty: "Tahfidz & Tajwid" },
    302: { id: 302, name: "Indi Fitriani", email: "indi.fitriani@qurani.id", username: "indi_fitriani", avatar: "https://i.pravatar.cc/150?img=47", specialty: "Tilawah & Tartil" },
    303: { id: 303, name: "Iwan", email: "iwan.trainer@qurani.id", username: "iwan_trainer", avatar: "https://i.pravatar.cc/150?img=60", specialty: "Tahsin & Makhraj" },
    304: { id: 304, name: "Aisyah", email: "aisyah.trainer@qurani.id", username: "aisyah_trainer", avatar: "https://i.pravatar.cc/150?img=45", specialty: "Quran untuk Anak" },
    305: { id: 305, name: "Zain Al-Fattah", email: "zain.alfattah@qurani.id", username: "zain_alfattah", avatar: "https://i.pravatar.cc/150?img=30", specialty: "Tahfidz Intensif" }
}

// --- Helper functions -------------------------------------------------------

/** Ambil data user berdasarkan ID, return null jika tidak ditemukan */
export function getSimUser(userId: number | string): SimUserProfile | null {
    return SIM_USERS[Number(userId)] ?? null
}

/** Ambil data trainer berdasarkan ID */
export function getSimTrainer(trainerId: number | string): SimTrainerProfile | null {
    return SIM_TRAINERS[Number(trainerId)] ?? null
}

/** Ambil user object ringkas untuk dipakai di transaksi/entries */
export function getSimUserShort(userId: number | string) {
    const u = getSimUser(userId)
    if (!u) return { name: `User #${userId}`, username: undefined, email: undefined, avatar: undefined }
    return { name: u.name, username: u.username, email: u.email, avatar: u.avatar }
}
