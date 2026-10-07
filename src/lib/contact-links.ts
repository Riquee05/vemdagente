export function whatsappLink(value: string | null): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  const international = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return /^55\d{10,11}$/.test(international) ? `https://wa.me/${international}` : undefined;
}
