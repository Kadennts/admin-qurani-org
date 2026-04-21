import { createAdminClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const priority = searchParams.get('priority')
        const search = searchParams.get('search')
        const limit = parseInt(searchParams.get('limit') || '100')

        const supabase = await createAdminClient()

        let query = supabase
            .from('tickets')
            .select('id, ticket_number, subject, contact, department, project, service, priority, status, last_reply, submitted_date, body')
            .order('submitted_date', { ascending: false })
            .limit(limit)

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }
        if (priority && priority !== 'all') {
            query = query.eq('priority', priority)
        }
        if (search) {
            query = query.ilike('subject', `%${search}%`)
        }

        const { data, error } = await query

        if (error) {
            console.error('[API/tickets/supabase/list] Error:', error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            totalCount: data?.length || 0,
        })
    } catch (error) {
        console.error('[API/tickets/supabase/list] Unexpected error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
