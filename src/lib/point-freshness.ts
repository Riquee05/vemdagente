export function pointReviewReason(
  point: { confirmation_status?: string | null; confirmed_at?: string | null },
  now = Date.now(),
): string | null {
  if (point.confirmation_status === "needs_update")
    return "Informações sinalizadas para atualização. Confirme contato, horário e recebimento antes de ir.";
  if (!point.confirmed_at || !Number.isFinite(Date.parse(point.confirmed_at)))
    return "Recebimento e informações ainda sem confirmação datada. Consulte a instituição antes de ir.";
  if (now - Date.parse(point.confirmed_at) > 90 * 86400000)
    return "Última confirmação há mais de 90 dias. Confirme contato, horário e recebimento antes de ir.";
  return null;
}
