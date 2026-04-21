"use client"

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react"
import { User } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/client"
import useSWR from "swr"
import { getStoredAuth, clearStoredAuth, authApi, API_BASE, type AuthData } from "@/lib/api"

interface UserProfile {
    id: string
    name: string
    username: string
    email: string
    avatar: string
    role?: string
    timezone?: string
}

interface AuthContextType {
    user: User | null
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
    const normalizedPath = img.replace(/\\/g, '/'); // Fix Windows backslashes
    return `${API_BASE}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [customUser, setCustomUser] = useState<AuthData | null>(null)
    const [authLoading, setAuthLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const initialized = useRef(false)

    const supabase = useMemo(() => createClient(), [])

    // Synchronize customUser from localStorage on mount (like My-Qurani example)
    useEffect(() => {
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
                role: 'member',
            }))}; expires=${expires}; path=/; SameSite=Lax`;
        }

        // Listen for auth changes (from login/logout in other tabs)
        const handleAuthChange = () => {
            console.log('[AuthProvider] Auth change event received');
            setCustomUser(getStoredAuth());
        };

        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    // ── Proactive Token Auto-Refresh ──────────────────────────────────────────
    // Cek setiap 1 menit, refresh token jika kurang dari 5 menit lagi expired
    useEffect(() => {
        const checkAndRefresh = async () => {
            const stored = getStoredAuth();
            if (!stored?.accessToken || !stored?.expiresAt) return;

            const expiresAt = new Date(stored.expiresAt).getTime();
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;

            // Refresh jika token akan expired dalam 5 menit
            if (expiresAt - now < fiveMinutes) {
                console.log('[AuthProvider] Token expiring soon, auto-refreshing...');
                try {
                    const res = await fetch('/api/auth/refresh', { method: 'POST' });
                    if (res.ok) {
                        const data = await res.json();
                        if (data?.accessToken) {
                            // Update localStorage
                            const newAuth = { ...stored, accessToken: data.accessToken, expiresAt: data.expiresAt || stored.expiresAt };
                            localStorage.setItem('myqurani_auth', JSON.stringify(newAuth));

                            // Update cookie agar middleware tidak redirect
                            const expires = new Date(newAuth.expiresAt).toUTCString();
                            document.cookie = `myqurani_access_token=${data.accessToken}; expires=${expires}; path=/; SameSite=Lax`;

                            setCustomUser(newAuth);
                            console.log('[AuthProvider] Token refreshed successfully ✅');
                        }
                    } else {
                        console.warn('[AuthProvider] Token refresh failed, status:', res.status);
                    }
                } catch (err) {
                    console.warn('[AuthProvider] Token refresh error:', err);
                }
            }
        };

        // Jalankan langsung saat mount
        checkAndRefresh();

        // Lalu cek setiap 60 detik
        const interval = setInterval(checkAndRefresh, 60 * 1000);
        return () => clearInterval(interval);
    }, []);


    // Fetch user profile from API - only called if no cached profile
    const fetchUserProfile = useCallback(
        async (authId: string): Promise<UserProfile | null> => {
            // Priority 0: Check cached profile in localStorage (from previous login)
            // This prevents 'me' request on every page load
            try {
                const cachedProfile = localStorage.getItem('myqurani_user_profile');
                if (cachedProfile) {
                    const parsed = JSON.parse(cachedProfile);
                    // Verify cached profile matches current user
                    if (parsed.id?.toString() === authId || parsed.userId?.toString() === authId) {
                        console.log('[AuthProvider] Using cached user profile, no API call needed');
                        return {
                            id: parsed.id?.toString() || authId,
                            name: parsed.name || parsed.username,
                            username: parsed.username,
                            email: parsed.email,
                            avatar: normalizeAvatarUrl(parsed.avatar || parsed.image),
                            role: parsed.role || "member",
                            timezone: parsed.timezone || "",
                        } as UserProfile;
                    }
                }
            } catch (e) {
                console.log('[AuthProvider] No valid cached profile, will fetch from API');
            }

            // Priority 1: Custom API if customUser exists (only on login or cache miss)
            const stored = getStoredAuth();
            if (stored?.accessToken) {
                try {
                    console.log('[AuthProvider] Fetching profile from API (first time or cache miss)');
                    const { userApi } = await import('@/lib/api');
                    const result = await userApi.getMe(stored.accessToken);
                    const userData = result.data || result;
                    if (userData) {
                        const profile = {
                            id: userData.id?.toString() || authId,
                            name: userData.name || userData.username,
                            username: userData.username,
                            email: userData.email,
                            avatar: normalizeAvatarUrl(userData.avatar || userData.image),
                            role: userData.role || "member",
                            timezone: userData.timezone || "",
                        } as UserProfile;

                        // Cache the profile for future page loads
                        localStorage.setItem('myqurani_user_profile', JSON.stringify({
                            ...profile,
                            userId: authId,
                            cachedAt: new Date().toISOString(),
                        }));
                        console.log('[AuthProvider] Profile cached for future use');

                        return profile;
                    }
                } catch (e) {
                    console.warn("[AuthProvider] Custom API getMe failed, falling back to Supabase:", e);
                }
            }

            // Priority 2: Supabase direct query (fallback)
            const { data, error } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("auth", authId)
                .maybeSingle();

            if (error) {
                console.error("Error fetching profile:", error);
                throw error;
            }

            return data;
        },
        [supabase]
    );

    const {
        data: profile,
        error: profileError,
        mutate,
    } = useSWR(
        (user?.id || customUser?.userId) ? `user-profile-${user?.id || customUser?.userId}` : null,
        (user?.id || customUser?.userId) ? () => fetchUserProfile((user?.id || customUser?.userId!).toString()) : null,
        {
            // Disable automatic revalidation to prevent duplicate 'me' requests
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000, // 5 minutes - prevent duplicate requests
            shouldRetryOnError: false,
            revalidateIfStale: false,
        }
    );

    // Initial Supabase auth check
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const getInitialSession = async () => {
            // Safety timeout: paksa berhenti loading setelah 6 detik
            const timeoutId = setTimeout(() => {
                console.warn('[AuthProvider] Auth timeout - forcing loading false');
                setAuthLoading(false);
            }, 6000);

            try {
                // Skip Supabase if we have custom auth
                if (getStoredAuth()) {
                    console.log('[AuthProvider] Custom auth found, skipping Supabase');
                    clearTimeout(timeoutId);
                    setAuthLoading(false);
                    return;
                }

                // ─── STALE COOKIE DETECTION ───────────────────────────────────
                // Jika cookie MyQurani ada tapi localStorage KOSONG → stale state.
                // Redirect ke /api/auth/force-logout (exclude dari middleware)
                // agar cookie dihapus server-side, lalu redirect bersih ke /login.
                const hasMyQuraniCookie = document.cookie.includes('myqurani_access_token=');
                if (hasMyQuraniCookie) {
                    console.warn('[AuthProvider] Stale MyQurani cookie (no localStorage). Force logout...');
                    clearTimeout(timeoutId);
                    setAuthLoading(false);
                    window.location.href = '/api/auth/force-logout';
                    return;
                }
                // ─────────────────────────────────────────────────────────────

                // Try to get Supabase user
                const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

                if (userError) {
                    if (userError.message?.includes('session missing') || userError.message?.includes('Auth session missing')) {
                        console.log('[AuthProvider] No Supabase session, this is OK');
                    } else {
                        console.error("Error getting user:", userError);
                    }
                } else {
                    setUser(currentUser || null);
                }
            } catch (err) {
                console.error("Error in getInitialSession:", err);
            } finally {
                clearTimeout(timeoutId);
                setAuthLoading(false);
            }
        };

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
            try {
                if (event === "SIGNED_IN") {
                    setUser(session?.user ?? null);
                    setError(null);
                } else if (event === "SIGNED_OUT") {
                    setUser(null);
                    mutate(null, false);
                    setError(null);
                } else if (event === "TOKEN_REFRESHED") {
                    setUser(session?.user ?? null);
                }
            } catch (err) {
                console.error("Error in onAuthStateChange:", err);
            } finally {
                setAuthLoading(false);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [supabase, mutate]);

    // Sign out function - clears everything and redirects to login
    const signOut = useCallback(async () => {
        setAuthLoading(true);
        try {
            // 1. Sign out from Custom API (calls API and clears localStorage + cookies)
            try {
                await authApi.logout();
                console.log('[AuthProvider] Custom API logout successful');
            } catch (err) {
                console.warn("Custom API logout failed", err);
                // Still clear local data even if API fails
                clearStoredAuth();
            }

            // 2. Sign out from Supabase
            await supabase.auth.signOut();

            // 3. Clear state
            setUser(null);
            setCustomUser(null);
            mutate(null, false);

            // 4. Additionally clear any httpOnly cookies via API
            try {
                await fetch('/api/auth/force-logout', { method: 'POST' });
            } catch {
                // Ignore
            }

            // 5. Redirect to login page
            console.log('[AuthProvider] Redirecting to login...');
            window.location.href = '/login';
        } catch (err) {
            console.error("Sign out failed:", err);
            setError("Failed to sign out");
        } finally {
            setAuthLoading(false);
        }
    }, [supabase, mutate]);

    const isAuthenticated = useMemo(() => !!user || !!customUser, [user, customUser]);

    // FIX: jika customUser (MyQurani) ada → effectiveProfile sudah tersedia → tidak perlu tunggu SWR
    const loading = authLoading || (!customUser && !!user && !profile && !profileError);

    // Build effective profile from custom user if available
    const effectiveProfile = useMemo(() => {
        if (profile) return profile;
        if (customUser) {
            return {
                id: customUser.userId.toString(),
                name: customUser.name || customUser.username,
                username: customUser.username,
                email: customUser.email,
                avatar: normalizeAvatarUrl(customUser.image),
                role: "member",
                timezone: (customUser as any).timezone || "",
            } as UserProfile;
        }
        return null;
    }, [profile, customUser]);

    const value = useMemo(
        () => ({
            user,
            profile: effectiveProfile,
            customUser,
            userId: effectiveProfile?.id ?? undefined,
            authId: user?.id ?? customUser?.userId?.toString() ?? null,
            loading,
            error: error || (profileError ? "Failed to load profile" : null),
            signOut,
            isAuthenticated,
            refreshProfile: mutate,
        }),
        [
            user,
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
