"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

/** Keep existing question URLs pointing to the single versioned submission workflow. */
export function ProgramWorkspaceRedirect() {
  const params = useParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const id = params.id as string;
  const orgId = params.orgId as string;
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await api.from("programs").select("classroom_id").eq("id", id).single();
      if (!active) return;
      if (error || !data?.classroom_id) { setError(error?.message || "Assignment not found."); return; }
      const classroom = await api.from("classrooms").select("id").eq("id", data.classroom_id).eq("organization_id", orgId).single();
      if (!active) return;
      if (classroom.error) { setError("Assignment not found in this organization."); return; }
      router.replace(`/${orgId}/student/classrooms/${data.classroom_id}/programs/${id}`);
    })();
    return () => { active = false; };
  }, [id, orgId, router]);
  return <p role={error ? "alert" : "status"} className="p-8">{error || "Opening assignment…"}</p>;
}
