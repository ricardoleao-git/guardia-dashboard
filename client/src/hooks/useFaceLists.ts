import { useState, useEffect, useCallback } from "react";
import { data } from "@/lib/data";

export interface FaceListEntry {
  id: string;
  face_id: string;
  person_name: string;
  face_list: string;
  document: string | null;
  unit: string | null;
  role: string | null;
  photo_url: string | null;
  camera_serial: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useFaceLists() {
  const [entries, setEntries] = useState<FaceListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const rows = await data.faceLists.list({
        orderBy: { column: "person_name", ascending: true },
      });
      setEntries(rows as FaceListEntry[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    return data.faceLists.subscribe(fetchEntries);
  }, [fetchEntries]);

  const addEntry = useCallback(
    (entry: Partial<FaceListEntry>) => data.faceLists.insert(entry),
    []
  );

  const updateEntry = useCallback(
    (id: string, updates: Partial<FaceListEntry>) => data.faceLists.update(id, updates),
    []
  );

  const deleteEntry = useCallback((id: string) => data.faceLists.remove(id), []);

  return { entries, loading, error, refetch: fetchEntries, addEntry, updateEntry, deleteEntry };
}
