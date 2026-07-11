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
    const owners = [...new Set(group.map((item) => item.owner))];
    const locationKeys = [
      ...new Set(
        group.map((item) => `${item.file}:${item.line}-${item.endLine}`),
      ),
    ];
    if (owners.length < 2 || locationKeys.length < 2) continue;

    const ownerPair = owners.slice(0, 2).sort().join("|");
    if (reportedOwnerPairs.has(ownerPair)) continue;
    reportedOwnerPairs.add(ownerPair);

    const locations = group
      .filter(
        (item, index, items) =>
          items.findIndex((other) => other.owner === item.owner) === index,
      )
      .slice(0, 4)
      .map((item) => `${item.file}:${item.line}-${item.endLine} (${item.name})`)
      .join(", ");
    failures.push(
      `duplicate token window: ${locations}. Extract the repeated branch, mapper, or JSX/control block into a shared helper or primitive.`,
    );
  }
}
