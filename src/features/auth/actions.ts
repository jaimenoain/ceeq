"use server";

import { createClient } from "../../shared/lib/supabase/server";
import { OnboardingSubmitSchema } from "./schemas";
import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "../../shared/types/supabase";

export type ActionState = {
  success?: boolean;
  error?: string;
  validationErrors?: Record<string, string[]>;
};

export async function processOnboarding(
  supabase: SupabaseClient<Database>,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    workspaceType: formData.get("workspaceType"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    workspaceName: formData.get("workspaceName"),
    linkedinUrl: formData.get("linkedinUrl") ? String(formData.get("linkedinUrl")) : undefined,
  };

  const validatedFields = OnboardingSubmitSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      error: "Validation failed",
      validationErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return { error: "User not authenticated or missing email" };
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("Workspace")
    .insert({
      name: data.workspaceName,
      workspaceType: data.workspaceType,
      subscriptionPlan: "FREE",
    })
    .select()
    .single();

  if (workspaceError || !workspace) {
    return { error: `Failed to create workspace: ${workspaceError?.message || 'Unknown error'}` };
  }

  const { error: userError } = await supabase.from("User").insert({
    id: user.id,
    email: user.email,
    firstName: data.firstName,
    lastName: data.lastName,
    workspaceId: workspace.id,
    role: "ADMIN",
    linkedinUrl: data.linkedinUrl || null,
  });

  if (userError) {
    await supabase.from("Workspace").delete().eq("id", workspace.id);
    return { error: `Failed to create user profile: ${userError.message}` };
  }

  return { success: true };
}

export async function completeOnboardingAction(
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  return await processOnboarding(supabase, formData);
}
