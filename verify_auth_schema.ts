import { OnboardingSubmitSchema } from "./src/features/auth/schemas";
import { z } from "zod";

async function verify() {
  console.log("Verifying OnboardingSubmitSchema...");

  // 1. Valid Payload (Investor)
  const validPayload = {
    workspaceType: "INVESTOR",
    firstName: "Jane",
    lastName: "Doe",
    workspaceName: "Acme Fund",
    linkedinUrl: "https://www.linkedin.com/in/janedoe"
  };

  try {
    const result = OnboardingSubmitSchema.parse(validPayload);
    console.log("✅ Valid payload passed.");
  } catch (e) {
    console.error("❌ Valid payload failed:", e);
    process.exit(1);
  }

  // 2. Invalid Payload (Missing workspaceType)
  const invalidPayload1 = {
    firstName: "Jane",
    lastName: "Doe",
    workspaceName: "Acme Fund",
    linkedinUrl: "https://www.linkedin.com/in/janedoe"
  };

  try {
    OnboardingSubmitSchema.parse(invalidPayload1);
    console.error("❌ Invalid payload 1 (missing workspaceType) passed unexpectedly.");
    process.exit(1);
  } catch (e) {
      if (e instanceof z.ZodError) {
          const errors = e.flatten().fieldErrors as Record<string, string[] | undefined>;
          // The error message might be strictly what is defined in the schema
          if (errors.workspaceType && errors.workspaceType[0] === "Role selection is irreversible and required.") {
               console.log("✅ Invalid payload 1 correctly failed (missing workspaceType) with expected message.");
          } else {
               console.error("❌ Invalid payload 1 failed with unexpected error message. Expected 'Role selection is irreversible and required.', got:", JSON.stringify(errors.workspaceType));
               process.exit(1);
          }
      } else {
           console.error("❌ Invalid payload 1 failed with non-Zod error:", e);
           process.exit(1);
      }
  }

  // 3. Invalid Payload (Invalid LinkedIn URL)
  const invalidPayload2 = {
    workspaceType: "SEARCHER",
    firstName: "John",
    lastName: "Smith",
    workspaceName: "Search Fund",
    linkedinUrl: "not-a-url"
  };

  try {
    OnboardingSubmitSchema.parse(invalidPayload2);
    console.error("❌ Invalid payload 2 (invalid URL) passed unexpectedly.");
    process.exit(1);
  } catch (e) {
      if (e instanceof z.ZodError) {
          const errors = e.flatten().fieldErrors as Record<string, string[] | undefined>;
          if (errors.linkedinUrl) {
               console.log("✅ Invalid payload 2 correctly failed (invalid URL).");
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
