import { createOgResponse } from "@stdout-design/core/og";
import { StandardOgTemplate } from "@stdout-design/templates";
import { notFound } from "next/navigation";

import { appName } from "@/lib/shared";
import { getPageImageUrl, source } from "@/lib/source";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: RouteContext<"/og/docs/[...slug]">
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return createOgResponse(
    <StandardOgTemplate
      title={page.data.title}
      description={page.data.description}
      siteName={appName}
    />
  );
}

export function generateStaticParams() {
  return source.getPages().map((page: (typeof source)["$inferPage"]) => ({
    lang: page.locale,
    slug: getPageImageUrl(page).segments,
  }));
}
