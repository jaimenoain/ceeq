import { NextResponse } from "next/server";
import { validateUpdateTenantInput } from "@/lib/validations/tenant";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

/**
 * E2E schema integrity test: asserts updateTenantAction validation
 * strictly requires UUID for tenantId and minimum 2 characters for name.
 */
export async function GET() {
  const invalidId = validateUpdateTenantInput({
    tenantId: "not-a-uuid",
    name: "ab",
  });
  if (invalidId.ok || invalidId.error !== "Invalid tenant ID") {
    return NextResponse.json(
      { error: "Expected invalid tenantId to be rejected", got: invalidId },
      { status: 500 }
    );
  }

  const shortName = validateUpdateTenantInput({
    tenantId: VALID_UUID,
    name: "a",
  });
  if (shortName.ok || shortName.error !== "Tenant name must be at least 2 characters") {
    return NextResponse.json(
      { error: "Expected name with length < 2 to be rejected", got: shortName },
      { status: 500 }
    );
  }

  const valid = validateUpdateTenantInput({
    tenantId: VALID_UUID,
    name: "ab",
  });
  if (!valid.ok) {
    return NextResponse.json(
      { error: "Expected valid input to pass", got: valid },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
