import { describe, expect, it, vi } from "vitest";

import { requireAdminAuthorization } from "@/lib/admin-authorization";

describe("autorização administrativa", () => {
  it("impede usuário não autenticado de executar operação administrativa", async () => {
    const administrativeOperation = vi.fn();

    await expect(requireAdminAuthorization(null, null)).rejects.toThrow("Unauthorized");
    expect(administrativeOperation).not.toHaveBeenCalled();
  });

  it("impede usuário autenticado sem papel administrativo de executar operação", async () => {
    const administrativeOperation = vi.fn();
    const rpc = vi.fn().mockResolvedValue({ data: false });

    await expect(
      requireAdminAuthorization("11111111-1111-4111-8111-111111111111", { rpc }),
    ).rejects.toThrow("Acesso restrito a administradores.");
    expect(rpc).toHaveBeenCalledWith("is_admin");
    expect(administrativeOperation).not.toHaveBeenCalled();
  });

  it("não aceita resposta ausente como autorização administrativa", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null });

    await expect(
      requireAdminAuthorization("11111111-1111-4111-8111-111111111111", { rpc }),
    ).rejects.toThrow("Acesso restrito a administradores.");
  });

  it("autoriza somente quando o papel administrativo é confirmado", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true });

    await expect(
      requireAdminAuthorization("11111111-1111-4111-8111-111111111111", { rpc }),
    ).resolves.toBeUndefined();
  });
});
