import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireAdminAuthorization } from "@/lib/admin-authorization";
import { assertStepUp } from "@/lib/admin-2fa.functions";
type Context = { userId: string; supabase: SupabaseClient<Database> };
type Status = "open" | "resolved" | "closed";
export async function readHelpRequests({
  data,
  context,
}: {
  data: { page: number; status: Status | "all" };
  context: Context;
}) {
  await requireAdminAuthorization(context.userId, context.supabase);
  await assertStepUp(context.userId);
  let query = context.supabase
    .from("help_requests")
    .select(
      "id, city, note, status, created_at, updated_at, lat, lng, requester_id, item_categories(label)",
      { count: "exact" },
    );
  if (data.status !== "all") query = query.eq("status", data.status);
  const {
    data: rows,
    count,
    error,
  } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range((data.page - 1) * 20, data.page * 20 - 1);
  if (error) throw new Error("Não foi possível carregar os pedidos de ajuda.");
  return { rows: rows ?? [], total: count ?? 0 };
}
export async function changeHelpRequest({
  data,
  context,
}: {
  data: { id: string; status: Status; previousStatus: Status };
  context: Context;
}) {
  await requireAdminAuthorization(context.userId, context.supabase);
  await assertStepUp(context.userId);
  const { data: row, error } = await context.supabase
    .from("help_requests")
    .update({ status: data.status })
    .eq("id", data.id)
    .eq("status", data.previousStatus)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Não foi possível atualizar o pedido.");
  if (!row) throw new Error("O pedido mudou ou não está disponível. Atualize a lista.");
  return { ok: true as const };
}

export async function readHelpRequestLocation({
  data,
  context,
}: {
  data: { id: string };
  context: Context;
}) {
  await requireAdminAuthorization(context.userId, context.supabase);
  await assertStepUp(context.userId);
  const { data: row, error } = await context.supabase
    .from("help_requests")
    .select("lat, lng")
    .eq("id", data.id)
    .maybeSingle();
  if (error || !row) throw new Error("Pedido não disponível.");
  if (
    row.lat === null ||
    row.lng === null ||
    !Number.isFinite(row.lat) ||
    !Number.isFinite(row.lng) ||
    Math.abs(row.lat) > 90 ||
    Math.abs(row.lng) > 180
  )
    return null;
  const { reverseRequestLocation } = await import("./request-location.server");
  return reverseRequestLocation(row.lat, row.lng);
}
