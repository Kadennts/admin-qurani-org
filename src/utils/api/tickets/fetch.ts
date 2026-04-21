"use server"

/**
 * Tickets Fetch API
 * 
 * This module provides ticket fetching functions using the MyQurani API.
 * Interface remains the same as before for backward compatibility.
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';

// ============================================
// Types (kept same as before for compatibility)
// ============================================

export interface TicketListItem {
  id: number
  ticket_number: string
  subject: string
  contact: string
  department: string
  project: string | null
  service: string | null
  priority: string
  status: string
  last_reply: string | null
  submitted_date: string
  body: string | null
}

export interface TicketReply {
  id: number
  ticket_id: number
  author: string
  message: string
  date: string
  attachments: string | null
}

export interface TicketWithReplies extends TicketListItem {
  replies: TicketReply[]
}

// ============================================
// API Types from MyQurani
// ============================================

interface ApiTicketListDto {
  id: number;
  ticketKey: string;
  subject: string;
  email: string | null;
  name: string | null;
  status: number;
  statusName: string;
  priority: number;
  priorityName: string;
  department: number;
  assigned: number;
  date: string;
  lastReply: string | null;
  clientRead: number;
  adminRead: number;
  replyCount: number;
}

interface ApiTicketDetailDto {
  id: number;
  ticketKey: string;
  userId: number | null;
  email: string | null;
  name: string | null;
  department: number | null;
  priority: number;
  priorityName: string | null;
  status: number;
  statusName: string | null;
  service: string | null;
  subject: string;
  message: string | null;
  date: string;
  lastReply: string | null;
  clientRead: number;
  adminRead: number;
  replies: ApiTicketReplyDto[];
  attachments: ApiTicketAttachmentDto[];
}

interface ApiTicketReplyDto {
  id: number;
  ticketId: number;
  userId: number | null;
  name: string | null;
  email: string | null;
  message: string | null;
  admin: number | null;
  isStaffReply: boolean;
  date: string;
  attachments: ApiTicketAttachmentDto[] | null;
}

interface ApiTicketAttachmentDto {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
}

interface PagedResponse<T> {
  data: T[];
  offset: number;
  limit: number;
  totalCount: number;
  hasMore: boolean;
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

// Map status name to number for API
function getStatusNumber(status?: string): number | undefined {
  if (!status || status === 'all') return undefined;
  const statusMap: Record<string, number> = {
    'Open': 1,
    'In Progress': 2,
    'Answered': 3,
    'On Hold': 4,
    'Closed': 5,
  };
  return statusMap[status];
}

// Map priority name to number for API
function getPriorityNumber(priority?: string): number | undefined {
  if (!priority || priority === 'all') return undefined;
  const priorityMap: Record<string, number> = {
    'Low': 1,
    'Medium': 2,
    'High': 3,
  };
  return priorityMap[priority];
}

// Convert API ticket to local format
function convertTicketListItem(apiTicket: ApiTicketListDto): TicketListItem {
  return {
    id: apiTicket.id,
    ticket_number: apiTicket.ticketKey,
    subject: apiTicket.subject,
    contact: apiTicket.name || apiTicket.email || 'Unknown',
    department: String(apiTicket.department), // TODO: Map to department name
    project: null,
    service: null,
    priority: apiTicket.priorityName || getPriorityName(apiTicket.priority),
    status: apiTicket.statusName || getStatusName(apiTicket.status),
    last_reply: apiTicket.lastReply,
    submitted_date: apiTicket.date,
    body: null,
  };
}

function getStatusName(status: number): string {
  const names: Record<number, string> = {
    1: 'Open',
    2: 'In Progress',
    3: 'Answered',
    4: 'On Hold',
    5: 'Closed',
  };
  return names[status] || 'Unknown';
}

function getPriorityName(priority: number): string {
  const names: Record<number, string> = {
    1: 'Low',
    2: 'Medium',
    3: 'High',
  };
  return names[priority] || 'Medium';
}

// Convert API ticket detail to local format
function convertTicketWithReplies(apiTicket: ApiTicketDetailDto): TicketWithReplies {
  return {
    id: apiTicket.id,
    ticket_number: apiTicket.ticketKey || `#${apiTicket.id}`,
    subject: apiTicket.subject || 'No Subject',
    contact: apiTicket.name || apiTicket.email || 'Unknown',
    department: String(apiTicket.department || ''),
    project: null,
    service: apiTicket.service,
    priority: apiTicket.priorityName || getPriorityName(apiTicket.priority),
    status: apiTicket.statusName || getStatusName(apiTicket.status),
    last_reply: apiTicket.lastReply,
    submitted_date: apiTicket.date,
    body: apiTicket.message,
    replies: (apiTicket.replies || []).map(reply => ({
      id: reply.id,
      ticket_id: reply.ticketId,
      author: reply.name || reply.email || (reply.isStaffReply ? 'Staff' : 'User'),
      message: reply.message || '',
      date: reply.date,
      attachments: reply.attachments
        ? JSON.stringify(reply.attachments.map(a => a.url))
        : null,
    })),
  };
}

// ============================================
// API Functions
// ============================================
// Helper: Ambil tiket dari Supabase (selalu dijalankan, tidak tergantung API)
// ============================================
async function fetchSupabaseTicketList(filters?: {
  status?: string
  priority?: string
  search?: string
  limit?: number
}): Promise<TicketListItem[]> {
  try {
    const { createAdminClient } = await import('@/utils/supabase/server');
    const supabase = await createAdminClient();

    let query = supabase
      .from('tickets')
      .select('id, ticket_number, subject, contact, department, project, service, priority, status, last_reply, submitted_date, body')
      .order('submitted_date', { ascending: false })
      .limit(filters?.limit || 100);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.search) {
      query = query.ilike('subject', `%${filters.search}%`);
    }

    const { data: sbData, error: sbError } = await query;

    if (sbError || !sbData || sbData.length === 0) {
      if (sbError) console.warn('[fetchSupabaseTicketList] Error:', sbError.message);
      return [];
    }

    console.log('[fetchSupabaseTicketList] Found', sbData.length, 'tickets from Supabase');
    return sbData.map(t => ({
      id: t.id,
      ticket_number: t.ticket_number || `#${t.id}`,
      subject: t.subject,
      contact: t.contact,
      department: t.department || 'Support',
      project: t.project || null,
      service: t.service || null,
      priority: t.priority || 'Medium',
      status: t.status || 'Open',
      last_reply: t.last_reply || null,
      submitted_date: t.submitted_date || new Date().toISOString(),
      body: t.body || null,
    }));
  } catch (err) {
    console.warn('[fetchSupabaseTicketList] Skipped:', err);
    return [];
  }
}

// Helper: merge API + Supabase, hilangkan duplikat berdasarkan ID
function mergeTickets(apiTickets: TicketListItem[], sbTickets: TicketListItem[]): TicketListItem[] {
  const apiIds = new Set(apiTickets.map(t => String(t.id)));
  const uniqueSb = sbTickets.filter(t => !apiIds.has(String(t.id)));
  return [...apiTickets, ...uniqueSb];
}

// ============================================

export async function fetchTickets(filters?: {
  status?: string
  priority?: string
  department?: string
  search?: string
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}): Promise<{ success: boolean; data?: TicketListItem[]; totalCount?: number; error?: string }> {
  const token = await getAuthToken();

  // Mulai fetch Supabase DI AWAL secara paralel — tidak menunggu API
  const supabasePromise = fetchSupabaseTicketList(filters);

  if (!token) {
    console.error('[fetchTickets] No auth token found');
    const sbTickets = await supabasePromise;
    return { success: true, data: sbTickets, totalCount: sbTickets.length };
  }

  try {
    const params = new URLSearchParams();

    const statusNum = getStatusNumber(filters?.status);
    const priorityNum = getPriorityNumber(filters?.priority);

    if (statusNum !== undefined) params.append('Status', String(statusNum));
    if (priorityNum !== undefined) params.append('Priority', String(priorityNum));
    if (filters?.search) params.append('Keyword', filters.search);

    // Pagination
    const page = filters?.offset !== undefined && filters?.limit !== undefined
      ? Math.floor(filters.offset / filters.limit) + 1
      : 1;
    const pageSize = filters?.limit || 10;

    params.append('Page', String(page));
    params.append('PageSize', String(pageSize));

    const url = `${API_BASE_URL}/api/v1/tickets${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('[fetchTickets] Calling API:', url);

    // Import fetchWithAutoRefresh for auto token refresh
    const { fetchWithAutoRefresh } = await import('@/utils/api/token-refresh');

    let response: Response;
    try {
      response = await fetchWithAutoRefresh(url, { method: 'GET' });
    } catch (authError) {
      console.error('[fetchTickets] Auth error:', authError);
      const sbTickets = await supabasePromise;
      return { success: true, data: sbTickets, totalCount: sbTickets.length, error: 'Authentication required' };
    }

    // Handle empty response
    const responseText = await response.text();
    console.log('[fetchTickets] Response status:', response.status);
    console.log('[fetchTickets] Response text:', responseText.substring(0, 300));

    if (!responseText || responseText.trim() === '') {
      console.log('[fetchTickets] Empty response, using Supabase only');
      const sbTickets = await supabasePromise;
      return { success: true, data: sbTickets, totalCount: sbTickets.length };
    }

    let rawResult: any;
    try {
      rawResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[fetchTickets] JSON parse error:', parseError);
      const sbTickets = await supabasePromise;
      return { success: true, data: sbTickets, totalCount: sbTickets.length };
    }

    if (!response.ok) {
      console.error('[fetchTickets] API error:', rawResult);
      const sbTickets = await supabasePromise;
      return { success: true, data: sbTickets, totalCount: sbTickets.length, error: rawResult.message || 'Failed to fetch tickets' };
    }

    // Handle different response structures
    // API might return: { success, data: { data: [...], totalCount } } or { data: [...], totalCount }
    // Handle different response structures (MyQurani API patterns)
    let ticketData: ApiTicketListDto[] = [];
    let totalCount = 0;

    const rData = rawResult.data || rawResult;
    
    if (Array.isArray(rData)) {
      ticketData = rData;
      totalCount = rawResult.totalCount || rData.length;
    } else if (rData && typeof rData === 'object') {
      ticketData = rData.items || rData.data || (Array.isArray(rData) ? rData : []);
      // Search for total count in all common property names
      totalCount = 
        rData.totalCount || rData.TotalCount || 
        rData.total || rData.Total || 
        rData.count || 
        rawResult.totalCount || rawResult.TotalCount || 
        (Array.isArray(ticketData) ? ticketData.length : 0);
    }

    console.log('[fetchTickets] Parsed:', ticketData.length, 'tickets, total:', totalCount);

    // Convert API tickets to local format
    const apiTickets = ticketData.map(convertTicketListItem);

    // Await Supabase (sudah berjalan paralel sejak awal)
    const sbTickets = await supabasePromise;
    const allTickets = mergeTickets(apiTickets, sbTickets);

    console.log('[fetchTickets] Final:', apiTickets.length, 'API +', (allTickets.length - apiTickets.length), 'Supabase =', allTickets.length, 'total');

    return {
      success: true,
      data: allTickets,
      totalCount: totalCount + (allTickets.length - apiTickets.length),
    };
  } catch (error) {
    console.error('[fetchTickets] Error:', error);
    // Fallback ke Supabase saja jika terjadi error
    const sbTickets = await supabasePromise.catch(() => [] as TicketListItem[]);
    return { success: true, data: sbTickets, totalCount: sbTickets.length, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function fetchTicketById(ticketId: number): Promise<{ success: boolean; data?: TicketWithReplies; error?: string }> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/tickets/${ticketId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('[fetchTicketById] HTTP error:', response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json();

    // Handle different response formats:
    // 1. { success: true, data: {...} }
    // 2. { data: {...} }
    // 3. Direct object: {...}
    let ticketData = result.data || result;

    if (!ticketData || typeof ticketData !== 'object') {
      console.error('[fetchTicketById] Invalid data format:', result);
      return { success: false, error: 'Invalid response format' };
    }

    return {
      success: true,
      data: convertTicketWithReplies(ticketData),
    };
  } catch (error) {
    console.error('[fetchTicketById] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function fetchRelatedTickets(excludeId: number): Promise<{ success: boolean; data?: TicketListItem[]; error?: string }> {
  // Fetch recent tickets excluding the current one
  const result = await fetchTickets({ limit: 5 });

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: result.data?.filter(t => t.id !== excludeId).slice(0, 4),
  };
}

export async function fetchTicketStats(): Promise<{
  success: boolean
  data?: {
    total: number
    open: number
    in_progress: number
    answered: number
    on_hold: number
    closed: number
  }
  error?: string
}> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Fetch all status counts in parallel
    const statusCounts = await Promise.all([
      fetchTickets({ status: 'Open', limit: 1 }),
      fetchTickets({ status: 'In Progress', limit: 1 }),
      fetchTickets({ status: 'Answered', limit: 1 }),
      fetchTickets({ status: 'On Hold', limit: 1 }),
      fetchTickets({ status: 'Closed', limit: 1 }),
      fetchTickets({ limit: 1 }), // Total
    ]);

    return {
      success: true,
      data: {
        open: statusCounts[0].totalCount || 0,
        in_progress: statusCounts[1].totalCount || 0,
        answered: statusCounts[2].totalCount || 0,
        on_hold: statusCounts[3].totalCount || 0,
        closed: statusCounts[4].totalCount || 0,
        total: statusCounts[5].totalCount || 0,
      },
    };
  } catch (error) {
    console.error('[fetchTicketStats] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function fetchTicketHeaderById(ticketId: number): Promise<{ success: boolean; data?: TicketListItem; error?: string }> {
  const result = await fetchTicketById(ticketId);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  // Convert to TicketListItem format
  const { replies, ...ticketData } = result.data;
  return {
    success: true,
    data: ticketData,
  };
}

export async function fetchTicketRepliesPage(ticketId: number, limit: number, offset: number): Promise<{ success: boolean; data?: TicketReply[]; error?: string }> {
  const result = await fetchTicketById(ticketId);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  // Paginate replies locally (API returns all replies)
  const paginatedReplies = result.data.replies.slice(offset, offset + limit);

  return {
    success: true,
    data: paginatedReplies,
  };
}
