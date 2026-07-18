import type { ReactNode } from "react";
import { parseMarkdown } from "../parse.ts";
import { renderMdast, type MdastComponents } from "./render-mdast.tsx";

/** Plain GFM markdown as React — the `lib/markdown.ts` replacement. */
export function MarkdownView({
  markdown,
  components,
}: {
  markdown: string;
  components?: MdastComponents;
}): ReactNode {
  return renderMdast(parseMarkdown(markdown).children, components);
}
