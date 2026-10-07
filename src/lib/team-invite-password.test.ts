import { pbkdf2Sync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashTeamInvitePassword, verifyTeamInvitePassword } from "./team-invite-password";

describe("senhas temporárias de colaborador", () => {
  it("gera e verifica um hash com o limite de 100 mil iterações", () => {
    const hash = hashTeamInvitePassword("temporary-test-password", "test-salt");
    expect(hash).toBe(
      "pbkdf2-sha256:100000:" +
        pbkdf2Sync("temporary-test-password", "test-salt", 100_000, 32, "sha256").toString("hex"),
    );
    expect(verifyTeamInvitePassword("temporary-test-password", "test-salt", hash)).toBe(true);
    expect(verifyTeamInvitePassword("wrong", "test-salt", hash)).toBe(false);
  });
  it("preserva a verificação de convites antigos quando o ambiente suporta", () => {
    const legacy = pbkdf2Sync("old-password", "test-salt", 120_000, 32, "sha256").toString("hex");
    expect(verifyTeamInvitePassword("old-password", "test-salt", legacy)).toBe(true);
    expect(verifyTeamInvitePassword("wrong", "test-salt", legacy)).toBe(false);
  });
  it("rejeita hashes inválidos", () => {
    expect(verifyTeamInvitePassword("password", "salt", "invalid")).toBe(false);
  });
});
