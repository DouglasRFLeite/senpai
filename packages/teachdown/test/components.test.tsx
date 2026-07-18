// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Ordering, Quiz } from "../src/react/index.ts";

afterEach(cleanup);

const LABELS = { correct: "✓ Correct.", retry: "✗ Try again.", revealed: "✗ Revealed." };

function renderQuiz(onAnswered = vi.fn(), onResolved = vi.fn()) {
  render(
    <Quiz
      questionId="q1"
      prompt={<p>Which one?</p>}
      options={[
        { correct: false, content: "wrong a" },
        { correct: true, content: "right" },
        { correct: false, content: "wrong b" },
      ]}
      labels={LABELS}
      onAnswered={onAnswered}
      onResolved={onResolved}
    />,
  );
  return { onAnswered, onResolved };
}

describe("<Quiz>", () => {
  it("resolves on a correct click and disables everything", () => {
    const { onAnswered, onResolved } = renderQuiz();
    fireEvent.click(screen.getByRole("button", { name: "right" }));
    expect(onAnswered).toHaveBeenCalledWith({ questionId: "q1", correct: true, attempts: 1 });
    expect(onResolved).toHaveBeenCalledWith("q1");
    expect(screen.getByText("✓ Correct.")).toBeTruthy();
    for (const b of screen.getAllByRole("button")) expect((b as HTMLButtonElement).disabled).toBe(true);
  });

  it("flags only the wrong option and keeps the rest live", () => {
    const { onAnswered, onResolved } = renderQuiz();
    const wrong = screen.getByRole("button", { name: "wrong a" });
    fireEvent.click(wrong);
    expect(onAnswered).toHaveBeenCalledWith({ questionId: "q1", correct: false, attempts: 1 });
    expect(onResolved).not.toHaveBeenCalled();
    expect(wrong.getAttribute("data-state")).toBe("wrong");
    expect((wrong as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "right" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText("✗ Try again.")).toBeTruthy();
  });

  it("reveals the answer after two wrong clicks and resolves", () => {
    const { onResolved } = renderQuiz();
    fireEvent.click(screen.getByRole("button", { name: "wrong a" }));
    fireEvent.click(screen.getByRole("button", { name: "wrong b" }));
    expect(onResolved).toHaveBeenCalledWith("q1");
    expect(screen.getByText("✗ Revealed.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "right" }).getAttribute("data-state")).toBe("correct");
  });
});

describe("<Ordering>", () => {
  const items = ["sign", "broadcast", "mine"];
  const labels = { next: "✓ Next?", done: "✓ Done.", wrong: "✗ Not next." };

  it("renders items in displayOrder but grades against authored order", () => {
    render(<Ordering items={items} displayOrder={[2, 0, 1]} labels={labels} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["mine", "sign", "broadcast"]);

    fireEvent.click(screen.getByRole("button", { name: "sign" }));
    expect(screen.getByText("✓ Next?")).toBeTruthy();
    const sign = screen.getByRole("button", { name: /sign/ });
    expect(sign.getAttribute("data-state")).toBe("locked");
    expect(sign.getAttribute("data-rank")).toBe("1");
  });

  it("flags an out-of-order click and finishes with the done label", () => {
    render(<Ordering items={items} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "mine" }));
    expect(screen.getByText("✗ Not next.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "mine" }).getAttribute("data-state")).toBe("wrong");

    fireEvent.click(screen.getByRole("button", { name: "sign" }));
    fireEvent.click(screen.getByRole("button", { name: "broadcast" }));
    fireEvent.click(screen.getByRole("button", { name: "mine" }));
    expect(screen.getByText("✓ Done.")).toBeTruthy();
  });
});
