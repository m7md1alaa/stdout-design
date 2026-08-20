import { createOgResponse } from "@stdout-design/core/og";
import { notFound } from "next/navigation";

import { DocsOgTemplate } from "@/components/og/docs-template";
import { appName } from "@/lib/shared";
import { source } from "@/lib/source";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: RouteContext<"/og/docs/[...slug]">
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return createOgResponse(
    <DocsOgTemplate
      title={page.data.title}
      description={page.data.description}
      siteName={appName}
    />
  );
}
