import { createOgResponse } from "@stdout-design/core/og";

import { HomeOgTemplate } from "@/components/og/home-template";
import { hero } from "@/lib/marketing-copy";
import { appName } from "@/lib/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  return createOgResponse(
    <HomeOgTemplate
      title={hero.headline}
      description={hero.subhead}
      siteName={appName}
    />
  );
}
