"use server"

/**
 * Tickets Delete API
 *
 * NOTE: Delete ticket is NOT supported by API Qurani.
 * All functions return success: false with a clear message.
 * The delete UI has been removed from SupportTicketsPage.
 */

export async function deleteTicket(_ticketId: number): Promise<{ success: boolean; error?: string }> {
  console.warn('[deleteTicket] Delete is not supported by API Qurani');
  return { success: false, error: 'Delete ticket is not supported' };
}

export async function deleteTicketReply(_replyId: number): Promise<{ success: boolean; error?: string }> {
  console.warn('[deleteTicketReply] Delete reply is not supported by API Qurani');
  return { success: false, error: 'Delete reply is not supported' };
}

export async function bulkDeleteTickets(_ticketIds: number[]): Promise<{ success: boolean; error?: string }> {
  console.warn('[bulkDeleteTickets] Bulk delete is not supported by API Qurani');
  return { success: false, error: 'Bulk delete is not supported' };
}
