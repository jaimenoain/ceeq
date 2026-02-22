import { describe, it, expect } from 'vitest';
import { ArchiveValidationSchema, DealStage, LOSS_REASONS } from '../src/features/deals/lib/archive-validation';

describe('Archive Deal Logic', () => {
  const lateStages: DealStage[] = ['CIM_REVIEW', 'DILIGENCE', 'NEGOTIATION'];
  const earlyStages: DealStage[] = ['LEAD', 'MEETING'];

  describe('Positive Assertions', () => {
    it('should validate successfully when lossReason is provided for late stage deals', () => {
      lateStages.forEach((stage) => {
        LOSS_REASONS.forEach((reason) => {
          const result = ArchiveValidationSchema.safeParse({
            dealStage: stage,
            lossReason: reason,
          });
          expect(result.success).toBe(true);
        });
      });
    });

    it('should validate successfully when lossReason is missing for early stage deals', () => {
      earlyStages.forEach((stage) => {
        const result = ArchiveValidationSchema.safeParse({
          dealStage: stage,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should validate successfully when lossReason is provided for early stage deals (optional)', () => {
      earlyStages.forEach((stage) => {
        const result = ArchiveValidationSchema.safeParse({
          dealStage: stage,
          lossReason: LOSS_REASONS[0],
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Negative Assertions', () => {
    it('should reject archival attempts for late-stage deals if lossReason is missing', () => {
      lateStages.forEach((stage) => {
        const result = ArchiveValidationSchema.safeParse({
          dealStage: stage,
          // lossReason is missing
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Loss reason is required');
        }
      });
    });

    it('should reject archival attempts if lossReason is invalid', () => {
      lateStages.forEach((stage) => {
        const result = ArchiveValidationSchema.safeParse({
          dealStage: stage,
          lossReason: 'Invalid Reason',
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
