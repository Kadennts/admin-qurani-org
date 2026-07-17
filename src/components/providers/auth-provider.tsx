"use client"

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react"
import useSWR from "swr"
import { getStoredAuth, clearStoredAuth, authApi, API_BASE, type AuthData } from "@/lib/api"

interface UserProfile {
    id: string
    name: string
    username: string
    email: string
    avatar: string
    role?: string
    roles?: string[]
    timezone?: string
}

interface AuthContextType {
    profile: UserProfile | null
    customUser: AuthData | null
    userId: string | undefined
    authId: string | null
    loading: boolean
    error: string | null
    signOut: () => Promise<void>
    isAuthenticated: boolean
    refreshProfile: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper function to normalize avatar URL (handle relative paths from API)
const normalizeAvatarUrl = (url: string | null | undefined): string => {
    if (!url || !url.trim()) return "";
    const img = url.trim();
    // Already a full URL or data URI
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    // Relative path - prepend API base URL
    const normalizedPath = img.replace(/\\/g, '/');
    return `${API_BASE}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [customUser, setCustomUser] = useState<AuthData | null>(null)
    const [authLoading, setAuthLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const initialized = useRef(false)

    // Synchronize customUser from localStorage on mount
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const stored = getStoredAuth();
        if (stored) {
            console.log('[AuthProvider] Found stored auth in localStorage:', stored.username);
            setCustomUser(stored);

            // Ensure cookies are set for middleware
            const expires = new Date(stored.expiresAt).toUTCString();
            document.cookie = `myqurani_access_token=${stored.accessToken}; expires=${expires}; path=/; SameSite=Lax`;
            document.cookie = `myqurani_user=${encodeURIComponent(JSON.stringify({
                id: stored.userId,
                email: stored.email,
                username: stored.username,
                name: stored.name,
                roles: stored.roles,
            }))}; expires=${expires}; path=/; SameSite=Lax`;
        }

        setAuthLoading(false);

        // Listen for auth changes (from login/logout in other tabs)
        const handleAuthChange = () => {
            console.log('[AuthProvider] Auth change event received');
            const updated = getStoredAuth();
            setCustomUser(updated);
        };

        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    // ── Proactive Token Auto-Refresh ──────────────────────────────────────────
    useEffect(() => {
        const checkAndRefresh = async () => {
            const stored = getStoredAuth();
            if (!stored?.accessToken || !stored?.expiresAt) return;

            const expiresAt = new Date(stored.expiresAt).getTime();
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;

            if (expiresAt - now < fiveMinutes) {
                console.log('[AuthProvider] Token expiring soon, auto-refreshing...');
                try {
                    const res = await fetch('/api/auth/refresh', { method: 'POST' });
                    if (res.ok) {
                        const data = await res.json();
                        if (data?.accessToken) {
                            const newAuth = {
                                ...stored,
                                accessToken: data.accessToken,
                                expiresAt: data.expiresAt || stored.expiresAt
                            };
                            localStorage.setItem('myqurani_auth', JSON.stringify(newAuth));

                            const expires = new Date(newAuth.expiresAt).toUTCString();
                            document.cookie = `myqurani_access_token=${data.accessToken}; expires=${expires}; path=/; SameSite=Lax`;

                            setCustomUser(newAuth);
                            console.log('[AuthProvider] Token refreshed successfully ✅');
                        }
                    }
                } catch (err) {
                    console.warn('[AuthProvider] Token refresh error:', err);
                }
            }
        };

        checkAndRefresh();
        const interval = setInterval(checkAndRefresh, 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch user profile from API Qurani
    const fetchUserProfile = useCallback(
        async (authId: string): Promise<UserProfile | null> => {
            // Priority 0: Check cached profile in localStorage
            try {
                const cachedProfile = localStorage.getItem('myqurani_user_profile_v2');
                if (cachedProfile) {
                    const parsed = JSON.parse(cachedProfile);
                    if (
                        (parsed.id?.toString() === authId || parsed.userId?.toString() === authId) &&
                        parsed.timezone
                    ) {
                        console.log('[AuthProvider] Using cached user profile');
                        return {
                            id: parsed.id?.toString() || authId,
                            name: parsed.name || parsed.username,
                            username: parsed.username,
                            email: parsed.email,
                            avatar: normalizeAvatarUrl(parsed.avatar || parsed.image),
                            role: parsed.role || "member",
                            roles: parsed.roles || [],
                            timezone: parsed.timezone,
                        } as UserProfile;
                    } else if (
                        parsed.id?.toString() === authId ||
                        parsed.userId?.toString() === authId
                    ) {
                        localStorage.removeItem('myqurani_user_profile_v2');
                    }
                }
            } catch {
                console.log('[AuthProvider] No valid cached profile, will fetch from API');
            }

            // Priority 1: Fetch from API Qurani
            const stored = getStoredAuth();
            if (stored?.accessToken) {
                try {
                    console.log('[AuthProvider] Fetching profile from API Qurani');
                    const { userApi } = await import('@/lib/api');
                    const result = await userApi.getMe(stored.accessToken);
                    const userData = result.data || result;

                    if (userData) {
                        const profile: UserProfile = {
                            id: userData.id?.toString() || authId,
                            name: userData.name || userData.username,
                            username: userData.username,
                            email: userData.email,
                            avatar: normalizeAvatarUrl(userData.avatar || userData.image),
                            role: userData.role || "member",
                            roles: userData.roles || [],
                            timezone: userData.timezone || "",
                        };

                        // Cache the profile
                        localStorage.setItem('myqurani_user_profile_v2', JSON.stringify({
                            ...profile,
                            userId: authId,
                            cachedAt: new Date().toISOString(),
                        }));

                        return profile;
                    }
                } catch (e) {
                    console.warn("[AuthProvider] API getMe failed:", e);
                }
            }

            return null;
        },
        []
    );

    const swrProfileKey = customUser?.userId
        ? `user-profile-${customUser.userId}`
        : null;
    const swrProfileId = customUser?.userId?.toString() || null;

    const {
        data: profile,
        error: profileError,
        mutate,
    } = useSWR(
        swrProfileKey,
        swrProfileId ? () => fetchUserProfile(swrProfileId) : null,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000, // 5 minutes
            shouldRetryOnError: false,
            revalidateIfStale: false,
        }
    );

    // Sign out function
    const signOut = useCallback(async () => {
        setAuthLoading(true);
        try {
            // 1. Logout from API Qurani
            try {
                await authApi.logout();
                console.log('[AuthProvider] API logout successful');
            } catch (err) {
                console.warn("API logout failed", err);
                clearStoredAuth();
            }

            // 2. Clear state
            setCustomUser(null);
            mutate(null, false);

            // 3. Clear profile cache
            localStorage.removeItem('myqurani_user_profile_v2');
            localStorage.removeItem('myqurani_user_profile');

            // 4. Clear httpOnly cookies via API
            try {
                await fetch('/api/auth/force-logout', { method: 'POST' });
            } catch {
                // Ignore
            }

            // 5. Redirect to login
            console.log('[AuthProvider] Redirecting to login...');
            window.location.href = '/login';
        } catch (err) {
            console.error("Sign out failed:", err);
            setError("Failed to sign out");
        } finally {
            setAuthLoading(false);
        }
    }, [mutate]);

    const isAuthenticated = useMemo(() => !!customUser, [customUser]);

    const loading = authLoading || (!!customUser && !profile && !profileError);

    // Build effective profile from customUser when SWR hasn't loaded yet
    const effectiveProfile = useMemo(() => {
        if (profile) return profile;
        if (customUser) {
            return {
                id: customUser.userId.toString(),
                name: customUser.name || customUser.username,
                username: customUser.username,
                email: customUser.email,
                avatar: normalizeAvatarUrl(customUser.image),
                role: customUser.roles?.[0] || "member",
                roles: customUser.roles || [],
                timezone: (customUser as any).timezone || "",
            } as UserProfile;
        }
        return null;
    }, [profile, customUser]);

    const value = useMemo(
        () => ({
            profile: effectiveProfile,
            customUser,
            userId: effectiveProfile?.id ?? undefined,
            authId: customUser?.userId?.toString() ?? null,
            loading,
            error: error || (profileError ? "Failed to load profile" : null),
            signOut,
            isAuthenticated,
            refreshProfile: mutate,
        }),
        [
            effectiveProfile,
            customUser,
            loading,
            error,
            profileError,
            isAuthenticated,
            signOut,
            mutate,
        ]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuthContext must be used within AuthProvider");
    }
    return context;
}
