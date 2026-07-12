import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export const isInsideGitRepo = (dir: string): boolean => {
  let current = path.resolve(dir);
  for (;;) {
    if (existsSync(path.join(current, ".git"))) {
      return true;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return false;
};

export const tryGitInit = (dir: string): boolean => {
  try {
    execSync("git --version", { stdio: "ignore" });
  } catch {
    return false;
  }

  if (
    existsSync(path.join(dir, ".git")) ||
    isInsideGitRepo(path.dirname(dir))
  ) {
    return false;
  }

  try {
    execSync("git init", { cwd: dir, stdio: "ignore" });
    execSync("git checkout -b main", { cwd: dir, stdio: "ignore" });
    execSync("git add .", { cwd: dir, stdio: "ignore" });
    execSync('git commit -m "Initial commit from stdout-design"', {
      cwd: dir,
      stdio: "ignore",
    });
    return true;
  } catch {
    if (existsSync(path.join(dir, ".git"))) {
      try {
        execSync("rm -rf .git", { cwd: dir, stdio: "ignore" });
      } catch {
        // Cleanup failed — not critical
      }
    }
    return false;
  }
};
