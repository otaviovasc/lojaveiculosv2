export function renewedBillingPeriod(
  current: {
    currentPeriodEnd: Date | null;
    currentPeriodStart: Date | null;
  },
  paidDueAt: Date | null,
) {
  return {
    currentPeriodEnd: laterDate(
      current.currentPeriodEnd,
      paidDueAt ? shiftBillingMonth(paidDueAt, 1) : null,
    ),
    currentPeriodStart: laterDate(current.currentPeriodStart, paidDueAt),
  };
}

export function periodStartFromNextDueDate(nextDueAt: Date | null) {
  return nextDueAt ? shiftBillingMonth(nextDueAt, -1) : null;
}

export function laterDate(first: Date | null, second: Date | null) {
  if (!first) return second;
  if (!second) return first;
  return first > second ? first : second;
}

function shiftBillingMonth(value: Date, offset: -1 | 1) {
  const result = new Date(value);
  const billingDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + offset);
  const lastDay = new Date(result);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1);
  lastDay.setUTCDate(0);
  result.setUTCDate(Math.min(billingDay, lastDay.getUTCDate()));
  return result;
}
