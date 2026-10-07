import { describe, expect, it } from "vitest";
import { assistantFallbackReply } from "./assistant-fallback";

describe("assistant fallback", () => {
  it("does not equate an AI failure with a lack of institutions", () => {
    const reply = assistantFallbackReply([]);
    expect(reply).toContain("não significa que não existam");
    expect(reply).toContain("cidade ou bairro");
  });
  it("keeps database results useful without promising accepted donations", () => {
    const reply = assistantFallbackReply([{ name: "Instituição confirmada" }]);
    expect(reply).toContain("Instituição confirmada");
    expect(reply).toContain("Confirme diretamente");
    expect(reply).toContain("temporariamente indisponível");
  });
});
