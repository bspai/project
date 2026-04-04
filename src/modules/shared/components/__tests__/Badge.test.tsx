import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../Badge";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>Open</Badge>);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass("bg-surface-100");
  });

  it("applies success variant classes", () => {
    const { container } = render(<Badge variant="success">Done</Badge>);
    expect(container.firstChild).toHaveClass("text-success-dark");
  });

  it("applies warning variant classes", () => {
    const { container } = render(<Badge variant="warning">Pending</Badge>);
    expect(container.firstChild).toHaveClass("text-warning-dark");
  });

  it("shows dot indicator when dot prop is true", () => {
    const { container } = render(<Badge dot>With Dot</Badge>);
    const dot = container.querySelector(".rounded-full.w-1\\.5");
    expect(dot).toBeInTheDocument();
  });

  it("does not show dot by default", () => {
    const { container } = render(<Badge>No Dot</Badge>);
    const dot = container.querySelector(".w-1\\.5");
    expect(dot).not.toBeInTheDocument();
  });
});
