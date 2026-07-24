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
    log(`✘ ${label} failed after ${elapsed}s`);
    throw error;
  }
}
