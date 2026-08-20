import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

import { appName, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="font-mono text-sm font-medium tracking-tight text-foreground">
          {appName}
          <span className="text-accent">_</span>
        </span>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
