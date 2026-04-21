import { createAdminClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const ticketId = parseInt(id)

        if (isNaN(ticketId)) {
            return NextResponse.json({ success: false, error: 'Invalid ticket ID' }, { status: 400 })
        }

        const supabase = await createAdminClient()

        // Ambil tiket
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .maybeSingle()

        if (ticketError || !ticket) {
            return NextResponse.json({ success: false, error: 'Ticket not found in Supabase' }, { status: 404 })
        }

        // Ambil replies
        const { data: replies } = await supabase
            .from('ticket_replies')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('date', { ascending: true })

        return NextResponse.json({
            success: true,
            data: {
                ticket,
                replies: replies || [],
            }
        })
    } catch (error) {
        console.error('[API/tickets/supabase] Error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
