"use server"

import { createAdminClient } from "@/utils/supabase/server"

export interface RegularUser {
  id: string
  name: string
  email: string
  avatar_url?: string
}

export async function fetchAdminUsers(): Promise<{ users: RegularUser[]; error?: string }> {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, name, email, avatar, role")
      .or("role.eq.admin,role.eq.Admin")
      .order("name")

    if (error) {
      console.error("Error fetching admin users:", error)
      return { users: [], error: error.message }
    }

    const users: RegularUser[] = (data || []).map((user) => ({
      id: user.id,
      name: user.name || "Unknown",
      email: user.email || "",
      avatar_url: user.avatar
    }))

    return { users }
  } catch (error) {
    console.error("Error in fetchAdminUsers:", error)
    return { users: [], error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function fetchRegularUsers(): Promise<{ users: RegularUser[]; error?: string }> {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, name, email, avatar")
      .or("role.neq.admin,role.is.null")
      .order("name")

    if (error) {
      console.error("Error fetching regular users:", error)
      return { users: [], error: error.message }
    }

    const users: RegularUser[] = (data || []).map((user) => ({
      id: user.id,
      name: user.name || "Unknown",
      email: user.email || "",
      avatar_url: user.avatar // Map 'avatar' column to 'avatar_url' prop
    }))

    return { users }
  } catch (error) {
    console.error("Error in fetchRegularUsers:", error)
    return { users: [], error: error instanceof Error ? error.message : "Unknown error" }
  }
}
