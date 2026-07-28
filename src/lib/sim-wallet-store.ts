import DUMMY_DATA from "@/data/dummy-wallet.json"

const PENDING_TOPUPS_KEY = "qurani_sim_pending_topups"
const TOPUP_HISTORY_KEY = "qurani_sim_topup_history"
const TRANSACTIONS_KEY = "qurani_sim_transactions_v2"
const WALLET_STATS_KEY = "qurani_sim_wallet_stats"

const DUMMY_TRANSACTIONS = [
    {
        id: 101,
        userId: 1,
        user: { name: "Budi Santoso", email: "budi@example.com", username: "budisan" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via Bank BCA",
        amount: 500000,
        balanceBefore: 100000,
        balanceAfter: 600000,
        status: "completed",
        paymentMethod: "Bank BCA",
        referenceId: "TXN-TOPUP-001",
        createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 102,
        userId: 2,
        user: { name: "Siti Aminah", email: "siti@example.com", username: "siti_a" },
        type: 4,
        typeName: "Payment",
        description: "Pembayaran kelas privat",
        amount: -150000,
        balanceBefore: 400000,
        balanceAfter: 250000,
        status: "completed",
        paymentMethod: "Qurani Wallet",
        referenceId: "TXN-PAY-002",
        createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
        id: 103,
        userId: 1,
        user: { name: "Budi Santoso", email: "budi@example.com", username: "budisan" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke Bank Mandiri",
        amount: 200000,
        balanceBefore: 250000,
        balanceAfter: 50000,
        status: "pending",
        paymentMethod: "Bank Mandiri",
        referenceId: "TXN-WD-003",
        createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 104,
        userId: 3,
        user: { name: "Ahmad Fulan", email: "ahmad@example.com", username: "ahmadf" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via Virtual Account BNI",
        amount: 1000000,
        balanceBefore: 0,
        balanceAfter: 1000000,
        status: "completed",
        paymentMethod: "Bank BNI",
        referenceId: "TXN-TOPUP-004",
        createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
        id: 105,
        userId: 4,
        user: { name: "Dewi Lestari", email: "dewi@example.com", username: "dewil" },
        type: 4,
        typeName: "Payment",
        description: "Pembayaran paket bulanan",
        amount: -350000,
        balanceBefore: 500000,
        balanceAfter: 150000,
        status: "rejected",
        paymentMethod: "Qurani Wallet",
        referenceId: "TXN-PAY-005",
        createdAt: new Date(Date.now() - 259200000).toISOString()
    },
    {
        id: 106,
        userId: 5,
        user: { name: "Eko Prasetyo", email: "eko@example.com", username: "ekop" },
        type: 2,
        typeName: "Withdraw",
        description: "Penarikan ke Bank BCA",
        amount: 1500000,
        balanceBefore: 2000000,
        balanceAfter: 500000,
        status: "completed",
        paymentMethod: "Bank BRI",
        referenceId: "TXN-WD-006",
        createdAt: new Date(Date.now() - 345600000).toISOString()
    },
    {
        id: 107,
        userId: 6,
        user: { name: "Farida Hanum", email: "farida@example.com", username: "faridah" },
        type: 1,
        typeName: "TopUp",
        description: "Top up via GoPay",
        amount: 300000,
        balanceBefore: 50000,
        balanceAfter: 350000,
        status: "completed",
        paymentMethod: "GoPay",
        referenceId: "TXN-TOPUP-007",
        createdAt: new Date(Date.now() - 432000000).toISOString()
    }
];

export function initSimWalletStore() {
    if (typeof window === "undefined") return;

    if (!localStorage.getItem(PENDING_TOPUPS_KEY)) {
        localStorage.setItem(PENDING_TOPUPS_KEY, JSON.stringify(DUMMY_DATA.pendingTopups || []));
    }
    
    if (!localStorage.getItem(TOPUP_HISTORY_KEY)) {
        localStorage.setItem(TOPUP_HISTORY_KEY, JSON.stringify(DUMMY_DATA.topupHistory || []));
    }
    
    if (!localStorage.getItem(TRANSACTIONS_KEY)) {
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(DUMMY_TRANSACTIONS));
    }

    if (!localStorage.getItem(WALLET_STATS_KEY)) {
        localStorage.setItem(WALLET_STATS_KEY, JSON.stringify(DUMMY_DATA.statistics || {}));
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
