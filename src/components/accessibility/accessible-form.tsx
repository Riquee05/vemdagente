import { useId, useState, type ComponentProps, type FormEvent } from "react";

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type Issue = { field: Field; message: string; label: string };
function fieldFromEvent(event: FormEvent): Field | null {
  const target = event.target;
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
    ? target
    : null;
}
function validationMessage(field: Field) {
  if (field.validity.valueMissing) return "Preencha este campo obrigatório.";
  if (field.validity.typeMismatch)
    return "Confira o formato informado, por exemplo o endereço de e-mail.";
  if (field.validity.tooShort && "minLength" in field)
    return `Escreva pelo menos ${field.minLength} caracteres.`;
  if (field.validity.tooLong && "maxLength" in field)
    return `Use no máximo ${field.maxLength} caracteres.`;
  if (field.validity.rangeUnderflow || field.validity.rangeOverflow)
    return "Use um valor dentro do intervalo permitido.";
  return "Confira o valor informado neste campo.";
}
/** Native validation remains active; errors also persist with links back to fields. */
export function AccessibleForm({
  children,
  onInvalidCapture,
  onChangeCapture,
  ...props
}: ComponentProps<"form">) {
  const id = useId();
  const [issues, setIssues] = useState<Issue[]>([]);
  const errorId = `${id}-errors`;
  return (
    <form
      {...props}
      onInvalidCapture={(event) => {
        onInvalidCapture?.(event);
        const field = fieldFromEvent(event);
        if (!field) return;
        field.setAttribute("aria-invalid", "true");
        const described = field.getAttribute("aria-describedby")?.split(" ").filter(Boolean) ?? [];
        if (!described.includes(errorId))
          field.setAttribute("aria-describedby", [...described, errorId].join(" "));
        const label =
          field.labels?.[0]?.textContent?.trim().slice(0, 120) ||
          field.getAttribute("aria-label") ||
          "Campo do formulário";
        setIssues((previous) => [
          ...previous.filter((item) => item.field !== field),
          { field, label, message: validationMessage(field) },
        ]);
      }}
      onChangeCapture={(event) => {
        onChangeCapture?.(event);
        const field = fieldFromEvent(event);
        if (!field || !field.validity.valid) return;
        field.removeAttribute("aria-invalid");
        const refs = (field.getAttribute("aria-describedby") ?? "")
          .split(" ")
          .filter((value) => value && value !== errorId);
        if (refs.length) field.setAttribute("aria-describedby", refs.join(" "));
        else field.removeAttribute("aria-describedby");
        setIssues((previous) => previous.filter((item) => item.field !== field));
      }}
    >
      {issues.length > 0 && (
        <div id={errorId} role="alert" className="mb-4 rounded-lg border-2 border-destructive p-4">
          <p className="font-semibold">Confira os campos antes de enviar</p>
          <ul className="mt-2 space-y-2">
            {issues.map((issue, index) => (
              <li key={index}>
                <button
                  type="button"
                  className="min-h-11 text-left underline"
                  onClick={() => issue.field.focus()}
                >
                  {issue.label}: {issue.message}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">Seus dados continuam no formulário.</p>
        </div>
      )}
      {children}
    </form>
  );
}
