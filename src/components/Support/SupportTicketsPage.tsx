"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Plus,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle,
  Filter,
  FileSpreadsheet,
  FileText,
  Printer,
  X,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Eye,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchTickets, fetchTicketStats, type TicketListItem } from "@/utils/api/tickets/fetch"
import { bulkUpdateTickets } from "@/utils/api/tickets/update"
import { bulkDeleteTickets } from "@/utils/api/tickets/delete"
import { useAuth } from "@/hooks/use-auth"
// DISABLED: Supabase realtime subscriptions
// import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/hooks/use-translation"
import { formatDistanceToNowStrict } from "date-fns"
import { id, enUS } from "date-fns/locale"

type StatusType = "Open" | "In Progress" | "Answered" | "On Hold" | "Closed"
type PriorityType = "Low" | "Medium" | "High"
const DEPARTMENTS = ["Marketing", "Billing", "Support"]

export default function SupportTicketsPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { t, locale } = useTranslation(['support'])

  // Timezone dari profile user (disimpan di Supabase user_profiles.timezone saat user set lokasi)
  // Fallback ke 'UTC' jika belum di-set — auth-provider sudah meng-supplement dari Supabase
  const resolveTimezone = useCallback(() => {
    const isValidTimezone = (tz: string) => {
      try {
        new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(new Date())
        return true
      } catch {
        return false
      }
    }

    let cachedTimezone = ""
    try {
      const raw = localStorage.getItem('myqurani_user_profile_v2')
      if (raw) {
        const parsed = JSON.parse(raw)
        cachedTimezone = (parsed?.timezone || "").trim()
      }
    } catch {
      // no-op
    }

    const fromProfile = (profile?.timezone || "").trim()
    const preferred = cachedTimezone || fromProfile
    if (preferred && isValidTimezone(preferred)) return preferred
    if (fromProfile && isValidTimezone(fromProfile)) return fromProfile
    return "UTC"
  }, [profile?.timezone])

  const [userTimezone, setUserTimezone] = useState<string>("UTC")

  useEffect(() => {
    setUserTimezone(resolveTimezone())
  }, [resolveTimezone])

  // -- State --
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilters, setStatusFilters] = useState<StatusType[]>([])
  const [priorityFilters, setPriorityFilters] = useState<PriorityType[]>([])
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ start: string | null, end: string | null }>({ start: null, end: null })

  // Temp state for filter modal
  const [tempStatusFilters, setTempStatusFilters] = useState<StatusType[]>([])
  const [tempPriorityFilters, setTempPriorityFilters] = useState<PriorityType[]>([])
  const [tempDepartmentFilters, setTempDepartmentFilters] = useState<string[]>([])

  const [selectedTickets, setSelectedTickets] = useState<number[]>([])
  const [tickets, setTickets] = useState<TicketListItem[]>([])

  // Pagination State (Restored)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10) // Fixed to 10 as requested
  const [totalCount, setTotalCount] = useState(0)

  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // UI Toggles
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const exportDropdownRef = useRef<HTMLDivElement>(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showBulkSuccess, setShowBulkSuccess] = useState(false)

  // Bulk Action State
  const [bulkDelete, setBulkDelete] = useState(false)
  const [bulkStatus, setBulkStatus] = useState("")
  const [bulkDepartment, setBulkDepartment] = useState("")
  const [bulkPriority, setBulkPriority] = useState("")

  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    open: 0,
    in_progress: 0,
    answered: 0,
    on_hold: 0,
    closed: 0
  })

  const loadTickets = useCallback(async (signal?: AbortSignal, forceRefresh: boolean = false) => {
    // Use a static cache key for initial/default view (no filters)
    const isDefaultView = currentPage === 1 && statusFilters.length === 0 && priorityFilters.length === 0 && !searchQuery;
    const cacheKey = isDefaultView
      ? 'tickets_cache_default'
      : `tickets_cache_${currentPage}_${statusFilters.join(',')}_${priorityFilters.join(',')}_${searchQuery}`;

    // Try to use cached data if not forcing refresh
    // DISABLED CACHE: Always fetch fresh data to show request in network tab
    /*
    if (!forceRefresh && typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        console.log('[Tickets] Checking cache:', cacheKey, '| Found:', !!cached);
        if (cached) {
          const { tickets: cachedTickets, totalCount: cachedTotal, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          // Cache valid for 5 minutes (300000ms) - Allow empty lists
          if (age < 300000) {
            console.log('[Tickets] Using cached data, age:', Math.round(age / 1000), 'sec, count:', cachedTickets?.length);
            setTickets(cachedTickets || []);
            setTotalCount(cachedTotal || 0);
            setIsLoading(false);
            return;
          } else {
            console.log('[Tickets] Cache expired, age:', Math.round(age / 1000), 'sec');
          }
        }
      } catch (e) {
        console.error('[Tickets] Cache read error:', e);
      }
    }
    */

    console.log('[Tickets] Fetching from API...', { currentPage, statusFilters, priorityFilters, searchQuery });
    setIsLoading(true)
    try {
      const singleStatus = statusFilters.length === 1 ? statusFilters[0] : undefined
      const singlePriority = priorityFilters.length === 1 ? priorityFilters[0] : undefined

      const limit = itemsPerPage
      const offset = (currentPage - 1) * limit
      const page = currentPage

      // Try client-side API first (uses localStorage tokens like My-Qurani example)
      try {
        const { ticketsApi, getStoredAuth } = await import('@/lib/api');
        const auth = getStoredAuth();

        if (auth?.accessToken) {
          // Map status name to number
          const statusMap: Record<string, number> = {
            'Open': 1, 'In Progress': 2, 'Answered': 3, 'On Hold': 4, 'Closed': 5
          };
          const priorityMap: Record<string, number> = {
            'Low': 1, 'Medium': 2, 'High': 3
          };

          const params = {
            page,
            pageSize: limit,
            status: singleStatus ? statusMap[singleStatus] : undefined,
            priority: singlePriority ? priorityMap[singlePriority] : undefined,
          };

          // Department mapping (ID → Name) - API returns string IDs
          const departmentMap: Record<string, string> = {
            '1': 'MARKETING',
            '2': 'BILLING',
            '3': 'SUPPORT',
          };



          // Helper to convert API response to local format
          const convertTickets = (data: any) => {
            const ticketData = Array.isArray(data) ? data : (data.data || data || []);
            return ticketData.map((t: any) => ({
              id: t.id,
              ticket_number: t.ticketKey || `#${t.id}`,
              subject: t.subject,
              contact: t.name || t.email || 'Unknown',
              department: departmentMap[String(t.department)] || 'GENERAL',
              project: null,
              service: null,
              priority: t.priorityName || 'Medium',
              status: t.statusName || 'Open',
              last_reply: t.lastReply || null,
              submitted_date: t.date,
              body: t.message || null,
            }));
          };

          // Try /api/v1/tickets first (admin endpoint - all tickets)
          let result = await ticketsApi.getTickets(
            { ...params, keyword: searchQuery || undefined },
            auth.accessToken,
            { signal }
          );

          // API response format: { success, data: { items: [...], totalCount, ... } }
          let responseData = result?.data || result;
          // Check for items array (MyQurani API format), then data array, then direct array
          let tickets = responseData?.items || responseData?.data || (Array.isArray(responseData) ? responseData : []);
          let total = responseData?.totalCount || tickets.length;
          
          // If no tickets from admin endpoint, try /api/v1/tickets/my (user's own tickets)
          if (tickets.length === 0 && (!signal || !signal.aborted)) {
            try {
              result = await ticketsApi.getMyTickets(params, auth.accessToken, { signal });
              responseData = result?.data || result;
              tickets = responseData?.items || responseData?.data || (Array.isArray(responseData) ? responseData : []);
              total = responseData?.totalCount || tickets.length;
            } catch (myTicketsError) {
              // Ignore
            }
          }

          if (signal?.aborted) return;

          // API Qurani only (no Supabase merge/fallback)
          const finalTickets = tickets.length > 0 ? convertTickets(tickets) : [];
          const finalTotal = total;

          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              tickets: finalTickets,
              totalCount: finalTotal,
              timestamp: Date.now()
            }));
            console.log('[Tickets] Saved to cache:', cacheKey, '| count:', finalTickets.length);
          } catch (e) {
            console.error('[Tickets] Cache write error:', e);
          }

          if (finalTickets.length > 0) {
            setTickets(finalTickets);
            setTotalCount(finalTotal);
            setIsLoading(false);
            return;
          }
        }
      } catch (clientError) {
        console.error('[Tickets] Client API failed:', clientError);
      }

      if (signal?.aborted) return;

      // Empty state when Qurani API doesn't return tickets
      setTickets([]);
      setTotalCount(0);

    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error loading tickets:", error)
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }, [priorityFilters, searchQuery, statusFilters, currentPage, itemsPerPage])

  // Silent reload for background updates - just call loadTickets
  const loadTicketsSilently = useCallback(async () => {
    await loadTickets();
  }, [loadTickets]);

  const isLoadingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    // Prevent duplicate calls
    if (isLoadingRef.current) return;

    // Only auto-load on mount or when filters change
    const load = async () => {
      isLoadingRef.current = true;
      await loadTickets(controller.signal);
      isLoadingRef.current = false;
    };

    load();

    return () => {
      controller.abort();
      isLoadingRef.current = false;
    };
  }, [statusFilters, priorityFilters, departmentFilters, searchQuery, currentPage, dateRange, loadTickets]);

  // Load stats via client-side API (sama seperti loadTickets agar konsisten)
  const loadStats = useCallback(async () => {
    try {
      const { getStoredAuth } = await import('@/lib/api');
      const auth = getStoredAuth();
      if (!auth?.accessToken) return;

      const API = process.env.NEXT_PUBLIC_MYQURANI_API_URL || 'https://api.myqurani.com';
      const res = await fetch(`${API}/api/v1/tickets/statuses`, {
        headers: { Authorization: `Bearer ${auth.accessToken}`, Accept: 'application/json' }
      });
      if (!res.ok) return;
      
      const json = await res.json();
      const statusData = json?.data || json || [];
      
      let totalAll = 0;
      const stats = { all: 0, open: 0, in_progress: 0, answered: 0, on_hold: 0, closed: 0 };
      
      if (Array.isArray(statusData)) {
          statusData.forEach((s: any) => {
              const name = (s.name || '').toLowerCase();
              const count = s.count || s.total || s.totalCount || s.ticketCount || 0;
              totalAll += count;
              if (name === 'open') stats.open = count;
              else if (name === 'in progress') stats.in_progress = count;
              else if (name === 'answered') stats.answered = count;
              else if (name === 'on hold') stats.on_hold = count;
              else if (name === 'closed') stats.closed = count;
          });
          stats.all = totalAll;
      }
      
      console.log('[Tickets] Stats (client):', stats);
      setStatusCounts(stats);
    } catch (e) {
      console.error('[Tickets] loadStats error:', e);
    }
  }, []);

  // Jalankan loadStats sekali saat mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // NOTE: Supabase realtime subscriptions DISABLED to eliminate Supabase requests
  // TODO: Replace with MyQurani API websocket/polling when available
  /*
  // Realtime subscription for ticket replies - run only once on mount
  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: any = null;

    try {
      supabase = createClient();
      channel = supabase
        .channel("realtime-support-ticket-replies")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "ticket_replies" },
          (payload) => {
            console.log(" New ticket reply received:", payload);
            loadTicketsSilently();
          }
        )
        .subscribe((status) => {
          console.log("Realtime subscription (replies) status:", status);
        });
    } catch (error) {
      console.error("Failed to init realtime client:", error);
    }

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Realtime subscription for new tickets - run only once on mount
  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: any = null;

    try {
      supabase = createClient();
      channel = supabase
        .channel("realtime-support-tickets")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "tickets" },
          (payload) => {
            console.log(" New ticket received:", payload);
            loadTickets();
          }
        )
        .subscribe((status) => {
          console.log(" Realtime subscription (tickets) status:", status);
        });
    } catch (error) {
      console.error("Failed to init realtime client:", error);
    }

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);
  */

  // --- Handlers ---

  const handleDatePreset = (months: number | 'year') => {
    const end = new Date()
    const start = new Date()
    if (months === 'year') {
      start.setFullYear(end.getFullYear() - 1)
    } else {
      start.setMonth(end.getMonth() - months)
    }

    const toStr = (d: Date) => d.toISOString().split('T')[0]
    setDateRange({ start: toStr(start), end: toStr(end) })
    setCurrentPage(1)
  }

  const handleExport = (type: "excel" | "csv" | "print") => {
    if (tickets.length === 0) return
    setIsExporting(true)
    setShowExportDropdown(false)

    const reportTitle = t("export.report_title", "Tickets Report")
    const reportHeading = t("export.report_heading", "Support Tickets Report")
    const headers = [
      t("export.headers.id", "ID"),
      t("export.headers.ticket_number", "Ticket Number"),
      t("export.headers.subject", "Subject"),
      t("export.headers.department", "Department"),
      t("export.headers.contact", "Contact"),
      t("export.headers.status", "Status"),
      t("export.headers.priority", "Priority"),
      t("export.headers.last_reply", "Last Reply"),
      t("export.headers.created", "Created")
    ]
    const rows = tickets.map((t) => [
      t.id,
      t.ticket_number,
      t.subject,
      t.department,
      t.contact,
      t.status,
      t.priority,
      t.last_reply || "-",
      t.submitted_date
    ])

    // ... (Export logic standard)
    if (type === "csv") {
      const csvRows = rows.map((r) => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      const csv = [headers.join(","), ...csvRows].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "tickets.csv"
      link.click()
      URL.revokeObjectURL(url)
    } else if (type === "excel") {
      const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'
      const workbookStart = '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Tickets"><Table>'
      const workbookEnd = '</Table></Worksheet></Workbook>'
      const headerRow = '<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>'
      const dataRows = rows.map(r => '<Row>' + r.map(cell => `<Cell><Data ss:Type="String">${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`).join('') + '</Row>').join('')
      const xml = xmlHeader + workbookStart + headerRow + dataRows + workbookEnd
      const blob = new Blob([xml], { type: "application/vnd.ms-excel" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "tickets.xls"
      link.click()
      URL.revokeObjectURL(url)
    } else if (type === "print") {
      const printContent = `
        <html><head><title>${reportTitle}</title><style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #10b981; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
        </style></head><body>
          <h1>${reportHeading}</h1>
          <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(r => `<tr>${r.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </body></html>`
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.document.close()
        setTimeout(() => { printWindow.print(); printWindow.close() }, 250)
      }
    }
    setTimeout(() => setIsExporting(false), 300)
  }

  const handleBulkAction = () => {
    if (!selectedTickets.length) {
      window.alert(t('select_tickets_warning'))
      return
    }
    setShowBulkModal(true)
  }

  const handleBulkConfirm = async () => {
    try {
      if (bulkDelete) {
        await bulkDeleteTickets(selectedTickets)
      } else {
        const updates: Record<string, string> = {}
        if (bulkStatus) updates.status = bulkStatus
        if (bulkDepartment) updates.department = bulkDepartment
        if (bulkPriority) updates.priority = bulkPriority
        if (Object.keys(updates).length > 0) {
          await bulkUpdateTickets(selectedTickets, updates)
        }
      }
      setSelectedTickets([])
      setShowBulkModal(false)
      setBulkDelete(false); setBulkStatus(""); setBulkDepartment(""); setBulkPriority("");
      setShowBulkSuccess(true)
      setTimeout(() => setShowBulkSuccess(false), 2000)
      loadTickets()
      loadStats()
    } catch (error) {
      console.error("Bulk action error:", error)
    }
  }

  const handleNavigateToTicket = (ticket: TicketListItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      localStorage.setItem(`ticket_cache_${ticket.id}`, JSON.stringify(ticket));
    } catch (err) {
      console.error("Failed to save ticket cache:", err);
    }
    router.push(`/support/tickets/${ticket.id}`);
  }

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; badgeVariant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      Open: { label: t("status_labels.open", "Open"), badgeVariant: 'destructive', icon: <AlertCircle className="w-3 h-3 mr-1" /> },
      "In Progress": { label: t("status_labels.in_progress", "In Progress"), badgeVariant: 'secondary', icon: <Clock className="w-3 h-3 mr-1" /> },
      Answered: { label: t("status_labels.answered", "Answered"), badgeVariant: 'secondary', icon: <MessageSquare className="w-3 h-3 mr-1" /> },
      "On Hold": { label: t("status_labels.on_hold", "On Hold"), badgeVariant: 'outline', icon: <Clock className="w-3 h-3 mr-1" /> },
      Closed: { label: t("status_labels.closed", "Closed"), badgeVariant: 'secondary', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
    }
    const fallbackClass: Record<string, string> = {
      Open: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200",
      "In Progress": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200",
      Answered: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
      "On Hold": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200",
      Closed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200"
    }
    return {
      ...config[status] || { label: status, badgeVariant: 'secondary', icon: null },
      className: fallbackClass[status] || "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityConfig = (priority: string) => {
    const config: Record<string, { label: string; className: string }> = {
      Low: { label: t("priority_labels.low", "Low"), className: 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800' },
      Medium: { label: t("priority_labels.medium", "Medium"), className: 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' },
      High: { label: t("priority_labels.high", "High"), className: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20' },
    }
    return config[priority] || { label: priority, className: 'text-gray-500 bg-gray-100' }
  }

  const handleSelectAll = () => {
    if (selectedTickets.length === tickets.length) {
      setSelectedTickets([])
    } else {
      setSelectedTickets(tickets.map(t => t.id))
    }
  }

  const handleSelectTicket = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedTickets(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id])
  }

  const formatDate = (dateString: string | null, variant: 'short' | 'long' | 'relative' = 'long') => {
    if (!dateString) return "-"
    try {
      // Normalize: replace space separator with T, and append Z if no timezone info
      let dateStr = dateString.trim()
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        dateStr = dateStr.replace(' ', 'T')
      }
      if (!dateStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
        dateStr = dateStr + 'Z'
      }
      const date = new Date(dateStr)
      if (Number.isNaN(date.getTime())) return dateString

      if (variant === 'relative') {
        const localeObj = locale === 'id' ? id : enUS
        return formatDistanceToNowStrict(date, { addSuffix: true, locale: localeObj })
      }

      // Timezone-aware formatting using Intl.DateTimeFormat
      // userTimezone comes from profile.timezone (e.g. "Asia/Jakarta", "Europe/London")
      const tz = userTimezone || 'UTC'
      const options: Intl.DateTimeFormatOptions = {
        day: "2-digit",
        month: "short",
        timeZone: tz,
      };

      if (variant === 'long') {
        options.year = "numeric";
        options.hour = "2-digit";
        options.minute = "2-digit";
        options.hour12 = false;
        options.timeZoneName = "short"; // Tambahkan WIB / BST / EST / dll
      }

      return new Intl.DateTimeFormat(
        locale === 'id' ? 'id-ID' : 'en-GB',
        options
      ).format(date)
    } catch {
      return dateString
    }
  }


  // Pagination Logic
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-4 w-full mx-auto min-h-screen bg-gray-50/50 dark:bg-black/20">
      {/* Toast Success */}
      {showBulkSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{t('success_bulk')}</span>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-1">
        {/* Scrollable Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
          <button
            onClick={() => { setStatusFilters([]); setCurrentPage(1); }}
            className={cn(
              "relative px-4 py-2 text-sm font-medium transition-all rounded-t-lg whitespace-nowrap flex items-center gap-2",
              statusFilters.length === 0
                ? "text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50"
            )}
          >
            {t('all_tickets')}
            <Badge variant="secondary" className="ml-1 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 h-5 px-1.5 min-w-[1.25rem]">{statusCounts.all}</Badge>
          </button>
          {/* Status buttons logic remains mostly same, can translate status if needed but status keys are usually db values */}
          {(["Open", "In Progress", "Answered", "On Hold", "Closed"] as StatusType[]).map((status) => {
            const countKey = status.toLowerCase().replace(" ", "_") as keyof typeof statusCounts
            const isSelected = statusFilters.includes(status)
            return (
              <button
                key={status}
                onClick={() => {
                  setStatusFilters(isSelected ? [] : [status])
                  setCurrentPage(1)
                }}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium transition-all rounded-t-lg whitespace-nowrap flex items-center gap-2",
                  isSelected
                    ? "text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50"
                )}
              >
                {getStatusConfig(status).label}
                <Badge variant="secondary" className={cn(
                  "ml-1 h-5 px-1.5 min-w-[1.25rem]",
                  isSelected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                )}>
                  {statusCounts[countKey] || 0}
                </Badge>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher Removed */}
          <Button
            onClick={() => router.push('/support/tickets/new')}
            className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all hover:shadow-md h-9"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('new_ticket')}
          </Button>
        </div>
      </div>

      {/* --- TOOLBAR SECTION --- */}
      <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">

        {/* Left Side: Bulk, Export */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 whitespace-nowrap text-xs">
                {t('bulk_actions')} <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleBulkAction}>{t('edit_selected')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu
            open={showExportDropdown}
            onOpenChange={setShowExportDropdown}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 whitespace-nowrap text-xs" disabled={isExporting}>
                {isExporting ? <RefreshCw className="w-3 h-3 animate-spin mr-2" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-gray-500" />}
                {t("export_label", "Export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-600" /> {t("export.excel", "Excel")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileText className="w-3.5 h-3.5 mr-2 text-blue-600" /> {t("export.csv", "CSV")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("print")}>
                <Printer className="w-3.5 h-3.5 mr-2 text-gray-600" /> {t("export.print", "Print")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Side: Search, Date, Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
          {/* Search Bar Reverted to Standard */}
          <div className="flex items-center gap-2 w-full sm:w-64 order-2 sm:order-1">
            <div className="relative w-full">
              <div className="absolute left-1 top-1 bottom-1 w-7 flex items-center justify-center bg-emerald-500 rounded-md">
                <Search className="h-4 w-4 text-white" />
              </div>
              <input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearchQuery(searchInput)
                    setCurrentPage(1)
                  }
                }}
                className="w-full pl-10 pr-4 h-9 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-950 focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible order-1 sm:order-2">

            {/* Date Filter Enhanced */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 w-full sm:w-auto justify-start sm:justify-center whitespace-nowrap text-xs", (dateRange.start || dateRange.end) && "border-emerald-500 text-emerald-700 bg-emerald-50")}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                  {dateRange.start ? (
                    <span>{dateRange.start}{dateRange.end ? ` - ${dateRange.end}` : ''}</span>
                  ) : t('date_range')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="end">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDatePreset(0)} className="text-xs">{t('this_month')}</Button>
                    <Button size="sm" variant="outline" onClick={() => handleDatePreset(3)} className="text-xs">{t('last_3_months')}</Button>
                    <Button size="sm" variant="outline" onClick={() => handleDatePreset(6)} className="text-xs">{t('last_6_months')}</Button>
                    <Button size="sm" variant="outline" onClick={() => handleDatePreset('year')} className="text-xs">{t('last_year')}</Button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="space-y-1 flex-1">
                      <label className="text-[10px] font-medium uppercase text-gray-500">{t('start')}</label>
                      <input type="date" className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm"
                        value={dateRange.start || ""}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <label className="text-[10px] font-medium uppercase text-gray-500">{t('end')}</label>
                      <input type="date" className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm"
                        value={dateRange.end || ""}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs"
                      onClick={() => { setDateRange({ start: null, end: null }); setCurrentPage(1); }}
                    >
                      {t('clear')}
                    </Button>
                    <Button size="sm" className="flex-1 bg-emerald-600 text-white text-xs"
                      onClick={() => setCurrentPage(1)}
                    >
                      {t('apply')}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Main Filter Button */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 w-full sm:w-auto border-dashed whitespace-nowrap text-xs",
                (statusFilters.length > 0 || priorityFilters.length > 0 || departmentFilters.length > 0) && "border-emerald-500 bg-emerald-50 text-emerald-700"
              )}
              onClick={() => {
                setTempStatusFilters([...statusFilters])
                setTempPriorityFilters([...priorityFilters])
                setTempDepartmentFilters([...departmentFilters])
                setShowFilterPanel(true)
              }}
            >
              <Filter className="w-3 h-3 mr-2" />
              {t('filters')}
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-emerald-600" onClick={() => loadTickets()} disabled={isLoading}>
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* --- CONTENT SECTION --- */}
      {!isLoading && tickets.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('no_tickets_found')}</h3>
          <Button variant="outline" className="mt-6"
            onClick={() => {
              setSearchQuery(""); setSearchInput(""); setStatusFilters([]); setDepartmentFilters([]); setPriorityFilters([]); setDateRange({ start: null, end: null }); setCurrentPage(1);
            }}
          >
            {t('clear_all_filters')}
          </Button>
        </div>
      ) : (
        <>
          {/* MOBILE CARD VIEW (<640px) */}
          <div className="space-y-3 sm:hidden">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-l-4 border-l-transparent shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-800" />
                        <Skeleton className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-800" />
                        <span className="text-gray-300">-</span>
                        <Skeleton className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
                        <Skeleton className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-800" />
                      </div>
                      <Skeleton className="h-7 w-12 rounded bg-gray-200 dark:bg-gray-800" />
                    </div>
                  </CardContent>
                </Card>
              ))
              : tickets.slice(0, itemsPerPage).map((ticket) => {
                const statusConfig = getStatusConfig(ticket.status)
                const priorityConfig = getPriorityConfig(ticket.priority)
                return (
                  <Card key={ticket.id} className="overflow-hidden border-l-4 border-l-transparent hover:border-l-emerald-500 transition-all shadow-sm active:scale-[0.99]">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {ticket.ticket_number}
                          </span>
                          <Badge variant={statusConfig.badgeVariant} className={cn("text-[10px] h-5 px-1.5 border-0", statusConfig.className)}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 -mr-2">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleNavigateToTicket(ticket, e as any)}>{t('view_details')}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div onClick={(e) => handleNavigateToTicket(ticket, e as any)} className="cursor-pointer group">
                        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1 text-sm group-hover:text-emerald-600 transition-colors">
                          {ticket.subject}
                        </h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">{ticket.department}</span>
                          <span className="text-gray-300">-</span>
                          {ticket.contact && ticket.contact.startsWith('@') ? (
                            <div onClick={(e) => e.stopPropagation()} className="inline-block">
                              <Link
                                href={`/profile/${ticket.contact.replace(/^@/, '')}`}
                                className="font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
                              >
                                {ticket.contact}
                              </Link>
                            </div>
                          ) : (
                            <span className="font-medium text-gray-700 dark:text-gray-300">{ticket.contact}</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 border-0 font-normal", priorityConfig.className)}>
                            {priorityConfig.label}
                          </Badge>
                          <span className="text-[10px] text-gray-400">
                            {formatDate(ticket.last_reply, 'relative')}
                          </span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2" onClick={(e) => handleNavigateToTicket(ticket, e as any)}>
                          {t('view')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>

          {/* TABLE VIEW (Tablet & Desktop) */}
          <div className="hidden sm:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-950 text-gray-500 font-medium border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-4 py-3 w-[40px] text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-emerald-500 text-emerald-600"
                        checked={selectedTickets.length === tickets.length && tickets.length > 0 ? true : false}
                        onChange={handleSelectAll}
                        disabled={isLoading}
                      />
                    </th>
                    <th className="px-4 py-3 w-[180px]">{t('subject')}</th>
                    <th className="px-4 py-3 w-[140px] hidden md:table-cell">{t('status')}</th>
                    <th className="px-4 py-3 hidden md:table-cell">{t('priority')}</th>
                    <th className="px-4 py-3 hidden lg:table-cell">{t('department')}</th>
                    <th className="px-4 py-3 hidden lg:table-cell">{t('contact')}</th>
                    <th className="px-4 py-3 hidden xl:table-cell">{t('created')}</th>
                    <th className="px-4 py-3 text-right">{t('last_reply')}</th>
                    <th className="px-4 py-3 w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="bg-white dark:bg-gray-900">
                        <td className="px-4 py-3 text-center">
                          <input type="checkbox" disabled checked={false} className="rounded border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50" />
                        </td>
                        <td className="px-4 py-3 max-w-[300px]">
                          <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
                            <Skeleton className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-800 opacity-70" />
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Skeleton className="h-5 w-24 rounded-full bg-gray-200 dark:bg-gray-800" />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Skeleton className="h-5 w-16 rounded bg-gray-200 dark:bg-gray-800" />
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <Skeleton className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
                            <Skeleton className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <Skeleton className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <Skeleton className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                            <Skeleton className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-800 opacity-70" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {/* Action placeholder */}
                          <Skeleton className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 ml-auto opacity-50" />
                        </td>
                      </tr>
                    ))
                    : tickets.slice(0, itemsPerPage).map((ticket, index) => {
                      const statusConfig = getStatusConfig(ticket.status)
                      const priorityConfig = getPriorityConfig(ticket.priority)
                      const isSelected = selectedTickets.includes(ticket.id)

                      return (
                        <tr
                          key={ticket.id}
                          className={cn(
                            "group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer",
                            isSelected && "bg-emerald-50/60 dark:bg-emerald-900/10",
                            index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/30 dark:bg-gray-900/50"
                          )}
                          onClick={(e) => handleNavigateToTicket(ticket, e as any)}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-emerald-500 text-emerald-600"
                              checked={isSelected === true}
                              onChange={(e) => handleSelectTicket(ticket.id, e as unknown as React.MouseEvent)}
                            />
                          </td>
                          <td className="px-4 py-3 max-w-[300px]">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 dark:text-white truncate" title={ticket.subject}>{ticket.subject}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400 font-mono">{String(ticket.ticket_number || ticket.id).replace(/^#+/, '')}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <Badge className={cn("font-medium whitespace-nowrap", statusConfig.className)} variant="outline">
                              {statusConfig.icon} {statusConfig.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <Badge variant="secondary" className={cn("font-normal border-0 text-xs", priorityConfig.className)}>
                              {priorityConfig.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-gray-600 dark:text-gray-300 text-sm">
                            {ticket.department}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {ticket.contact.charAt(0)}
                              </div>
                              {ticket.contact && ticket.contact.startsWith('@') ? (
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Link
                                    href={`/profile/${ticket.contact.replace(/^@/, '')}`}
                                    className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-sm transition-colors cursor-pointer inline-block truncate max-w-[120px]"
                                  >
                                    {ticket.contact}
                                  </Link>
                                </div>
                              ) : (
                                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px] text-sm">{ticket.contact}</span>
                              )}
                            </div>
                          </td>
                          <td
                            className="px-4 py-3 hidden xl:table-cell text-xs text-gray-500 whitespace-nowrap cursor-help"
                            title={`${formatDate(ticket.submitted_date, 'long')} (${userTimezone})`}
                          >
                            {formatDate(ticket.submitted_date, 'relative')}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span
                              className="text-sm text-gray-700 dark:text-gray-300 font-medium cursor-help"
                              title={ticket.last_reply
                                ? `${formatDate(ticket.last_reply, 'long')} (${userTimezone})`
                                : undefined
                              }
                            >
                              {formatDate(ticket.last_reply, 'relative')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => handleNavigateToTicket(ticket, e as any)}>
                                  <Eye className="w-3.5 h-3.5 mr-2" /> {t("view_details", "View Details")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
            {/* Pagination Footer (RESTORED) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                <p className="text-xs text-gray-500">
                  {t("pagination.showing", "Showing {{start}}-{{end}} of {{total}}", {
                    start: tickets.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0,
                    end: (currentPage - 1) * itemsPerPage + Math.min(tickets.length, itemsPerPage),
                    total: totalCount
                  })}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="flex items-center px-2 text-sm text-gray-500 font-medium">
                    {t("pagination.page_of", "Page {{page}} of {{total}}", { page: currentPage, total: totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Main Filter Modal */}
      {showFilterPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t('filters')}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowFilterPanel(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Department Filters */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t('department')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {DEPARTMENTS.map(dept => (
                    <label key={dept} className={cn("flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all", tempDepartmentFilters.includes(dept) ? "border-emerald-500 bg-emerald-50" : "border-gray-200")}>
                      <input type="checkbox" className="rounded accent-emerald-600" checked={tempDepartmentFilters.includes(dept) === true}
                        onChange={() => setTempDepartmentFilters(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept])}
                      />
                      <span className="text-sm">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filters */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t('status')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Open", "In Progress", "Answered", "On Hold", "Closed"] as StatusType[]).map((status) => (
                    <label key={status} className={cn(
                      "flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all",
                      tempStatusFilters.includes(status) ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700"
                    )}>
                      <input type="checkbox" className="rounded accent-emerald-600" checked={tempStatusFilters.includes(status) === true}
                        onChange={() => setTempStatusFilters(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status])}
                      />
                      <span className="text-sm">{getStatusConfig(status).label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority Filters */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t('priority')}</label>
                <div className="flex gap-2">
                  {(["Low", "Medium", "High"] as PriorityType[]).map((priority) => (
                    <label key={priority} className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-2 border rounded-lg cursor-pointer transition-all",
                      tempPriorityFilters.includes(priority) ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700"
                    )}>
                      <input type="checkbox" className="hidden" checked={tempPriorityFilters.includes(priority) === true}
                        onChange={() => setTempPriorityFilters(prev => prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority])}
                      />
                      <span className={cn("text-sm font-medium", tempPriorityFilters.includes(priority) ? "text-emerald-700" : "text-gray-600")}>{getPriorityConfig(priority).label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => {
                setTempStatusFilters([])
                setTempPriorityFilters([])
                setTempDepartmentFilters([])
              }}>{t('clear')}</Button>
              <Button onClick={() => {
                setStatusFilters([...tempStatusFilters])
                setPriorityFilters([...tempPriorityFilters])
                setDepartmentFilters([...tempDepartmentFilters])
                setCurrentPage(1)
                setShowFilterPanel(false)
              }} className="bg-emerald-600 hover:bg-emerald-700 text-white">{t('apply')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* --- BULK ACTION MODAL --- */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold">{t('bulk_actions')}</h2>

            <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button
                className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-all", !bulkDelete ? "bg-white dark:bg-gray-600 shadow-sm" : "text-gray-500 dark:text-gray-400")}
                onClick={() => setBulkDelete(false)}
              >
                {t('update')}
              </button>
              <button
                className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-all", bulkDelete ? "bg-red-50 text-red-600 dark:bg-red-900/30" : "text-gray-500 dark:text-gray-400")}
                onClick={() => setBulkDelete(true)}
              >
                {t('delete')}
              </button>
            </div>

            {bulkDelete ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  {t('bulk_delete_warning', `Warning: You are about to delete ${selectedTickets.length} tickets!`, { count: selectedTickets.length })}
                </p>
                <p className="text-xs text-red-600 dark:text-red-300">
                  {t("bulk_delete_irreversible", "This action cannot be undone.")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">{t('status')}</label>
                  <select
                    className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                  >
                    <option value="">{t('no_change', 'No Change')}</option>
                    <option value="Open">{getStatusConfig("Open").label}</option>
                    <option value="In Progress">{getStatusConfig("In Progress").label}</option>
                    <option value="Answered">{getStatusConfig("Answered").label}</option>
                    <option value="On Hold">{getStatusConfig("On Hold").label}</option>
                    <option value="Closed">{getStatusConfig("Closed").label}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">{t('department')}</label>
                  <select
                    className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                    value={bulkDepartment}
                    onChange={(e) => setBulkDepartment(e.target.value)}
                  >
                    <option value="">{t('no_change', 'No Change')}</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">{t('priority')}</label>
                  <select
                    className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                    value={bulkPriority}
                    onChange={(e) => setBulkPriority(e.target.value)}
                  >
                    <option value="">{t('no_change', 'No Change')}</option>
                    <option value="Low">{getPriorityConfig("Low").label}</option>
                    <option value="Medium">{getPriorityConfig("Medium").label}</option>
                    <option value="High">{getPriorityConfig("High").label}</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowBulkModal(false); setBulkDelete(false); }}>
                {t('cancel')}
              </Button>
              <Button
                className={cn("flex-1 text-white", bulkDelete ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700")}
                onClick={handleBulkConfirm}
              >
                {bulkDelete ? t('delete') : t('update')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Button
        className="sm:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-emerald-600 hover:bg-emerald-700 text-white z-40 transition-transform hover:scale-105 active:scale-95"
        onClick={() => router.push('/support/tickets/new')}
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  )
}
