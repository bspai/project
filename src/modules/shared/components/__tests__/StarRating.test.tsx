import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StarRating, StarDisplay } from "../StarRating";

describe("StarRating", () => {
  it("renders 5 star buttons", () => {
    render(<StarRating />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("shows correct filled stars for given value", () => {
    render(<StarRating value={3} readOnly />);
    const buttons = screen.getAllByRole("button");
    // first 3 should have filled class, last 2 should not
    expect(buttons[0].querySelector("svg")).toHaveClass("fill-amber-400");
    expect(buttons[2].querySelector("svg")).toHaveClass("fill-amber-400");
    expect(buttons[3].querySelector("svg")).toHaveClass("fill-surface-200");
    expect(buttons[4].querySelector("svg")).toHaveClass("fill-surface-200");
  });

  it("calls onChange when a star is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<StarRating onChange={handleChange} />);
    await user.click(screen.getAllByRole("button")[3]); // 4th star = rating 4
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it("does not call onChange when readOnly", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<StarRating value={3} readOnly onChange={handleChange} />);
    await user.click(screen.getAllByRole("button")[0]);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("all buttons disabled when readOnly", () => {
    render(<StarRating value={2} readOnly />);
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).toBeDisabled();
    }
  });

  it("buttons are enabled when interactive", () => {
    render(<StarRating value={2} />);
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).not.toBeDisabled();
    }
  });

  it("renders correct aria-label for each star", () => {
    render(<StarRating />);
    expect(screen.getByRole("button", { name: "Rate 1 star" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rate 5 stars" })).toBeInTheDocument();
  });
});

describe("StarDisplay", () => {
  it("renders nothing when avg is null", () => {
    const { container } = render(<StarDisplay avg={null} count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when count is 0", () => {
    const { container } = render(<StarDisplay avg={4.5} count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows formatted avg and count", () => {
    render(<StarDisplay avg={4.3} count={12} />);
    expect(screen.getByText("4.3")).toBeInTheDocument();
    expect(screen.getByText("(12)")).toBeInTheDocument();
  });

  it("formats avg to one decimal place", () => {
    render(<StarDisplay avg={5} count={1} />);
    expect(screen.getByText("5.0")).toBeInTheDocument();
  });
});
