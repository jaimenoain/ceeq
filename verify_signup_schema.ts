import { SignupSchema } from "./src/features/auth/schemas";
import { z } from "zod";

async function verify() {
  console.log("Verifying SignupSchema...");

  // 1. Valid Payload
  const validPayload = {
    email: "test@example.com",
    password: "password123"
  };

  try {
    SignupSchema.parse(validPayload);
    console.log("✅ Valid payload passed.");
  } catch (e) {
    console.error("❌ Valid payload failed:", e);
    process.exit(1);
  }

  // 2. Invalid Payload (Invalid Email)
  const invalidPayload1 = {
    email: "not-an-email",
    password: "password123"
  };

  try {
    SignupSchema.parse(invalidPayload1);
    console.error("❌ Invalid payload 1 (invalid email) passed unexpectedly.");
    process.exit(1);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const errors = e.flatten().fieldErrors;
      if (errors.email) {
        console.log("✅ Invalid payload 1 correctly failed (invalid email).");
      } else {
        console.error("❌ Invalid payload 1 failed with unexpected error:", JSON.stringify(errors));
        process.exit(1);
      }
    } else {
       console.error("❌ Invalid payload 1 failed with non-Zod error:", e);
       process.exit(1);
    }
  }

  // 3. Invalid Payload (Short Password)
  const invalidPayload2 = {
    email: "test@example.com",
    password: "123"
  };

  try {
    SignupSchema.parse(invalidPayload2);
    console.error("❌ Invalid payload 2 (short password) passed unexpectedly.");
    process.exit(1);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const errors = e.flatten().fieldErrors;
      if (errors.password) {
        console.log("✅ Invalid payload 2 correctly failed (short password).");
      } else {
        console.error("❌ Invalid payload 2 failed with unexpected error:", JSON.stringify(errors));
        process.exit(1);
      }
    } else {
       console.error("❌ Invalid payload 2 failed with non-Zod error:", e);
       process.exit(1);
    }
  }

  console.log("🎉 Verification Passed");
}

verify();
