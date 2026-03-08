"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  validateLoginInput,
  validateSignUpInput,
  validateForgotPasswordInput,
} from "@/lib/validations/auth";

export type AuthResult = { error?: string; success?: boolean };

export async function loginAction(_prev: unknown, formData: FormData): Promise<AuthResult> {
  const result = validateLoginInput({
    email: formData.get("email")?.toString(),
    password: formData.get("password")?.toString(),
  });
  if (!result.ok) return { error: result.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.email,
    password: result.password,
  });
  if (error) return { error: error.message };
  redirect("/repository");
}

export async function signUpAction(_prev: unknown, formData: FormData): Promise<AuthResult> {
  const result = validateSignUpInput({
    email: formData.get("email")?.toString(),
    password: formData.get("password")?.toString(),
  });
  if (!result.ok) return { error: result.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: result.email,
    password: result.password,
  });
  if (error) return { error: error.message };
  redirect("/signup/confirm");
}

export async function forgotPasswordAction(_prev: unknown, formData: FormData): Promise<AuthResult> {
  const result = validateForgotPasswordInput({
    email: formData.get("email")?.toString(),
  });
  if (!result.ok) return { error: result.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(result.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/login`,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
