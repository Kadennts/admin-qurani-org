"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com";

async function checkStateWithCountry(
  stateId: number,
  countryId: number
): Promise<boolean> {
  if (!stateId || !countryId) return true; // Skip if no location set
  
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("states")
      .select("country_id")
      .eq("id", stateId)
      .maybeSingle();
      
    if (error || !data) return true; 
    return String(data.country_id) === String(countryId);
  } catch (err) {
    console.warn("[checkStateWithCountry] Validation error:", err);
    return true; // Don't block on error
  }
}

async function checkCityWithState(
  cityId: number,
  stateId: number
): Promise<boolean> {
  if (!cityId || !stateId) return true; // Skip if no location set
  
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("cities")
      .select("state_id")
      .eq("id", cityId)
      .maybeSingle();

    if (error || !data) return true;
    return String(data.state_id) === String(stateId);
  } catch (err) {
    console.warn("[checkCityWithState] Validation error:", err);
    return true;
  }
}

export const updateUserProfile = async (
  userId: string,
  countryId: number, // Pindah ke depan
  stateId: number, // Pindah ke depan
  cityId: number, // Pindah ke depan
  countryName: string, // Pindah ke depan
  statesName: string, // Pindah ke depan
  cityName: string, // Pindah ke depan
  timezone: string,
  fullName?: string, // Optional di belakang
  nickname?: string,
  username?: string,
  gender?: number | null,
  date_of_birth?: string,
  job?: string,
  phoneNumber?: string,
  bio?: string,
  profilePhotoUrl?: string,
  email?: string // Argument ke-18
) => {
  // Prepare update data with all fields
  const updateData: any = {
    countryId: countryId,
    stateId: stateId,
    cityId: cityId,
    countryName: countryName,
    stateName: statesName,
    cityName: cityName,
    timezone,
  };

  if (fullName !== undefined) updateData.name = fullName;
  if (nickname !== undefined) updateData.nickname = nickname;
  if (username !== undefined) updateData.username = username;
  if (gender !== undefined) updateData.gender = gender;
  if (date_of_birth !== undefined) updateData.dob = date_of_birth || null;
  if (job !== undefined) updateData.job = job;
  if (phoneNumber !== undefined) updateData.hp = phoneNumber;
  if (bio !== undefined) updateData.bio = bio;
  if (profilePhotoUrl !== undefined) updateData.avatar = profilePhotoUrl;
  if (email !== undefined) updateData.email = email;

  try {
    console.log("[updateUserProfile] Starting UPSERT for email:", email || userId);

    const isStateValid = await checkStateWithCountry(stateId, countryId);
    const isCityValid = await checkCityWithState(cityId, stateId);

    if (!isStateValid) {
      return { type: "state", warning: true, success: false, message: "State does not belong to the specified country" };
    }
    if (!isCityValid) {
      return { warning: true, success: false, message: "City does not belong to the specified state" };
    }

    const adminSupabase = await createAdminClient();

    // 1. Cek manual apakah profil sudah ada (berdasarkan email)
    const { data: existing, error: findError } = await adminSupabase
      .from("user_profiles")
      .select("id, auth, email")
      .eq("email", email || "")
      .maybeSingle();

    if (findError) {
      console.error("Find Profile Error:", findError);
      return { success: false, message: `Database error: ${findError.message}` };
    }

    let result;
    let error;

    if (existing) {
      // 2a. JIKA ADA: Gunakan UPDATE
      console.log("[updateUserProfile] Found existing profile, performing UPDATE");
      const { data, error: updateErr } = await adminSupabase
        .from("user_profiles")
        .update(updateData)
        .eq("id", existing.id)
        .select();
      result = data;
      error = updateErr;
    } else {
      // 2b. JIKA TIDAK ADA: Gunakan INSERT (Buat Baru)
      console.log(`[updateUserProfile] Profile not found for ${userId}, performing INSERT`);

      const newData = {
        ...updateData,
        id: userId, // Gunakan userId dari Auth sebagai primary key
        auth: userId, // Hubungkan ke Auth
        role: "member",
        created: new Date().toISOString(),
        email: email
      };

      const { data, error: insertErr } = await adminSupabase
        .from("user_profiles")
        .insert([newData])
        .select();
      result = data;
      error = insertErr;
    }

    if (error) {
      console.error("Supabase Save Error:", error);
      // Kirim error detail ke UI agar kita tahu masalahnya (misal: kolom kurang, error tipe data, dll)
      return { success: false, message: `Database Save Error: ${error.message} (${error.code})` };
    }

    // Optionally sync to external API (non-blocking)
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const token = cookieStore.get("myqurani_access_token")?.value;

      if (token) {
        const finalPayload = {
          name: fullName, nickname, username, gender, birthDate: date_of_birth,
          job, hp: phoneNumber, bio, avatar: profilePhotoUrl,
          countryId, stateId, cityId, countryName, stateName: statesName, cityName, timezone,
        };

        fetch(`${API_BASE_URL}/api/v1/Users/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(finalPayload)
        }).catch((e) => console.warn("[updateUserProfile] API sync fail:", e));
      }
    } catch (syncErr) {
      console.warn("[updateUserProfile] API sync error:", syncErr);
    }

    return { success: true, message: "Profile updated successfully" };

  } catch (err) {
    console.error("Update Profile Error:", err);
    return { success: false, message: "Failed to update profile" };
  }
};
