import DUMMY_DATA from "@/data/dummy-wallet.json"

const PENDING_TOPUPS_KEY = "qurani_sim_pending_topups"
const TOPUP_HISTORY_KEY = "qurani_sim_topup_history"
const TRANSACTIONS_KEY = "qurani_sim_transactions_v3"
const WALLET_STATS_KEY = "qurani_sim_wallet_stats"
const WALLETS_KEY = "qurani_sim_wallets_v2"
const STORE_VERSION_KEY = "qurani_sim_wallet_version"
const STORE_VERSION = "v10-unique-ids"

const DUMMY_TRANSACTIONS = [
    // ─── RIWAYAT TOPUP (dari Wallet/Riwayat Topup) ───────────────────────────
    // Sumber: DUMMY_TOPUP_HISTORY — hanya yang sudah selesai/ditolak
    {
        id: "1785723002101",
        userId: 889977665544101,
        user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via VA Mandiri",
        amount: 300000,
        balanceBefore: 0,
        balanceAfter: 300000,
        status: "completed",
        paymentMethod: "VA Mandiri",
        referenceId: "EXT-TOP-001",
        createdAt: new Date(Date.now() - 345600000).toISOString()
    },
    {
        id: "1785723002102",
        userId: 889977665544102,
        user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via BCA Virtual Account",
        amount: 200000,
        balanceBefore: 0,
        balanceAfter: 200000,
        status: "completed",
        paymentMethod: "BCA Virtual Account",
        referenceId: "EXT-TOP-002",
        createdAt: new Date(Date.now() - 432000000).toISOString()
    },
    {
        id: "1785723002103",
        userId: 889977665544103,
        user: { name: "Siti Aminah", email: "siti.aminah@yahoo.com", username: "siti_a" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via Bank Transfer",
        amount: 250000,
        balanceBefore: 0,
        balanceAfter: 0,
        status: "rejected",
        paymentMethod: "Bank Transfer",
        referenceId: "TOPUP-REJ-001",
        createdAt: new Date(Date.now() - 518400000).toISOString()
    },
    {
        id: "1785723002104",
        userId: 889977665544104,
        user: { name: "Budi Santoso", email: "budi.santoso@email.com", username: "budi_santoso" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via GoPay",
        amount: 150000,
        balanceBefore: 0,
        balanceAfter: 150000,
        status: "completed",
        paymentMethod: "GoPay",
        referenceId: "EXT-TOP-004",
        createdAt: new Date(Date.now() - 604800000).toISOString()
    },
    {
        id: "1785723002105",
        userId: 889977665544105,
        user: { name: "Dewi Rahayu", email: "dewi.rahayu@gmail.com", username: "dewi_rahayu" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via Bank BNI",
        amount: 500000,
        balanceBefore: 0,
        balanceAfter: 500000,
        status: "completed",
        paymentMethod: "Bank BNI",
        referenceId: "EXT-TOP-005",
        createdAt: new Date(Date.now() - 691200000).toISOString()
    },

    // ─── RIWAYAT REFUND (dari Refund/Sudah Diproses) ─────────────────────────
    // Sumber: DUMMY_REFUND_PROCESSED di sim-billing-store.ts
    {
        id: "178572300250100000",
        userId: 889977665544106,
        user: { name: "Nur Hidayah", email: "nur.hidayah@example.com", username: "nur_hidayah" },
        type: 5,
        typeName: "Refund",
        description: "Refund disetujui — pesanan #3006 (0 dari 5 Pertemuan)",
        amount: 595000,
        balanceBefore: 0,
        balanceAfter: 595000,
        status: "completed",
        paymentMethod: "GoPay",
        referenceId: "REFUND-3006",
        createdAt: new Date(Date.now() - 691200000).toISOString()
    },
    {
        id: "178572300250200000",
        userId: 889977665544109,
        user: { name: "Halimah Tussa'diyah", email: "halimah.ts@gmail.com", username: "halimah_ts" },
        type: 5,
        typeName: "Refund",
        description: "Refund ditolak — pesanan #3009 (5 dari 10 Pertemuan)",
        amount: 352500,
        balanceBefore: 0,
        balanceAfter: 0,
        status: "rejected",
        paymentMethod: "GoPay",
        referenceId: "REFUND-3009",
        createdAt: new Date(Date.now() - 777600000).toISOString()
    },

    // ─── RIWAYAT WITHDRAW (dari Withdraw/Riwayat Withdraw) ───────────────────
    // Sumber: DUMMY_WITHDRAW_HISTORY di sim-billing-store.ts
    {
        id: "178572300270100000",
        userId: 889977665544101,
        user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke Bank BCA — 1234567890",
        amount: -1000000,
        balanceBefore: 1000000,
        balanceAfter: 0,
        status: "completed",
        paymentMethod: "Bank BCA",
        referenceId: "WD-REF-001",
        createdAt: new Date(Date.now() - 345600000).toISOString()
    },
    {
        id: "178572300270200000",
        userId: 889977665544102,
        user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke Mandiri — 0987654321",
        amount: -300000,
        balanceBefore: 300000,
        balanceAfter: 300000,
        status: "rejected",
        paymentMethod: "Bank Mandiri",
        referenceId: "WD-REJ-002",
        createdAt: new Date(Date.now() - 432000000).toISOString()
    },
    {
        id: "178572300270300000",
        userId: 889977665544103,
        user: { name: "Siti Aminah", email: "siti.aminah@example.com", username: "siti_a" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke Bank BNI — 1122334455",
        amount: -500000,
        balanceBefore: 500000,
        balanceAfter: 0,
        status: "completed",
        paymentMethod: "Bank BNI",
        referenceId: "WD-REF-003",
        createdAt: new Date(Date.now() - 518400000).toISOString()
    },
    {
        id: "178572300270400000",
        userId: 889977665544104,
        user: { name: "Budi Santoso", email: "budi.santoso@email.com", username: "budi_santoso" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke Bank BRI — 6677889900",
        amount: -250000,
        balanceBefore: 250000,
        balanceAfter: 0,
        status: "completed",
        paymentMethod: "Bank BRI",
        referenceId: "WD-REF-004",
        createdAt: new Date(Date.now() - 604800000).toISOString()
    },
    {
        id: "178572300270500000",
        userId: 889977665544105,
        user: { name: "Dewi Rahayu", email: "dewi.rahayu@gmail.com", username: "dewi_rahayu" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke GoPay — 081234567890",
        amount: -400000,
        balanceBefore: 400000,
        balanceAfter: 400000,
        status: "rejected",
        paymentMethod: "GoPay",
        referenceId: "WD-REJ-005",
        createdAt: new Date(Date.now() - 691200000).toISOString()
    },

    // ─── TRANSAKSI PAYMENT (data historis payment yang sudah selesai) ─────────
    {
        id: "1785723001907",
        userId: 889977665544102,
        user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" },
        type: 4,
        typeName: "Payment",
        description: "Pembayaran kelas",
        amount: -150000,
        balanceBefore: 600000,
        balanceAfter: 450000,
        status: "completed",
        paymentMethod: "Qurani Wallet",
        referenceId: "TXN-H-889977665544102",
        createdAt: new Date(Date.now() - 432000000).toISOString()
    },
    {
        id: "1785723001910",
        userId: 889977665544105,
        user: { name: "Dewi Rahayu", email: "dewi.rahayu@gmail.com", username: "dewi_rahayu" },
        type: 4,
        typeName: "Payment",
        description: "Pembayaran kelas batal",
        amount: -175000,
        balanceBefore: 50000,
        balanceAfter: 50000,
        status: "rejected",
        paymentMethod: "OVO",
        referenceId: "TXN-H-889977665544105",
        createdAt: new Date(Date.now() - 691200000).toISOString()
    }
];

const DUMMY_PENDING_TOPUPS = [
    {
        id: "1785723002001",
        userId: 889977665544101,
        user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" },
        amount: 300000,
        status: "PENDING",
        paymentMethod: "VA Mandiri",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002002",
        userId: 889977665544102,
        user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" },
        amount: 200000,
        status: "PENDING",
        paymentMethod: "BCA Virtual Account",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002003",
        userId: 889977665544103,
        user: { name: "Siti Aminah", email: "siti.aminah@yahoo.com", username: "siti_a" },
        amount: 250000,
        status: "PENDING",
        paymentMethod: "Bank Transfer",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002004",
        userId: 889977665544104,
        user: { name: "Budi Santoso", email: "budi.santoso@email.com", username: "budi_santoso" },
        amount: 150000,
        status: "PENDING",
        paymentMethod: "GoPay",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002005",
        userId: 889977665544105,
        user: { name: "Dewi Rahayu", email: "dewi.rahayu@gmail.com", username: "dewi_rahayu" },
        amount: 500000,
        status: "PENDING",
        paymentMethod: "Bank BNI",
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        externalReference: null
    }
];

const DUMMY_TOPUP_HISTORY = [
    {
        id: "1785723002101",
        userId: 889977665544101,
        user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" },
        amount: 300000,
        status: "COMPLETED",
        paymentMethod: "VA Mandiri",
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        completedAt: new Date(Date.now() - 345500000).toISOString(),
        externalReference: "EXT-TOP-001",
        rejectionReason: null
    },
    {
        id: "1785723002102",
        userId: 889977665544102,
        user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" },
        amount: 200000,
        status: "COMPLETED",
        paymentMethod: "BCA Virtual Account",
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        completedAt: new Date(Date.now() - 431000000).toISOString(),
        externalReference: "EXT-TOP-002",
        rejectionReason: null
    },
    {
        id: "1785723002103",
        userId: 889977665544103,
        user: { name: "Siti Aminah", email: "siti.aminah@yahoo.com", username: "siti_a" },
        amount: 250000,
        status: "REJECTED",
        paymentMethod: "Bank Transfer",
        createdAt: new Date(Date.now() - 518400000).toISOString(),
        completedAt: new Date(Date.now() - 518000000).toISOString(),
        externalReference: null,
        rejectionReason: "Data tidak valid"
    },
    {
        id: "1785723002104",
        userId: 889977665544104,
        user: { name: "Budi Santoso", email: "budi.santoso@email.com", username: "budi_santoso" },
        amount: 150000,
        status: "COMPLETED",
        paymentMethod: "GoPay",
        createdAt: new Date(Date.now() - 604800000).toISOString(),
        completedAt: new Date(Date.now() - 604000000).toISOString(),
        externalReference: "EXT-TOP-004",
        rejectionReason: null
    },
    {
        id: "1785723002105",
        userId: 889977665544105,
        user: { name: "Dewi Rahayu", email: "dewi.rahayu@gmail.com", username: "dewi_rahayu" },
        amount: 500000,
        status: "COMPLETED",
        paymentMethod: "Bank BNI",
        createdAt: new Date(Date.now() - 691200000).toISOString(),
        completedAt: new Date(Date.now() - 691000000).toISOString(),
        externalReference: "EXT-TOP-005",
        rejectionReason: null
    }
];

export function initSimWalletStore(forceReset = false) {
    if (typeof window === "undefined") return;

    const currentVersion = localStorage.getItem(STORE_VERSION_KEY);
    if (forceReset || currentVersion !== STORE_VERSION) {
        localStorage.removeItem(PENDING_TOPUPS_KEY);
        localStorage.removeItem(TOPUP_HISTORY_KEY);
        localStorage.removeItem(TRANSACTIONS_KEY);
        localStorage.removeItem(WALLET_STATS_KEY);
        localStorage.removeItem(WALLETS_KEY);
        localStorage.setItem(STORE_VERSION_KEY, STORE_VERSION);
    }

    if (!localStorage.getItem(PENDING_TOPUPS_KEY)) {
        localStorage.setItem(PENDING_TOPUPS_KEY, JSON.stringify(DUMMY_PENDING_TOPUPS));
    }
    
    if (!localStorage.getItem(TOPUP_HISTORY_KEY)) {
        localStorage.setItem(TOPUP_HISTORY_KEY, JSON.stringify(DUMMY_TOPUP_HISTORY));
    }
    
    if (!localStorage.getItem(TRANSACTIONS_KEY)) {
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(DUMMY_TRANSACTIONS));
    }

    if (!localStorage.getItem(WALLET_STATS_KEY)) {
        localStorage.setItem(WALLET_STATS_KEY, JSON.stringify(DUMMY_DATA.statistics || {}));
    }
    
    if (!localStorage.getItem(WALLETS_KEY)) {
        localStorage.setItem(WALLETS_KEY, JSON.stringify({}));
    }
}

export function getSimPendingTopups(): any[] {
    if (typeof window === "undefined") return [];
    try {
        initSimWalletStore();
        return JSON.parse(localStorage.getItem(PENDING_TOPUPS_KEY) || "[]");
    } catch { return []; }
}

export function getSimTopupHistory(): any[] {
    if (typeof window === "undefined") return [];
    try {
        initSimWalletStore();
        return JSON.parse(localStorage.getItem(TOPUP_HISTORY_KEY) || "[]");
    } catch { return []; }
}

export function getSimTransactions(): any[] {
    if (typeof window === "undefined") return [];
    try {
        initSimWalletStore();
        return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || "[]");
    } catch { return []; }
}

export function getSimWalletStats(): any {
    if (typeof window === "undefined") return {};
    try {
        initSimWalletStore();
        return JSON.parse(localStorage.getItem(WALLET_STATS_KEY) || "{}");
    } catch { return {}; }
}

export function confirmSimTopup(id: number | string, extRef?: string): void {
    const pending = getSimPendingTopups();
    const history = getSimTopupHistory();
    const transactions = getSimTransactions();
    const stats = getSimWalletStats();

    const idx = pending.findIndex(p => p.id === id);
    if (idx === -1) return;

    const item = pending[idx];
    
    // Remove from pending
    pending.splice(idx, 1);
    
    // Add to topup history
    const historyItem = {
        ...item,
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
        externalReference: extRef || `EXT-${Date.now()}`,
        rejectionReason: null
    };
    history.unshift(historyItem);

    // Add to transaction history
    const balanceBefore = 0; // dummy balance logic
    const balanceAfter = item.amount;
    const txItem = {
        id: Date.now(),
        userId: item.userId,
        user: item.user,
        type: 1,
        typeName: "TopUp",
        description: `Top up via ${item.paymentMethod || 'Manual'}`,
        amount: item.amount,
        balanceBefore,
        balanceAfter,
        status: "completed",
        referenceId: `TXN-TOPUP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        createdAt: new Date().toISOString()
    };
    transactions.unshift(txItem);

    // Update stats (dummy)
    stats.totalPendingTopups = Math.max(0, (stats.totalPendingTopups || 0) - 1);
    stats.totalBalance = (stats.totalBalance || 0) + item.amount;

    localStorage.setItem(PENDING_TOPUPS_KEY, JSON.stringify(pending));
    localStorage.setItem(TOPUP_HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    localStorage.setItem(WALLET_STATS_KEY, JSON.stringify(stats));
}

export function rejectSimTopup(id: number | string, reason?: string): void {
    const pending = getSimPendingTopups();
    const history = getSimTopupHistory();
    const stats = getSimWalletStats();

    const idx = pending.findIndex(p => p.id === id);
    if (idx === -1) return;

    const item = pending[idx];
    
    // Remove from pending
    pending.splice(idx, 1);
    
    // Add to topup history
    const historyItem = {
        ...item,
        status: "REJECTED",
        completedAt: new Date().toISOString(),
        externalReference: null,
        rejectionReason: reason || "Ditolak oleh Admin"
    };
    history.unshift(historyItem);

    // Update stats
    stats.totalPendingTopups = Math.max(0, (stats.totalPendingTopups || 0) - 1);

    localStorage.setItem(PENDING_TOPUPS_KEY, JSON.stringify(pending));
    localStorage.setItem(TOPUP_HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(WALLET_STATS_KEY, JSON.stringify(stats));
}

export function getSimWallet(userId: string | number): any {
    if (typeof window === "undefined") return {};
    try {
        initSimWalletStore();
        const wallets = JSON.parse(localStorage.getItem(WALLETS_KEY) || "{}");
        if (!wallets[userId]) {
            wallets[userId] = {
                id: `W-MOCK-${userId.toString().slice(0, 6)}`,
                status: "active",
                limits: {
                    dailyTopupLimit: 10000000,
                    dailyWithdrawLimit: 5000000,
                    dailyTransferLimit: 5000000,
                    minWithdrawAmount: 50000,
                    maxBalance: 100000000
                },
                suspendReason: null,
                createdAt: new Date().toISOString()
            };
            localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
        }
        return wallets[userId];
    } catch { return {}; }
}

export function updateSimWallet(userId: string | number, updates: any): any {
    if (typeof window === "undefined") return {};
    try {
        const wallets = JSON.parse(localStorage.getItem(WALLETS_KEY) || "{}");
        if (!wallets[userId]) {
            wallets[userId] = { 
                id: `W-MOCK-${userId.toString().slice(0, 6)}`, 
                status: "active", 
                limits: {
                    dailyTopupLimit: 10000000,
                    dailyWithdrawLimit: 5000000,
                    dailyTransferLimit: 5000000,
                    minWithdrawAmount: 50000,
                    maxBalance: 100000000
                },
                suspendReason: null
            };
        }
        wallets[userId] = { ...wallets[userId], ...updates };
        localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
        return wallets[userId];
    } catch { return {}; }
}

export function getSimWalletBalances(userId: string | number) {
    const txs = getSimTransactions().filter((tx: any) => String(tx.userId) === String(userId));
    
    let activeBalance = 0;
    let pendingBalance = 0;

    for (const tx of txs) {
        if (tx.status === 'completed') {
            activeBalance += tx.amount;
        } else if (tx.status === 'pending' || tx.status === 'waiting') {
            pendingBalance += Math.abs(tx.amount); // Treat pending amounts as positive pending balance
        }
    }

    return { 
        balance: Math.max(0, activeBalance), 
        activeBalance: Math.max(0, activeBalance), 
        pendingBalance: Math.max(0, pendingBalance)
    };
}
