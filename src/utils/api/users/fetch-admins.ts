"use server"

import { createAdminClient } from "@/utils/supabase/server"

export interface AdminUser {
  id: string
  name: string
  email: string
  avatar_url?: string
}

export async function fetchAdmins(): Promise<{ admins: AdminUser[]; error?: string }> {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, name, email, avatar_url")
      .eq("role", "admin")
      .order("name")

    if (error) {
      console.error("Error fetching admins:", error)
      return { admins: [], error: error.message }
    }

    const admins: AdminUser[] = (data || []).map((user) => ({
      id: user.id,
      name: user.name || "Unknown",
      email: user.email || "",
      avatar_url: user.avatar_url
    }))

    return { admins }
  } catch (error) {
    console.error("Error in fetchAdmins:", error)
    return { admins: [], error: error instanceof Error ? error.message : "Unknown error" }
  }
}
