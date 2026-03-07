"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateUpdateTenantInput } from "@/lib/validations/tenant";

export type UpdateTenantResult = { error?: string };

export async function updateTenantAction(
  _prev: unknown,
  formData: FormData
): Promise<UpdateTenantResult> {
  const result = validateUpdateTenantInput({
    tenantId: formData.get("tenantId")?.toString(),
    name: formData.get("name")?.toString(),
  });
  if (!result.ok) return { error: result.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({
      name: result.name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", result.tenantId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/");
  return {};
}
