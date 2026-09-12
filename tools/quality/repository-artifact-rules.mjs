export function findTrackedDependencyArtifacts(paths) {
  return paths.filter((path) => path.split("/").includes("node_modules"));
}
