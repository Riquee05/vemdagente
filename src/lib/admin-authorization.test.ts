import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAuthMarker } = vi.hoisted(() => ({
  requireAuthMarker: Symbol("require-auth"),
}));

vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: requireAuthMarker,
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let requiresAuth = false;
    let validate: ((data: unknown) => unknown) | undefined;

    const builder = {
      middleware(items: unknown[]) {
        requiresAuth = items.includes(requireAuthMarker);
        return builder;
      },
      inputValidator(validator: (data: unknown) => unknown) {
        validate = validator;
        return builder;
      },
      handler(handler: (args: { data: unknown; context: unknown }) => unknown) {
        return async (args?: { data?: unknown; context?: unknown }) => {
          if (requiresAuth && !args?.context) {
            throw new Error("Unauthorized: No authenticated context");
          }

          return handler({
            data: validate ? validate(args?.data) : args?.data,
            context: args?.context,
          });
        };
      },
    };

    return builder;
  },
}));

import { createTeamMember, listTeamMembers } from "@/lib/team.functions";

type MockServerFunction = (args?: { data?: unknown; context?: unknown }) => Promise<unknown>;
const callListTeamMembers = listTeamMembers as unknown as MockServerFunction;
const callCreateTeamMember = createTeamMember as unknown as MockServerFunction;

function nonAdminContext() {
  const from = vi.fn();
  const rpc = vi.fn().mockResolvedValue({ data: false });
  return {
    context: {
      userId: "11111111-1111-4111-8111-111111111111",
      supabase: { rpc, from },
    },
    from,
    rpc,
  };
}

describe("autorização administrativa", () => {
  beforeEach(() => vi.clearAllMocks());

  it("impede usuário não autenticado de listar a equipe", async () => {
    await expect(callListTeamMembers()).rejects.toThrow("Unauthorized");
  });

  it("impede usuário não autenticado de criar integrante", async () => {
    await expect(
      callCreateTeamMember({
        data: {
          full_name: "Pessoa Teste",
          email: "teste@example.com",
          role_title: "Curadoria",
        },
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("impede usuário autenticado sem papel administrativo de listar dados", async () => {
    const { context, from, rpc } = nonAdminContext();

    await expect(callListTeamMembers({ context })).rejects.toThrow(
      "Acesso restrito a administradores.",
    );
    expect(rpc).toHaveBeenCalledWith("is_admin");
    expect(from).not.toHaveBeenCalled();
  });

  it("impede usuário autenticado sem papel administrativo de executar alterações", async () => {
    const { context, from, rpc } = nonAdminContext();

    await expect(
      callCreateTeamMember({
        context,
        data: {
          full_name: "Pessoa Teste",
          email: "teste@example.com",
          role_title: "Curadoria",
        },
      }),
    ).rejects.toThrow("Acesso restrito a administradores.");
    expect(rpc).toHaveBeenCalledWith("is_admin");
    expect(from).not.toHaveBeenCalled();
  });
});
