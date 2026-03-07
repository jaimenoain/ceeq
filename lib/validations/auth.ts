/**
 * Auth input validation matching docs/DOMAIN_MODEL.md userLoginSchema:
 * email: z.string().email(), password: z.string().min(8, "Password must be at least 8 characters")
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginInput(body: { email?: string; password?: string }) {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!EMAIL_REGEX.test(email)) {
    return { ok: false as const, error: "Invalid email address" };
  }
  if (password.length < 8) {
    return { ok: false as const, error: "Password must be at least 8 characters" };
  }
  return { ok: true as const, email, password };
}

export function validateSignUpInput(body: {
  email?: string;
  password?: string;
}) {
  return validateLoginInput(body);
}

export function validateForgotPasswordInput(body: { email?: string }) {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false as const, error: "Invalid email address" };
  }
  return { ok: true as const, email };
}
