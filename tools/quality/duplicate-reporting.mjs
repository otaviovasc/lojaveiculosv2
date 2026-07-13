export function reportDuplicateGroups({ failures, items, label, suggestion }) {
  const groups = new Map();
  for (const item of items) {
    const group = groups.get(item.key) ?? [];
    group.push(item);
    groups.set(item.key, group);
  }

  for (const group of groups.values()) {
    const uniqueLocations = new Set(
      group.map((item) => `${item.file}:${item.line}`),
    );
    if (uniqueLocations.size < 2) continue;

    const locations = group
      .map((item) => `${item.file}:${item.line} (${item.name})`)
      .join(", ");
    failures.push(`duplicate ${label}: ${locations}. ${suggestion}`);
  }
}

export function reportDuplicateCloneWindows(windows, failures) {
  const groups = new Map();
  for (const window of windows) {
    const group = groups.get(window.key) ?? [];
    group.push(window);
    groups.set(window.key, group);
  }

  const reportedOwnerPairs = new Set();
  for (const group of groups.values()) {
    const pair = findIndependentWindowPair(group);
    if (!pair) continue;
    const ownerPair = pair
      .map((item) => item.owner)
      .sort()
      .join("|");
    if (reportedOwnerPairs.has(ownerPair)) continue;
    reportedOwnerPairs.add(ownerPair);

    const locations = pair
      .map((item) => `${item.file}:${item.line}-${item.endLine} (${item.name})`)
      .join(", ");
    failures.push(
      `duplicate token window: ${locations}. Extract the repeated branch, mapper, or JSX/control block into a shared helper or primitive.`,
    );
  }
}

function findIndependentWindowPair(group) {
  for (let left = 0; left < group.length; left += 1) {
    for (let right = left + 1; right < group.length; right += 1) {
      const first = group[left];
      const second = group[right];
      if (first.owner === second.owner) continue;
      if (locationsOverlap(first, second)) continue;
      return [first, second];
    }
  }
  return null;
}

function locationsOverlap(first, second) {
  if (first.file !== second.file) return false;
  return first.line <= second.endLine && second.line <= first.endLine;
}
