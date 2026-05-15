"use server"

import type { PostgrestError } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import type { AdminDashboardSummary, DashboardCountItem } from "@/types/admin-dashboard"

const PROFILE_TABLE = "user_profiles"
const ROLE_COLUMN = "role"
const BLOCKED_COLUMN = "isBlocked"
const ROLE_ADMIN = "admin"
const LOCATION_COLUMNS = "countryName, stateName, cityName, gender"
const TOP_LIMIT = 58
const CACHE_TTL_MS = 60 * 1000
const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"

let cachedSummary:
  | {
    data: AdminDashboardSummary
    expiresAt: number
  }
  | null = null

type ProfileLocationRow = {
  countryName: string | null
  stateName: string | null
  cityName: string | null
  gender: number | null
}

const normalizeLabel = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : "Unknown"
  }

  if (value === null || value === undefined) {
    return "Unknown"
  }

  return String(value)
}

const increment = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1)
}

const toTopList = (map: Map<string, number>, limit: number): DashboardCountItem[] => {
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

const parseCount = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const parseApiTotalCount = (payload: any): number | null => {
  const candidates = [
    payload?.data?.pagination?.totalCount,
    payload?.data?.pagination?.total,
    payload?.data?.totalCount,
    payload?.data?.TotalCount,
    payload?.pagination?.totalCount,
    payload?.pagination?.total,
    payload?.totalCount,
    payload?.TotalCount,
    payload?.total,
    payload?.count,
  ]

  for (const candidate of candidates) {
    const parsed = parseCount(candidate)
    if (parsed !== null) return parsed
  }

  if (Array.isArray(payload?.data?.items)) return payload.data.items.length
  if (Array.isArray(payload?.items)) return payload.items.length
  if (Array.isArray(payload?.data)) return payload.data.length
  if (Array.isArray(payload)) return payload.length

  return null
}

const fetchUserCountFromApi = async (
  token: string | undefined,
  filters: Record<string, string | boolean> = {}
): Promise<number | null> => {
  if (!token) return null

  const query = new URLSearchParams({
    Page: "1",
    PageSize: "1",
  })

  for (const [key, value] of Object.entries(filters)) {
    const stringValue = String(value)
    query.set(key, stringValue)
    query.set(key.toLowerCase(), stringValue)
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/Users/search?${query.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  const raw = await response.json().catch(() => null)
  return parseApiTotalCount(raw)
}

const buildSummary = async (): Promise<AdminDashboardSummary> => {
  const start = Date.now()
  const supabase = await createClient()
  const cookieStore = await cookies()
  const token = cookieStore.get("myqurani_access_token")?.value

  const [
    totalUsersResult,
    totalAdminsResult,
    blockedResult,
    profilesResult,
    apiTotalUsers,
    apiTotalAdmins,
    apiBlockedUsers,
    apiActiveUsers,
  ] = await Promise.all([
    supabase.from(PROFILE_TABLE).select("id", { count: "exact", head: true }),
    supabase
      .from(PROFILE_TABLE)
      .select("id", { count: "exact", head: true })
      .eq(ROLE_COLUMN, ROLE_ADMIN),
    supabase
      .from(PROFILE_TABLE)
      .select("id", { count: "exact", head: true })
      .eq(BLOCKED_COLUMN, true),
    supabase.from(PROFILE_TABLE).select(LOCATION_COLUMNS),
    fetchUserCountFromApi(token),
    fetchUserCountFromApi(token, { Role: ROLE_ADMIN }),
    fetchUserCountFromApi(token, { IsBlocked: true }),
    fetchUserCountFromApi(token, { IsBlocked: false }),
  ])

  const errors = [
    totalUsersResult.error,
    totalAdminsResult.error,
    blockedResult.error,
    profilesResult.error,
  ].filter(Boolean) as PostgrestError[]

  if (errors.length > 0) {
    const message = errors.map((error) => error.message).join(" | ")
    throw new Error(message)
  }

  const totalUsersFromDb = totalUsersResult.count ?? 0
  const blockedUsersFromDb = blockedResult.count ?? 0
  const adminsFromDb = totalAdminsResult.count ?? 0

  const totalUsers = Math.max(apiTotalUsers ?? totalUsersFromDb, 0)
  const totalAdmins = Math.max(apiTotalAdmins ?? adminsFromDb, 0)
  const blockedUsers = Math.max(
    0,
    Math.min(apiBlockedUsers ?? blockedUsersFromDb, totalUsers || Number.MAX_SAFE_INTEGER)
  )
  const activeUsers = Math.max(
    0,
    Math.min(apiActiveUsers ?? Math.max(totalUsers - blockedUsers, 0), totalUsers || Number.MAX_SAFE_INTEGER)
  )
  const activeRule =
    apiActiveUsers !== null
      ? "Active = API filter IsBlocked=false"
      : `Active = ${BLOCKED_COLUMN} is false or null`

  const profiles = (profilesResult.data || []) as ProfileLocationRow[]
  const countryCounts = new Map<string, number>()
  const stateCounts = new Map<string, number>()
  const cityCounts = new Map<string, number>()
  const genderCounts = new Map<string, number>()

  for (const profile of profiles) {
    increment(countryCounts, normalizeLabel(profile.countryName))
    increment(stateCounts, normalizeLabel(profile.stateName))
    increment(cityCounts, normalizeLabel(profile.cityName))

    const genderLabel =
      profile.gender === 1 ? "Male" : profile.gender === 2 ? "Female" : "Unknown"
    increment(genderCounts, genderLabel)
  }

  const summary: AdminDashboardSummary = {
    cards: {
      totalUsers,
      totalAdmins,
      activeUsers,
      blockedUsers,
    },
    charts: {
      topCountries: toTopList(countryCounts, TOP_LIMIT),
      topStates: toTopList(stateCounts, TOP_LIMIT),
      topCities: toTopList(cityCounts, TOP_LIMIT),
      genderCounts: toTopList(genderCounts, TOP_LIMIT),
    },
    meta: {
      activeRule,
      sourceTable: apiTotalUsers !== null ? "MyQurani Users API + Supabase locations" : PROFILE_TABLE,
    },
  }

  const durationMs = Date.now() - start
  console.info(`[admin-dashboard] summary fetched in ${durationMs}ms`)

  return summary
}

export async function fetchAdminDashboardSummary() {
  const now = Date.now()
  if (cachedSummary && cachedSummary.expiresAt > now) {
    return cachedSummary.data
  }

  const summary = await buildSummary()
  cachedSummary = {
    data: summary,
    expiresAt: now + CACHE_TTL_MS,
  }
  return summary
}
