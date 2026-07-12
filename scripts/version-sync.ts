import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const PUBLISHABLE_PACKAGES = ["core", "dev-server", "web-ui", "cli"];

// eslint-disable-next-line prefer-destructuring
const version = process.argv[2];

if (!version) {
  console.error("Usage: bun scripts/version-sync.ts <version>");
  console.error("Example: bun scripts/version-sync.ts 0.1.2");
  process.exit(1);
}

const results = await Promise.all(
  PUBLISHABLE_PACKAGES.map(async (pkg) => {
    const pkgPath = `${root}/packages/${pkg}/package.json`;
    const pkgJson = Bun.file(pkgPath);
    const content = await pkgJson.json();
    content.version = version;
    await Bun.write(pkgPath, `${JSON.stringify(content, null, 2)}\n`);
    return content.name;
  })
);

for (const name of results) {
  console.log(`✓ ${name} → ${version}`);
}
