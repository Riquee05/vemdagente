import { describe, expect, it } from "vitest";
import {
  campaignPercent,
  campaignSchema,
  feedbackSchema,
  institutionProposalSchema,
  readInstitutionProposal,
} from "./institution-workspace";
import { saoPauloToday } from "./need-validity";
const id = "11111111-1111-4111-8111-111111111111";
const patch = {
  name: "Instituição",
  phone: "",
  whatsapp: "",
  website: "https://example.org",
  opening_hours: "",
  donation_hours: "",
  description: "",
};
describe("institution workspace boundaries", () => {
  it("rejects ownership/geographic/publication fields in a proposed update", () => {
    const valid = { point_id: id, baseline_updated_at: "2026-10-07T12:00:00Z", patch };
    expect(institutionProposalSchema.safeParse(valid).success).toBe(true);
    expect(
      institutionProposalSchema.safeParse({ ...valid, patch: { ...patch, claimed_by: id } })
        .success,
    ).toBe(false);
    expect(
      institutionProposalSchema.safeParse({ ...valid, patch: { ...patch, state: "RJ" } }).success,
    ).toBe(false);
    expect(
      institutionProposalSchema.safeParse({
        ...valid,
        patch: { ...patch, website: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
  });
  it("recognizes only valid structured proposals", () => {
    expect(readInstitutionProposal("telefone mudou")).toBeNull();
    expect(
      readInstitutionProposal(
        JSON.stringify({
          type: "institution_update_v1",
          baseline_updated_at: "2026-10-07T12:00:00Z",
          patch,
        }),
      ),
    ).not.toBeNull();
    expect(
      readInstitutionProposal(JSON.stringify({ type: "institution_update_v1", patch })),
    ).toBeNull();
  });
  it("requires bounded campaign quantities and a current deadline", () => {
    const valid = {
      point_id: id,
      category_id: id,
      title: "Cobertores",
      target: 30,
      received: 10,
      unit: "cobertores",
      expires_at: saoPauloToday(),
    };
    expect(campaignSchema.safeParse(valid).success).toBe(true);
    expect(campaignSchema.safeParse({ ...valid, target: 0 }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...valid, received: 31 }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...valid, expires_at: "2020-01-01" }).success).toBe(false);
    expect(campaignPercent(10, 30)).toBe(33);
    expect(campaignPercent(50, 30)).toBe(100);
  });
  it("does not accept spoofed reviewer identities or honeypot submissions", () => {
    const valid = {
      point_id: id,
      kind: "phone",
      message: "O número não atende.",
      contact: "",
      website: "",
    };
    expect(feedbackSchema.safeParse(valid).success).toBe(true);
    expect(feedbackSchema.safeParse({ ...valid, submitted_by: id }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...valid, website: "bot" }).success).toBe(false);
  });
});
