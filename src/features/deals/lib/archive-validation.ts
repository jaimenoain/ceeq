import { z } from 'zod';

export type DealStage = 'LEAD' | 'MEETING' | 'CIM_REVIEW' | 'DILIGENCE' | 'NEGOTIATION';

export interface Deal {
  id: string;
  title: string;
  stage: DealStage;
  // ... other fields
}

export const LOSS_REASONS = ["Price too high", "Legal issues", "Owner withdrew", "Competitor chosen", "Other"] as const;
export type LossReason = typeof LOSS_REASONS[number];

export interface ArchiveDealPayload {
  dealId: string;
  lossReason?: LossReason;
}

// Validation logic implementation starts here
// Zod schema to validate the archival request
// Note: We need the context of the deal's current stage to validate correctly.
// Since ArchiveDealPayload only has dealId, the validation usually happens after fetching the deal.
// Alternatively, we can define a schema that validates the *combined* context (deal + payload) or just a function.

// For the purpose of "TDD Lite", we will export a schema that validates an object containing both the deal stage and the loss reason,
// as the prompt implies we need to validate "when a deal in CIM_REVIEW... is removed".

export const ArchiveValidationSchema = z.object({
  dealStage: z.enum(['LEAD', 'MEETING', 'CIM_REVIEW', 'DILIGENCE', 'NEGOTIATION']),
  lossReason: z.enum(LOSS_REASONS).optional(),
}).superRefine((val, ctx) => {
  const lateStages: DealStage[] = ['CIM_REVIEW', 'DILIGENCE', 'NEGOTIATION'];
  if (lateStages.includes(val.dealStage) && !val.lossReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Loss reason is required for deals in CIM Review or later",
      path: ["lossReason"],
    });
  }
});
