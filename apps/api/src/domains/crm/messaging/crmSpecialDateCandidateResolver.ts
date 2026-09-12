import {
  isBirthdayWithinLeadWindow,
  isOccasionWithinLeadWindow,
  isPurchaseAnniversaryWithinLeadWindow,
} from "./crmSpecialDateCalculator.js";
import type {
  CrmSpecialDateConfig,
  CrmSpecialDateRepository,
  SpecialDateRecipientCandidate,
} from "../ports/crmSpecialDateRepository.js";
import type { SpecialDateScope } from "./crmSpecialDateServiceSupport.js";

export type MatchedSpecialDateCandidate = {
  candidate: SpecialDateRecipientCandidate;
  targetYear: number;
};

export async function resolveSpecialDateCandidates(
  repository: CrmSpecialDateRepository,
  scope: SpecialDateScope,
  config: CrmSpecialDateConfig,
  referenceDate: Date,
): Promise<readonly MatchedSpecialDateCandidate[]> {
  if (config.dateType === "birthday") {
    return resolveBirthdayCandidates(repository, scope, config, referenceDate);
  }
  if (config.dateType === "purchaseAnniversary") {
    return resolveAnniversaryCandidates(
      repository,
      scope,
      config,
      referenceDate,
    );
  }
  return resolveAnnualCandidates(repository, scope, config, referenceDate);
}

async function resolveBirthdayCandidates(
  repository: CrmSpecialDateRepository,
  scope: SpecialDateScope,
  config: CrmSpecialDateConfig,
  referenceDate: Date,
): Promise<readonly MatchedSpecialDateCandidate[]> {
  const recipients = await repository.findBirthdayRecipients(
    scope.tenantId,
    scope.storeId,
  );
  const matched: MatchedSpecialDateCandidate[] = [];
  for (const recipient of recipients) {
    if (!recipient.rawDate) continue;
    const check = isBirthdayWithinLeadWindow(
      recipient.rawDate,
      referenceDate,
      config.leadDays,
    );
    if (check.active) {
      matched.push({ candidate: recipient, targetYear: check.targetYear });
    }
  }
  return matched;
}

async function resolveAnniversaryCandidates(
  repository: CrmSpecialDateRepository,
  scope: SpecialDateScope,
  config: CrmSpecialDateConfig,
  referenceDate: Date,
): Promise<readonly MatchedSpecialDateCandidate[]> {
  const recipients = await repository.findAnniversaryRecipients(
    scope.tenantId,
    scope.storeId,
  );
  const matched: MatchedSpecialDateCandidate[] = [];
  for (const recipient of recipients) {
    if (!recipient.closedAt) continue;
    const check = isPurchaseAnniversaryWithinLeadWindow(
      recipient.closedAt,
      referenceDate,
      config.leadDays,
    );
    if (check.active) {
      matched.push({ candidate: recipient, targetYear: check.targetYear });
    }
  }
  return matched;
}

async function resolveAnnualCandidates(
  repository: CrmSpecialDateRepository,
  scope: SpecialDateScope,
  config: CrmSpecialDateConfig,
  referenceDate: Date,
): Promise<readonly MatchedSpecialDateCandidate[]> {
  const check = isOccasionWithinLeadWindow(
    config.dateType,
    referenceDate,
    config.leadDays,
  );
  if (!check.active) return [];

  const audience = await repository.findAudienceRecipients(
    scope.tenantId,
    scope.storeId,
  );
  return audience.map((candidate) => ({
    candidate,
    targetYear: check.targetYear,
  }));
}
