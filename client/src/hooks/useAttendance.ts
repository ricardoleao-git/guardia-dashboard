import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { isGuestSession } from "@/lib/guest-mode";
const supabase = supabaseClient!;

export interface AttendanceRecord {
  id: string;
  person_id: string | null;
  person_name: string;
  event_id: string | null;
  camera_serial: string | null;
  direction: string;
  event_time: string;
  date: string;
  created_at: string;
}

export function useAttendance(selectedDate?: string) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!isSupabaseConfigured || isGuestSession()) {
      setLoading(false);
      return;
    }
    try {
      let query = supabase.from("attendance").select("*").order("event_time", { ascending: false });
      if (selectedDate) {
        query = query.eq("date", selectedDate);
      }
      const { data, error } = await query;
      if (error) throw error;
      setRecords(data as AttendanceRecord[] || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchRecords();
    if (!isSupabaseConfigured || isGuestSession()) return;
    const channel = supabase
      .channel("attendance_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => fetchRecords())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRecords]);

  return { records, loading, error, refetch: fetchRecords };
}
