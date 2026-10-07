import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/page-shell";
export const Route = createFileRoute("/acessibilidade")({
  head: () => ({ meta: [{ title: "Acessibilidade | Vem da Gente" }] }),
  component: AccessibilityPage,
});
function AccessibilityPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-12 space-y-6">
        <h1 className="text-3xl font-semibold">Acessibilidade</h1>
        <p>
          Queremos que você encontre apoio e locais de doação usando o celular, teclado ou leitor de
          tela.
        </p>
        <h2 className="text-xl font-semibold">Como navegar</h2>
        <ul className="list-disc space-y-3 pl-6">
          <li>
            Use Tab e Shift + Tab para avançar e voltar entre os controles. Enter abre links; Enter
            ou Espaço ativa botões. Escape fecha menus e janelas.
          </li>
          <li>O primeiro link da página permite pular diretamente para o conteúdo principal.</li>
          <li>
            Aumente o texto usando o zoom do navegador ou as opções de acessibilidade do seu
            aparelho.
          </li>
          <li>
            Em Pontos, use “Ir direto para a lista de instituições” ou “Ocultar mapa”. Endereços e
            contatos também estão em texto.
          </li>
          <li>
            Os avisos permanecem disponíveis até você fechá-los. O botão “Fechar aviso” permite
            dispensá-los.
          </li>
          <li>
            Ao ativar a preferência de movimento reduzido no aparelho, as animações do site são
            reduzidas.
          </li>
        </ul>
        <h2 className="text-xl font-semibold">Antes de visitar uma instituição</h2>
        <p>
          As fichas indicam entrada, acesso para cadeira de rodas, banheiro, atendimento em Libras e
          combinação por mensagem. “Não informado” significa que ainda não temos confirmação.
          Consulte o contato da instituição para confirmar o atendimento de que precisa.
        </p>
        <h2 className="text-xl font-semibold">Encontrou uma barreira?</h2>
        <p>
          Conte qual página você tentou usar e, se possível, o aparelho e a tecnologia assistiva
          utilizada. Escreva para{" "}
          <a className="underline" href="mailto:Vemdagente.contato@gmail.com">
            Vemdagente.contato@gmail.com
          </a>
          . Você também pode sugerir correções na ficha da instituição.
        </p>
        <Link to="/pontos" className="inline-block underline">
          Encontrar instituições
        </Link>
      </section>
    </PageShell>
  );
}
