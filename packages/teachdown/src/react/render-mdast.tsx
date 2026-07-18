import type {
  AlignType,
  Definition,
  Node,
  Parent,
  PhrasingContent,
  RootContent,
  Table,
} from "mdast";
import { Fragment, type ReactNode } from "react";

/**
 * mdast → React. Covers the constructs Teachdown prose can produce (CommonMark
 * + GFM); raw HTML nodes are dropped, never injected. The app customizes
 * rendering through `components` — everything else is a plain element.
 */
export interface MdastComponents {
  codeBlock?: (props: { lang: string | null; title: string | null; value: string }) => ReactNode;
  link?: (props: { href: string; title: string | null; children: ReactNode }) => ReactNode;
  image?: (props: { src: string; alt: string; title: string | null }) => ReactNode;
}

export function renderMdast(
  nodes: (RootContent | PhrasingContent)[],
  components: MdastComponents = {},
): ReactNode {
  const definitions = new Map<string, Definition>();
  collectDefinitions(nodes, definitions);
  return <>{nodes.map((n, i) => render(n, i, { components, definitions }))}</>;
}

interface Ctx {
  components: MdastComponents;
  definitions: Map<string, Definition>;
}

function collectDefinitions(nodes: Node[], into: Map<string, Definition>): void {
  for (const node of nodes) {
    if (node.type === "definition") {
      const def = node as Definition;
      into.set(def.identifier, def);
    }
    const children = (node as Parent).children;
    if (Array.isArray(children)) collectDefinitions(children, into);
  }
}

/** The `title="…"` value from a code fence's meta string, if present. */
function fenceTitle(meta: string | null | undefined): string | null {
  const match = meta?.match(/title="([^"]*)"/);
  return match ? match[1] : null;
}

function children(node: Parent, ctx: Ctx): ReactNode {
  return node.children.map((n, i) => render(n, i, ctx));
}

function render(node: RootContent | PhrasingContent, key: number, ctx: Ctx): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{children(node, ctx)}</p>;
    case "heading": {
      const Tag = `h${node.depth}` as const;
      return <Tag key={key}>{children(node, ctx)}</Tag>;
    }
    case "text":
      return <Fragment key={key}>{node.value}</Fragment>;
    case "emphasis":
      return <em key={key}>{children(node, ctx)}</em>;
    case "strong":
      return <strong key={key}>{children(node, ctx)}</strong>;
    case "delete":
      return <del key={key}>{children(node, ctx)}</del>;
    case "inlineCode":
      return <code key={key}>{node.value}</code>;
    case "break":
      return <br key={key} />;
    case "thematicBreak":
      return <hr key={key} />;
    case "blockquote":
      return <blockquote key={key}>{children(node, ctx)}</blockquote>;
    case "link": {
      const props = { href: node.url, title: node.title ?? null, children: children(node, ctx) };
      return (
        <Fragment key={key}>
          {ctx.components.link ? (
            ctx.components.link(props)
          ) : (
            <a href={props.href} title={props.title ?? undefined}>
              {props.children}
            </a>
          )}
        </Fragment>
      );
    }
    case "image": {
      const props = { src: node.url, alt: node.alt ?? "", title: node.title ?? null };
      return (
        <Fragment key={key}>
          {ctx.components.image ? (
            ctx.components.image(props)
          ) : (
            <img src={props.src} alt={props.alt} title={props.title ?? undefined} />
          )}
        </Fragment>
      );
    }
    case "linkReference": {
      const def = ctx.definitions.get(node.identifier);
      if (!def) return <Fragment key={key}>{children(node, ctx)}</Fragment>;
      return (
        <a key={key} href={def.url} title={def.title ?? undefined}>
          {children(node, ctx)}
        </a>
      );
    }
    case "imageReference": {
      const def = ctx.definitions.get(node.identifier);
      if (!def) return null;
      return <img key={key} src={def.url} alt={node.alt ?? ""} title={def.title ?? undefined} />;
    }
    case "code": {
      const props = { lang: node.lang ?? null, title: fenceTitle(node.meta), value: node.value };
      if (ctx.components.codeBlock) return <Fragment key={key}>{ctx.components.codeBlock(props)}</Fragment>;
      return (
        <pre key={key}>
          <code data-lang={props.lang ?? undefined}>{props.value}</code>
        </pre>
      );
    }
    case "list": {
      const Tag = node.ordered ? "ol" : "ul";
      return (
        <Tag key={key} start={node.ordered && node.start != null && node.start !== 1 ? node.start : undefined}>
          {children(node, ctx)}
        </Tag>
      );
    }
    case "listItem":
      return (
        <li key={key}>
          {typeof node.checked === "boolean" && <input type="checkbox" checked={node.checked} disabled readOnly />}
          {node.children.map((child, i) =>
            // Tight list items wrap their text in a paragraph node; unwrap it.
            child.type === "paragraph" && node.children.length === 1 ? (
              <Fragment key={i}>{children(child, ctx)}</Fragment>
            ) : (
              render(child, i, ctx)
            ),
          )}
        </li>
      );
    case "table":
      return renderTable(node, key, ctx);
    case "html":
    case "definition":
    case "footnoteDefinition":
    case "footnoteReference":
    case "yaml":
      return null;
    default:
      return null;
  }
}

function renderTable(table: Table, key: number, ctx: Ctx): ReactNode {
  const aligns: (AlignType | undefined)[] = table.align ?? [];
  const style = (col: number) => (aligns[col] ? { textAlign: aligns[col] as "left" | "right" | "center" } : undefined);
  const [head, ...body] = table.children;
  return (
    <table key={key}>
      {head && (
        <thead>
          <tr>
            {head.children.map((cell, c) => (
              <th key={c} style={style(c)}>
                {children(cell, ctx)}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {body.map((row, r) => (
          <tr key={r}>
            {row.children.map((cell, c) => (
              <td key={c} style={style(c)}>
                {children(cell, ctx)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
