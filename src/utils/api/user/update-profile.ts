"use server";

import { userApi } from "@/lib/api";

export const updateUserProfile = async (
  userId: string,
  countryId: number, 
  stateId: number, 
  cityId: number, 
  countryName: string, 
  statesName: string, 
  cityName: string, 
  timezone: string,
  fullName?: string, 
  nickname?: string,
  username?: string,
  gender?: number | null,
  date_of_birth?: string,
  job?: string,
  phoneNumber?: string,
  bio?: string,
  profilePhotoUrl?: string,
  email?: string 
) => {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("myqurani_access_token")?.value;

    if (!token) {
      return { success: false, message: "No active session found. Please login again." };
    }

    const finalPayload: Record<string, any> = {
      name: fullName || null, 
      nickname: nickname || null, 
      bio: bio || null, 
      address: phoneNumber || null, 
      cityId: cityId || null,
      city: cityName || null,
      stateId: stateId || null,
      state: statesName || null,
      countryId: countryId || null,
      country: countryName || null,
      sex: gender !== undefined ? gender : null,
      job: job || null,
      imageBase64: profilePhotoUrl || null,
    };

    if (date_of_birth) {
      finalPayload.dateOfBirth = date_of_birth;
    }

    // API expects timezone as integer, so we only send it if it's a number
    if (timezone && !isNaN(Number(timezone))) {
      finalPayload.timezone = Number(timezone);
    }

    const response = await userApi.updateMe(finalPayload, token);

    return { 
      success: true, 
      message: "Profile updated successfully",
      data: response?.data || response
    };
  } catch (err: any) {
    console.error("Update Profile Error:", err);
    return { success: false, message: err.message || "Failed to update profile" };
  }
};
