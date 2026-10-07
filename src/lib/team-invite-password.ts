import { pbkdf2Sync, timingSafeEqual } from "node:crypto";

// The deployed Worker caps PBKDF2 at 100,000 iterations. Version new hashes
// so existing 120,000-iteration invites are never silently reinterpreted.
const PREFIX = "pbkdf2-sha256:100000:";

export function hashTeamInvitePassword(password: string, salt: string): string {
  return PREFIX + pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
}

export function verifyTeamInvitePassword(
  password: string,
  salt: string,
  storedHash: string,
): boolean {
  const versioned = storedHash.startsWith(PREFIX);
  const expected = versioned ? storedHash.slice(PREFIX.length) : storedHash;
  if (!/^[a-f0-9]{64}$/i.test(expected)) return false;
  let actual: Buffer;
  try {
    actual = pbkdf2Sync(password, salt, versioned ? 100_000 : 120_000, 32, "sha256");
  } catch {
    throw new Error(
      "Este convite precisa ser renovado. Peça ao administrador para gerar um novo convite.",
    );
  }
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
