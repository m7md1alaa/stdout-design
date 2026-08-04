import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { NextRequest, NextResponse } from "next/server";

const { rewrite: rewriteLLM } = rewritePath(
  "/docs{/*path}",
  "/llms.mdx/docs{/*path}/content.md"
);

export default function proxy(request: NextRequest) {
  if (
    !request.nextUrl.pathname.endsWith(".md") &&
    isMarkdownPreferred(request)
  ) {
    const result = rewriteLLM(request.nextUrl.pathname);

    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl), {
        headers: { Vary: "Accept" },
      });
    }
  }

  return NextResponse.next();
}
