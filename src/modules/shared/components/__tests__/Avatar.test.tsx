import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "../Avatar";

describe("Avatar", () => {
  it("shows initials when no image provided", () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows single initial for single name", () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders image when src is provided", () => {
    render(<Avatar name="Jane" src="/avatar.png" />);
    const img = screen.getByAltText("Jane");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/avatar.png");
  });

  it("applies size class for xs", () => {
    const { container } = render(<Avatar name="Test" size="xs" />);
    expect(container.firstChild).toHaveClass("w-6", "h-6");
  });

  it("applies default md size", () => {
    const { container } = render(<Avatar name="Test" />);
    expect(container.firstChild).toHaveClass("w-10", "h-10");
  });
});
