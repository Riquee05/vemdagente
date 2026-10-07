/** Guidance grounded in database results, usable when the AI provider fails. */
export function assistantFallbackReply(points: readonly { name: string }[]): string {
  const notice = "A resposta por IA está temporariamente indisponível. ";
  if (!points.length) {
    return (
      notice +
      "Use a busca de instituições para escolher a cidade ou bairro e o que deseja doar. " +
      "Não foi possível concluir sua pergunta, então isso não significa que não existam locais de apoio. " +
      "Confirme diretamente com a instituição os itens aceitos e o horário antes de ir."
    );
  }
  return (
    notice +
    `A busca encontrou estes locais: ${points
      .slice(0, 3)
      .map((point) => point.name)
      .join("; ")}. ` +
    "Confira os cartões abaixo para ver endereço e contato. " +
    "Confirme diretamente com a instituição os itens aceitos e o horário antes de ir."
  );
}
