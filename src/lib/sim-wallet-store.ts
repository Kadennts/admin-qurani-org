import DUMMY_DATA from "@/data/dummy-wallet.json"

const PENDING_TOPUPS_KEY = "qurani_sim_pending_topups"
const TOPUP_HISTORY_KEY = "qurani_sim_topup_history"
const TRANSACTIONS_KEY = "qurani_sim_transactions_v2"
const WALLET_STATS_KEY = "qurani_sim_wallet_stats"
const WALLETS_KEY = "qurani_sim_wallets_v2"

const DUMMY_TRANSACTIONS = [
    // --- 5 PENDING TRANSACTIONS ---
    {
        id: "1785723001901",
        userId: 101,
        user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via VA Mandiri",
        amount: 300000,
        balanceBefore: 0,
        balanceAfter: 0,
        status: "pending",
        paymentMethod: "VA Mandiri",
        referenceId: "TXN-P-001",
        createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: "1785723001902",
        userId: 102,
        user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke Bank BCA",
        amount: -150000,
        balanceBefore: 450000,
        balanceAfter: 450000,
        status: "pending",
        paymentMethod: "Bank BCA",
        referenceId: "TXN-P-002",
        createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
        id: "1785723001903",
        userId: 103,
        user: { name: "Siti Aminah", email: "siti.aminah@example.com", username: "siti_a" },
        type: 4,
        typeName: "Payment",
        description: "Pembayaran kelas",
        amount: -250000,
        balanceBefore: 500000,
        balanceAfter: 500000,
        status: "waiting",
        paymentMethod: "Qurani Wallet",
        referenceId: "TXN-P-003",
        createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: "1785723001904",
        userId: 104,
        user: { name: "Ahmad Fauzi", email: "ahmad.fauzi@example.com", username: "ahmad_fauzi" },
        type: 5,
        typeName: "Refund",
        description: "Refund kelas dibatalkan",
        amount: 200000,
        balanceBefore: 100000,
        balanceAfter: 100000,
        status: "pending",
        paymentMethod: "GoPay",
        referenceId: "TXN-P-004",
        createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
        id: "1785723001905",
        userId: 105,
        user: { name: "Budi Santoso", email: "budi.santoso@example.com", username: "budisan" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via Bank BNI",
        amount: 500000,
        balanceBefore: 50000,
        balanceAfter: 50000,
        status: "pending",
        paymentMethod: "Bank BNI",
        referenceId: "TXN-P-005",
        createdAt: new Date(Date.now() - 259200000).toISOString()
    },
    
    // --- 5 HISTORY TRANSACTIONS ---
    {
        id: "1785723001906",
        userId: 101,
        user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via VA Mandiri",
        amount: 300000,
        balanceBefore: 0,
        balanceAfter: 300000,
        status: "completed",
        paymentMethod: "VA Mandiri",
        referenceId: "TXN-H-101",
        createdAt: new Date(Date.now() - 345600000).toISOString()
    },
    {
        id: "1785723001907",
        userId: 102,
        user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" },
        type: 4,
        typeName: "Payment",
        description: "Pembayaran kelas",
        amount: -150000,
        balanceBefore: 600000,
        balanceAfter: 450000,
        status: "completed",
        paymentMethod: "Qurani Wallet",
        referenceId: "TXN-H-102",
        createdAt: new Date(Date.now() - 432000000).toISOString()
    },
    {
        id: "1785723001908",
        userId: 103,
        user: { name: "Siti Aminah", email: "siti.aminah@example.com", username: "siti_a" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke Bank BNI",
        amount: -250000,
        balanceBefore: 750000,
        balanceAfter: 500000,
        status: "completed",
        paymentMethod: "Bank BNI",
        referenceId: "TXN-H-103",
        createdAt: new Date(Date.now() - 518400000).toISOString()
    },
    {
        id: "1785723001909",
        userId: 104,
        user: { name: "Ahmad Fauzi", email: "ahmad.fauzi@example.com", username: "ahmad_fauzi" },
        type: 5,
        typeName: "Refund",
        description: "Refund ke Bank Transfer",
        amount: 200000,
        balanceBefore: 100000,
        balanceAfter: 300000,
        status: "completed",
        paymentMethod: "Bank Transfer",
        referenceId: "TXN-H-104",
        createdAt: new Date(Date.now() - 604800000).toISOString()
    },
    {
        id: "1785723001910",
        userId: 105,
        user: { name: "Budi Santoso", email: "budi.santoso@example.com", username: "budisan" },
        type: 4,
        typeName: "Payment",
        description: "Pembayaran kelas batal",
        amount: -175000,
        balanceBefore: 50000,
        balanceAfter: 50000,
        status: "rejected",
        paymentMethod: "OVO",
        referenceId: "TXN-H-105",
        createdAt: new Date(Date.now() - 691200000).toISOString()
    }
];

const DUMMY_PENDING_TOPUPS = [
    {
        id: "1785723002001",
        userId: 101,
        user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" },
        amount: 300000,
        status: "PENDING",
        paymentMethod: "VA Mandiri",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002002",
        userId: 102,
        user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" },
        amount: 200000,
        status: "PENDING",
        paymentMethod: "BCA Virtual Account",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002003",
        userId: 103,
        user: { name: "Siti Aminah", email: "siti.aminah@example.com", username: "siti_a" },
        amount: 250000,
        status: "PENDING",
        paymentMethod: "Bank Transfer",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002004",
        userId: 104,
        user: { name: "Ahmad Fauzi", email: "ahmad.fauzi@example.com", username: "ahmad_fauzi" },
        amount: 150000,
        status: "PENDING",
        paymentMethod: "GoPay",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        externalReference: null
    },
    {
        id: "1785723002005",
        userId: 105,
        user: { name: "Budi Santoso", email: "budi.santoso@example.com", username: "budisan" },
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
        userId: 101,
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
        userId: 102,
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
        userId: 103,
        user: { name: "Siti Aminah", email: "siti.aminah@example.com", username: "siti_a" },
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
        userId: 104,
        user: { name: "Ahmad Fauzi", email: "ahmad.fauzi@example.com", username: "ahmad_fauzi" },
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
        userId: 105,
        user: { name: "Budi Santoso", email: "budi.santoso@example.com", username: "budisan" },
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

    if (forceReset) {
        localStorage.removeItem(PENDING_TOPUPS_KEY);
        localStorage.removeItem(TOPUP_HISTORY_KEY);
        localStorage.removeItem(TRANSACTIONS_KEY);
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
