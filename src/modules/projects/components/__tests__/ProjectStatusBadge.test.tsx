import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectStatusBadge } from "../ProjectStatusBadge";

describe("ProjectStatusBadge", () => {
  it("renders 'Open' for OPEN status", () => {
    render(<ProjectStatusBadge status="OPEN" />);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("renders 'In Progress' for IN_PROGRESS status", () => {
    render(<ProjectStatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders 'Done' for DONE status", () => {
    render(<ProjectStatusBadge status="DONE" />);
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders 'Archived' for ARCHIVED status", () => {
    render(<ProjectStatusBadge status="ARCHIVED" />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("falls back to Archived for unknown status", () => {
    render(<ProjectStatusBadge status="UNKNOWN" />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });
});
