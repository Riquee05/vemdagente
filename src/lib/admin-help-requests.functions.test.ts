import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), stepUp: vi.fn() }));
vi.mock("@/lib/admin-authorization", () => ({ requireAdminAuthorization: mocks.admin }));
vi.mock("@/lib/admin-2fa.functions", () => ({ assertStepUp: mocks.stepUp }));
import {
  readHelpRequests as listAdminHelpRequests,
  changeHelpRequest as updateAdminHelpRequest,
} from "./admin-help-requests.server";
const list = listAdminHelpRequests as unknown as (input: unknown) => Promise<unknown>;
const update = updateAdminHelpRequest as unknown as (input: unknown) => Promise<unknown>;
beforeEach(() => {
  vi.resetAllMocks();
});
describe("pedidos privados na administração", () => {
  it("nega leitura e alteração antes de consultar pedidos para não administradores", async () => {
    mocks.admin.mockRejectedValue(new Error("Acesso restrito"));
    const from = vi.fn();
    const context = { userId: "user", supabase: { from } };
    await expect(list({ data: { page: 1, status: "open" }, context })).rejects.toThrow(
      "Acesso restrito",
    );
    await expect(
      update({ data: { id: "id", status: "closed", previousStatus: "open" }, context }),
    ).rejects.toThrow("Acesso restrito");
    expect(from).not.toHaveBeenCalled();
  });
  it("exige confirmação administrativa antes de expor dados", async () => {
    mocks.stepUp.mockRejectedValue(new Error("Confirme a senha"));
    const from = vi.fn();
    await expect(
      list({ data: { page: 1, status: "all" }, context: { userId: "admin", supabase: { from } } }),
    ).rejects.toThrow("Confirme a senha");
    expect(from).not.toHaveBeenCalled();
  });
  it("não sobrescreve status alterado por outro administrador", async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    for (const method of ["update", "eq", "select"] as const) query[method].mockReturnValue(query);
    await expect(
      update({
        data: { id: "id", status: "closed", previousStatus: "open" },
        context: { userId: "admin", supabase: { from: () => query } },
      }),
    ).rejects.toThrow("O pedido mudou");
    expect(query.eq).toHaveBeenCalledWith("status", "open");
  });
});
