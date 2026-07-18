import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseLesson, parseMarkdown } from "../src/index.ts";
import { MarkdownView, renderMdast } from "../src/react/index.ts";

const html = (md: string) =>
  renderToStaticMarkup(<>{renderMdast(parseMarkdown(md).children)}</>);

describe("renderMdast", () => {
  it("renders headings, paragraphs, emphasis and inline code", () => {
    const out = html("# Hi\n\nSome **bold**, *em* and `code`.\n");
    expect(out).toContain("<h1>Hi</h1>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>em</em>");
    expect(out).toContain("<code>code</code>");
  });

  it("renders links and GFM autolinks", () => {
    const out = html("[docs](https://example.org) and https://bare.example\n");
    expect(out).toContain('<a href="https://example.org">docs</a>');
    expect(out).toContain('<a href="https://bare.example">');
  });

  it("renders lists, blockquotes and tables", () => {
    const out = html("- a\n- b\n\n> quoted\n\n| h |\n| - |\n| c |\n");
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>a</li>");
    expect(out).toContain("<blockquote>");
    expect(out).toContain("<th>h</th>");
    expect(out).toContain("<td>c</td>");
  });

  it("renders code fences with lang and title via the codeBlock override", () => {
    const out = renderToStaticMarkup(
      <>
        {renderMdast(parseMarkdown('```go title="main.go"\npackage main\n```\n').children, {
          codeBlock: ({ lang, title, value }) => (
            <figure data-lang={lang ?? ""} data-title={title ?? ""}>
              <pre>{value}</pre>
            </figure>
          ),
        })}
      </>,
    );
    expect(out).toContain('data-lang="go"');
    expect(out).toContain('data-title="main.go"');
    expect(out).toContain("package main");
  });

  it("defaults code fences to pre>code", () => {
    const out = html("```go\npackage main\n```\n");
    expect(out).toContain("<pre><code");
    expect(out).toContain("package main");
  });

  it("never injects raw HTML", () => {
    const out = html('<script>alert("x")</script>\n\nsafe\n');
    expect(out).not.toContain("<script>");
    expect(out).toContain("safe");
  });

  it("renders quiz prompt/option phrasing content from a parsed lesson", () => {
    const doc = parseLesson(
      "---\ntitle: T\n---\n\n:::quiz\nCall `transfer`?\n\n- [x] yes\n- [ ] no\n:::\n",
    );
    const q = doc.blocks[0];
    if (q.type !== "quiz") throw new Error("expected quiz");
    const out = renderToStaticMarkup(<>{renderMdast(q.prompt)}</>);
    expect(out).toContain("<code>transfer</code>");
  });
});

describe("MarkdownView", () => {
  it("renders a plain markdown document", () => {
    const out = renderToStaticMarkup(<MarkdownView markdown={"## Title\n\nHello.\n"} />);
    expect(out).toContain("<h2>Title</h2>");
    expect(out).toContain("<p>Hello.</p>");
  });
});
