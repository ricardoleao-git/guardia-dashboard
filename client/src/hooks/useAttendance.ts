import { useState, useEffect, useCallback } from "react";
import { data } from "@/lib/data";

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
    try {
      const rows = await data.attendance.list({
        orderBy: { column: "event_time", ascending: false },
        where: selectedDate ? { date: selectedDate } : undefined,
      });
      setRecords(rows as AttendanceRecord[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchRecords();
    return data.attendance.subscribe(fetchRecords);
  }, [fetchRecords]);

  return { records, loading, error, refetch: fetchRecords };
}
