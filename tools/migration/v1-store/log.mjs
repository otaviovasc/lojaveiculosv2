export function log(message) {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  process.stdout.write(`[${timestamp}] ${message}\n`);
}

export function progress(label, current, total) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  const count = total ? `${current}/${total}` : String(current);
  process.stdout.write(
    `[${new Date().toISOString().replace("T", " ").slice(0, 19)}] ${label}: ${count} (${pct}%)\n`,
  );
}

export async function withTimer(label, fn) {
  log(`▶ ${label}`);
  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log(`✔ ${label} (${elapsed}s)`);
    return result;
  } catch (error) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log(`✘ ${label} failed after ${elapsed}s: ${migrationErrorSummary(error)}`);
    log(
      "  Waiting for the PostgreSQL transaction rollback; large migrations can take several minutes.",
    );
    throw error;
  }
}

export function migrationErrorSummary(error) {
  const message = String(error?.message ?? error ?? "Unknown migration error")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-database-url]")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[redacted-email]")
    .replace(/(api[_-]?key|password|secret|token)=\S+/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, 500);
  const details = [
    safeErrorField("code", error?.code),
    safeErrorField("table", error?.table_name),
    safeErrorField("constraint", error?.constraint_name),
  ].filter(Boolean);
  return details.length ? `${message} (${details.join(", ")})` : message;
}

function safeErrorField(label, value) {
  const normalized = String(value ?? "");
  return /^[a-zA-Z0-9_.-]{1,191}$/.test(normalized)
    ? `${label}=${normalized}`
    : null;
}
