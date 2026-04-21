"use server"

/**
 * Tickets Insert API
 * 
 * This module provides ticket creation functions using the MyQurani API.
 * Interface remains the same as before for backward compatibility.
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

export interface CreateTicketData {
  subject: string
  contact: string
  department: string
  project?: string
  service?: string
  priority?: string
  body: string
}

// ============================================
// Helper Functions
// ============================================

async function getAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('myqurani_access_token')?.value || null;
  } catch {
    return null;
  }
}

// Map priority name to number for API
function getPriorityNumber(priority?: string): number {
  const priorityMap: Record<string, number> = {
    'Low': 1,
    'Medium': 2,
    'High': 3,
  };
  return priorityMap[priority || 'Medium'] || 2;
}

// Map department name to number for API (placeholder - adjust as needed)
function getDepartmentNumber(department: string): number {
  const deptMap: Record<string, number> = {
    'Marketing': 1,
    'Teknis': 2,
    'Produk': 3,
    'Engineering': 4,
    'Data': 5,
    'Audio': 6,
    'Sales': 7,
    'Support': 8,
  };
  return deptMap[department] || 8; // Default to Support
}

// ============================================
// API Functions
// ============================================

export async function createTicket(ticketData: CreateTicketData): Promise<{
  success: boolean
  data?: { id: number; ticket_number: string }
  error?: string
}> {
  // ============================================
  // PRIMARY: Save to Supabase first (always works, no API auth needed)
  // ============================================
  try {
    const { createAdminClient } = await import('@/utils/supabase/server');
    const supabase = await createAdminClient();

    const now = new Date().toISOString();
    const { data: inserted, error: sbError } = await supabase
      .from('tickets')
      .insert([{
        ticket_number: `#SB-${Date.now()}`, // sementara, akan di-update setelah dapat ID
        subject: ticketData.subject,
        contact: ticketData.contact,
        department: ticketData.department || 'Support',
        project: ticketData.project || null,
        service: ticketData.service || null,
        priority: ticketData.priority || 'Medium',
        status: 'Open',
        submitted_date: now,
        body: ticketData.body,
      }])
      .select('id')
      .single();

    if (sbError || !inserted) {
      console.error('[createTicket] Supabase insert failed:', sbError);
      return { success: false, error: sbError?.message || 'Failed to save ticket to database' };
    }

    // Update ticket_number menjadi format yang proper setelah dapat ID
    const ticketNum = `#${inserted.id}`;
    await supabase
      .from('tickets')
      .update({ ticket_number: ticketNum })
      .eq('id', inserted.id);

    console.log('[createTicket] ✅ Saved to Supabase, id:', inserted.id);

    // ============================================
    // SECONDARY: Try MyQurani API (non-blocking, ignore errors)
    // ============================================
    try {
      const token = await getAuthToken();
      if (token) {
        const response = await fetch(`${API_BASE_URL}/api/v1/tickets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject: ticketData.subject,
            department: getDepartmentNumber(ticketData.department),
            priority: getPriorityNumber(ticketData.priority),
            message: ticketData.body,
            name: ticketData.contact,
          }),
        });
        const responseText = await response.text().catch(() => '');
        if (response.ok) {
          console.log('[createTicket] API push also succeeded');
        } else {
          console.log('[createTicket] API push failed (ok, Supabase already saved):', response.status, responseText.substring(0, 100));
        }
      }
    } catch (apiErr) {
      // Ignore API errors — Supabase is primary
      console.log('[createTicket] API push skipped/failed (non-critical):', apiErr);
    }

    return {
      success: true,
      data: {
        id: inserted.id,
        ticket_number: ticketNum,
      },
    };
  } catch (error) {
    console.error('[createTicket] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function createTicketReply(replyData: {
  ticket_id: number
  author: string
  message: string
  attachments?: string
  isFromAdmin?: boolean
}): Promise<{ success: boolean; data?: { id: number }; error?: string }> {

  // ============================================
  // PRIMARY: Save reply to Supabase
  // ============================================
  try {
    const { createAdminClient } = await import('@/utils/supabase/server');
    const supabase = await createAdminClient();

    const now = new Date().toISOString();
    const { data: inserted, error: sbError } = await supabase
      .from('ticket_replies')
      .insert([{
        ticket_id: replyData.ticket_id,
        author: replyData.author,
        message: replyData.message,
        date: now,
        attachments: replyData.attachments || null,
      }])
      .select('id')
      .single();

    if (sbError || !inserted) {
      console.error('[createTicketReply] Supabase insert failed:', sbError);
      // Fallback: masih coba ke API jika Supabase gagal
    } else {
      console.log('[createTicketReply] ✅ Reply saved to Supabase, id:', inserted.id);

      // Update last_reply dan status di tabel tickets
      await supabase
        .from('tickets')
        .update({
          last_reply: now,
          status: replyData.isFromAdmin ? 'Answered' : 'Open',
        })
        .eq('id', replyData.ticket_id);
      console.log('[createTicketReply] ✅ Updated tickets.last_reply for ticket:', replyData.ticket_id);
    }

    // ============================================
    // SECONDARY: Try MyQurani API (non-blocking)
    // ============================================
    try {
      const token = await getAuthToken();
      if (token) {
        const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${replyData.ticket_id}/reply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ message: replyData.message }),
        });
        if (response.ok) {
          console.log('[createTicketReply] API push also succeeded');
        } else {
          console.log('[createTicketReply] API push failed (non-critical):', response.status);
        }
      }
    } catch (apiErr) {
      console.log('[createTicketReply] API push skipped (non-critical):', apiErr);
    }

    const replyId = inserted?.id || Date.now();
    return { success: true, data: { id: replyId } };

  } catch (error) {
    console.error('[createTicketReply] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
