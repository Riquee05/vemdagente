import { describe, expect, it, vi } from "vitest";
import {
  requireActiveTeamMember,
  requireTeamPermission,
  type AccessClient,
} from "./collaborator-authorization";

function client(role: boolean, member: Record<string, unknown> | null) {
  return {
    from: vi.fn((table: string) => {
      const value = table === "user_roles" ? (role ? { id: "role" } : null) : member;
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: value }),
      };
      return chain;
    }),
  } as unknown as AccessClient;
}

const active = {
  id: "member",
  user_id: "user",
  full_name: "Ana",
  role_title: "Curadora",
  status: "active",
  areas: [],
  permissions: ["points_review"],
  last_activated_at: null,
};

describe("collaborator authorization", () => {
  it("bloqueia pessoa sem sessão", async () => {
    await expect(requireActiveTeamMember(null, client(true, active))).rejects.toThrow(
      "Unauthorized",
    );
  });
  it("bloqueia pessoa sem papel volunteer", async () => {
    await expect(requireActiveTeamMember("user", client(false, active))).rejects.toThrow(
      "Acesso restrito",
    );
  });
  it.each(["paused", "inactive"])("bloqueia membro %s", async (status) => {
    await expect(
      requireActiveTeamMember("user", client(true, { ...active, status })),
    ).rejects.toThrow("pausado ou inativo");
  });
  it("bloqueia membro sem permissão", async () => {
    await expect(
      requireTeamPermission("user", client(true, active), "help_support"),
    ).rejects.toThrow("não tem permissão");
  });
  it("autoriza apenas a permissão concedida", async () => {
    await expect(
      requireTeamPermission("user", client(true, active), "points_review"),
    ).resolves.toMatchObject({ id: "member" });
  });
});
