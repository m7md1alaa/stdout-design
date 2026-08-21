export const updatePackageJsonDeps = (
  contents: string,
  currentVersion: string
): { updated: string; changed: boolean } => {
  const pkg = JSON.parse(contents);
  pkg.dependencies ??= {};
  const deps = pkg.dependencies;
  const currentRange = `^${currentVersion}`;

  if (deps["@stdout-design/cli"] === currentRange) {
    return { changed: false, updated: contents };
  }

  deps["@stdout-design/cli"] = currentRange;

  return { changed: true, updated: JSON.stringify(pkg, null, 2) };
};
