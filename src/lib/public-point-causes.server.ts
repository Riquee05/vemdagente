export async function readPublicPointCauseIds(causeIds: string[]): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("point_causes")
    .select("point_id,collection_points!inner(is_active,curation_status,state)")
    .in("cause_id", causeIds)
    .eq("collection_points.is_active", true)
    .eq("collection_points.curation_status", "verified")
    .eq("collection_points.state", "SP")
    .limit(5000);
  if (error) throw new Error("Não foi possível carregar os vínculos das causas. Tente novamente.");
  return [...new Set((data ?? []).map((row) => row.point_id))];
}
