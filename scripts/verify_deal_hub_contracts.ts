import { z } from 'zod';
import assert from 'node:assert';

// 1. Define the Interface (The Contract)
export interface DealHeaderDTO {
  id: string;
  companyName: string;
  rootDomain: string;
  stage: 'Lead' | 'Active' | 'LOI' | 'Closed';
  privacyTier: 'Tier 1' | 'Tier 2';
}

// 2. Define the Schema (The Runtime Validator)
const DealHeaderSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  rootDomain: z.string(),
  stage: z.enum(['Lead', 'Active', 'LOI', 'Closed']),
  privacyTier: z.enum(['Tier 1', 'Tier 2']),
});

// 3. Define the Mock Data (The Test Subject)
export const mockDealHeader: DealHeaderDTO = {
  id: "deal-123",
  companyName: "Acme Corp",
  rootDomain: "acme.com",
  stage: "Active",
  privacyTier: "Tier 1"
};

// 4. Run Verification Logic
function runVerification() {
  console.log("Starting DealHeaderDTO Contract Verification...");

  try {
    // Positive Test: Validate the correct mock object
    console.log("Verifying valid mock object...");
    const result = DealHeaderSchema.parse(mockDealHeader);
    assert.deepStrictEqual(result, mockDealHeader, "Parsed result should match original object");
    console.log("✅ Valid mock object passed validation.");

    // Negative Test 1: Invalid Stage
    console.log("Verifying invalid stage rejection...");
    const invalidStage = { ...mockDealHeader, stage: "InvalidStage" };
    assert.throws(() => {
      DealHeaderSchema.parse(invalidStage);
    }, (err: any) => {
        // ZodError messages are JSON arrays of issues. We check for invalid_enum_value code.
        return err instanceof z.ZodError && JSON.stringify(err.issues).includes("invalid_enum_value");
    }, "Schema should reject invalid stage");
    console.log("✅ Invalid stage correctly rejected.");

    // Negative Test 2: Missing Required Field
    console.log("Verifying missing field rejection...");
    const missingField: any = { ...mockDealHeader };
    delete missingField.companyName;
    assert.throws(() => {
      DealHeaderSchema.parse(missingField);
    }, (err: any) => {
        // Missing required field usually results in invalid_type with received: undefined
        return err instanceof z.ZodError && (JSON.stringify(err.issues).includes("invalid_type") || JSON.stringify(err.issues).includes("required"));
    }, "Schema should reject missing field");
    console.log("✅ Missing field correctly rejected.");

    console.log("🎉 Verification Passed: DealHeaderDTO contract is strictly enforced.");
  } catch (error) {
    console.error("❌ Verification Failed:", error);
    process.exit(1);
  }
}

runVerification();
