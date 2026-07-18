import type { CalloutBlock, JargonBlock, LessonBlock, SourceBlock } from "teachdown";
import { renderMdast, type MdastComponents } from "teachdown/react";
import styles from "@/styles/Lesson.module.css";

/**
 * App-styled rendering for the non-interactive Teachdown blocks, shared by the
 * client lesson page and the server-rendered reference/print pages.
 */

export const lessonMdComponents: MdastComponents = {
  codeBlock: ({ lang, title, value }) => (
    <figure className={styles.codeFigure}>
      {title && <figcaption className={styles.filename}>{title}</figcaption>}
      <pre>
        <code data-lang={lang ?? undefined}>{value}</code>
      </pre>
    </figure>
  ),
};

export function Callout({ block }: { block: CalloutBlock }) {
  return (
    <aside className={styles.callout} data-kind={block.kind}>
      {block.title && <strong className={styles.calloutTitle}>{block.title}</strong>}
      {renderMdast(block.children, lessonMdComponents)}
    </aside>
  );
}

export function Jargon({ block }: { block: JargonBlock }) {
  return (
    <dl className={styles.jargon}>
      {block.entries.map((entry, i) => (
        <div key={i}>
          <dt>{renderMdast(entry.term)}</dt>
          <dd>{renderMdast(entry.definition)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Source({ block, fallbackTitle }: { block: SourceBlock; fallbackTitle: string }) {
  return (
    <div className={styles.source}>
      <strong className={styles.sourceTitle}>{block.title ?? fallbackTitle}</strong>
      {renderMdast(block.children, lessonMdComponents)}
    </div>
  );
}

/**
 * One block without interactivity — quiz/ordering degrade to plain lists.
 * Reference docs (and print) use this for every block; LessonView only for the
 * non-interactive kinds.
 */
export function StaticBlock({ block, sourceTitle }: { block: LessonBlock; sourceTitle: string }) {
  switch (block.type) {
    case "prose":
      return <>{renderMdast(block.children, lessonMdComponents)}</>;
    case "callout":
      return <Callout block={block} />;
    case "jargon":
      return <Jargon block={block} />;
    case "source":
      return <Source block={block} fallbackTitle={sourceTitle} />;
    case "quiz":
      return (
        <div className={styles.quiz}>
          <div className={styles.quizPrompt}>{renderMdast(block.prompt)}</div>
          <ul>
            {block.options.map((option, i) => (
              <li key={i}>{renderMdast(option.content)}</li>
            ))}
          </ul>
        </div>
      );
    case "ordering":
      return (
        <div className={styles.quiz}>
          <div className={styles.quizPrompt}>{renderMdast(block.prompt)}</div>
          <ol>
            {block.items.map((item, i) => (
              <li key={i}>{renderMdast(item)}</li>
            ))}
          </ol>
        </div>
      );
  }
}
