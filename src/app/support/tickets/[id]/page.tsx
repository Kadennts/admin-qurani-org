'use client';

import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import TicketDetailClient from "./TicketDetailClient"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function TicketDetailRoute() {
    const params = useParams();
    const ticketId = params?.id as string;

    const [initialTicket, setInitialTicket] = useState<any>(null);
    const [initialReplies, setInitialReplies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        async function loadTicketData() {
            const { ticketsApi, getStoredAuth } = await import('@/lib/api');
            const auth = getStoredAuth();

            if (!auth?.accessToken) {
                console.error('No auth token');
                setIsLoading(false);
                return;
            }

            // Try to get ticket from localStorage first
            const cachedTicket = localStorage.getItem(`ticket_cache_${ticketId}`);
            let ticketData: any = null;

            if (cachedTicket) {
                try {
                    const parsedTicket = JSON.parse(cachedTicket);
                    setInitialTicket(parsedTicket);
                    ticketData = parsedTicket;
                } catch (e) {
                    console.error('Failed to parse cached data:', e);
                }
            }

            // Department mapping
            const departmentMap: Record<string, string> = {
                '1': 'TECHNICAL', '2': 'BILLING', '3': 'SALES', '4': 'GENERAL', '5': 'SUPPORT',
            };

            // Deteksi apakah ini tiket Supabase (ID kecil) atau MyQurani API (18 digit snowflake)
            // Supabase: 1, 2, 3... | MyQurani: 86885945592250369, dll
            const isSupabaseTicket = parseInt(ticketId) < 1_000_000;

            // Try to fetch ticket detail with replies from API
            // We'll try multiple endpoints in case one fails
            let apiData: any = null;

            if (isSupabaseTicket) {
                // Tiket Supabase: langsung ke Method 4, skip MyQurani API sama sekali
                console.log('[TicketDetail] Supabase ticket detected (ID:', ticketId, '), skipping MyQurani API');
            } else {

            // Method 1: Try /api/v1/tickets/{id} (admin endpoint)
            try {
                const result = await ticketsApi.getTicketById(ticketId, auth.accessToken, { signal: controller.signal });

                if (result?.data || (result && !result.error)) {
                    apiData = result?.data || result;
                }
            } catch (e1) {
                // Ignore initial error, will try my ticket endpoint next
            }

            // Method 2: Try /api/v1/tickets/my/{id} (user's own ticket)
            if ((!apiData || !apiData.id) && !controller.signal.aborted) {
                try {
                    const result = await ticketsApi.getMyTicketById(ticketId, auth.accessToken, { signal: controller.signal });

                    if (result?.data || (result && !result.error)) {
                        apiData = result?.data || result;
                        console.log('[TicketDetail] Method 2 (my ticket) succeeded');
                    }
                } catch (e2) {
                    console.log('[TicketDetail] Method 2 failed, trying method 3...');
                }
            }

            // Method 3: Search in user's own ticket list (last resort)
            if ((!apiData || !apiData.id) && !controller.signal.aborted) {
                try {
                    const myTickets = await ticketsApi.getMyTickets({ pageSize: 100 }, auth.accessToken, { signal: controller.signal });
                    const ticketsList = myTickets?.data || myTickets?.items || myTickets || [];
                    const found = Array.isArray(ticketsList) 
                        ? ticketsList.find((t: any) => String(t.id) === String(ticketId))
                        : null;
                    if (found) {
                        apiData = found;
                        console.log('[TicketDetail] Method 3 (list search) succeeded');
                    }
                } catch (e3) {
                    console.log('[TicketDetail] Method 3 failed, trying Supabase...');
                }
            }

            } // end else (MyQurani API methods)

            // Method 4: Lookup dari Supabase via API route (untuk tiket yang dibuat via app kita)
            if ((!apiData || !apiData.id) && !controller.signal.aborted) {
                try {
                    const sbResponse = await fetch(`/api/tickets/supabase/${ticketId}`, {
                        signal: controller.signal,
                    });

                    if (sbResponse.ok) {
                        const sbResult = await sbResponse.json();
                        if (sbResult.success && sbResult.data?.ticket) {
                            const sbTicket = sbResult.data.ticket;
                            const sbReplies = sbResult.data.replies || [];

                            apiData = {
                                id: sbTicket.id,
                                subject: sbTicket.subject,
                                name: sbTicket.contact,
                                email: null,
                                department: sbTicket.department,
                                priorityName: sbTicket.priority || 'Medium',
                                statusName: sbTicket.status || 'Open',
                                message: sbTicket.body,
                                date: sbTicket.submitted_date,
                                lastReply: sbTicket.last_reply || null,
                                ticketKey: sbTicket.ticket_number || `#${sbTicket.id}`,
                                replies: sbReplies.map((r: any) => ({
                                    id: r.id,
                                    ticketId: r.ticket_id,
                                    name: r.author,
                                    email: null,
                                    message: r.message,
                                    date: r.date,
                                    isStaffReply: false,
                                    attachments: null,
                                })),
                            };
                            console.log('[TicketDetail] Method 4 (Supabase API) succeeded');
                        }
                    }
                } catch (e4) {
                    console.log('[TicketDetail] All methods failed including Supabase:', e4);
                }
            }

            if (controller.signal.aborted) return;

            // Process API data if we got it
            if (apiData && apiData.id) {
                // Build ticket object from API response
                const ticket = {
                    id: apiData.id,
                    ticket_number: apiData.ticketKey || `#${apiData.id}`,
                    subject: apiData.subject,
                    contact: apiData.name || apiData.email || ticketData?.contact || 'Unknown',
                    department: departmentMap[String(apiData.department)] || ticketData?.department || 'GENERAL',
                    project: null,
                    service: null,
                    priority: apiData.priorityName || ticketData?.priority || 'Medium',
                    status: apiData.statusName || ticketData?.status || 'Open',
                    last_reply: apiData.lastReply,
                    submitted_date: apiData.date,
                    body: apiData.message || ticketData?.body || null,
                };
                setInitialTicket(ticket);

                // Extract replies from API response
                const replies = apiData.replies || [];

                // Convert API replies to our format
                const formattedReplies = replies.map((r: any) => ({
                    id: r.id,
                    ticket_id: ticketId,
                    author: r.name || r.email || (r.isStaffReply ? 'Staff' : 'User'),
                    message: r.message || '',
                    date: r.date || r.createdAt,
                    attachments: r.attachments ? JSON.stringify(r.attachments.map((a: any) => a.url || a)) : null,
                }));

                setInitialReplies(formattedReplies);
            } else {
                // Fallback Removed: No longer fetching full list to find ticket (avoids 'api lama' heavy request)
                if (!ticketData) {
                    console.log('[TicketDetail] Could not load ticket details');
                }
            }

            setIsLoading(false);
        }

        if (ticketId) {
            loadTicketData();
        }

        return () => controller.abort();
    }, [ticketId]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <I18nProvider namespaces={["support"]}>
                <TicketDetailClient
                    ticketId={ticketId}
                    initialTicket={initialTicket}
                    initialReplies={initialReplies}
                    initialRelatedTickets={[]}
                    initialUsers={[]}
                />
            </I18nProvider>
        </DashboardLayout>
    )
}

