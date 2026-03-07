/**
 * Tenant validation matching docs/UX_SPEC.md updateTenantAction schema:
 * tenantId: uuid, name: min(2, "Tenant name must be at least 2 characters")
 * No Zod in package.json; equivalent checks implemented here.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUpdateTenantInput(body: {
  tenantId?: string | null;
  name?: string | null;
}): { ok: true; tenantId: string; name: string } | { ok: false; error: string } {
  const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!UUID_REGEX.test(tenantId)) {
    return { ok: false as const, error: "Invalid tenant ID" };
  }
  if (name.length < 2) {
    return {
      ok: false as const,
      error: "Tenant name must be at least 2 characters",
    };
  }
  return { ok: true as const, tenantId, name };
}
