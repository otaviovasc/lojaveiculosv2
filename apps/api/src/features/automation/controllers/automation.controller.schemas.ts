import { z } from "zod";

export const automationRunParamsSchema = z.object({
  runId: z.string().uuid(),
});

export const automationStepParamsSchema = automationRunParamsSchema.extend({
  stepId: z.string().uuid(),
});

export const createAutomationPreviewSchema = z
  .object({
    context: z
      .object({
        module: z.string().trim().min(1).max(120).optional(),
        resourceId: z.string().trim().min(1).max(191).optional(),
      })
      .strict()
      .optional(),
    objective: z.string().trim().min(3).max(2_000),
  })
  .strict();

export const listAutomationRunsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const cancelAutomationRunSchema = z
  .object({
    expectedRunVersion: z.number().int().positive(),
  })
  .strict();

export const decideAutomationStepSchema = z
  .object({
    expectedApprovalVersion: z.number().int().positive(),
    expectedProposalDigest: z.string().regex(/^[a-f0-9]{64}$/),
    expectedRunVersion: z.number().int().positive(),
    expectedStepVersion: z.number().int().positive(),
  })
  .strict();
