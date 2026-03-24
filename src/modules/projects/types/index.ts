// src/modules/projects/types/index.ts
import { JsonValue } from "@prisma/client/runtime/library";

export interface MilestoneInput {
  id: string; // client-side temp id
  title: string;
  deadline: string; // ISO date string
  phaseNumber: number;
}

export interface ProjectFormValues {
  title: string;
  deadline: string; // ISO date string
  technologies: string[];
  milestones: MilestoneInput[];
  descriptionJson: JsonValue;
  descriptionText: string; // plain text snapshot
}

export interface ProjectCreatePayload {
  title: string;
  deadline: string;
  technologies: string[];
  milestones: MilestoneInput[];
  descriptionJson: JsonValue;
  descriptionText: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  status: string;
  deadline: string;
  technologies: string[];
  currentPhase: number;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string };
  activeVersion: { versionNumber: number } | null;
  _count: { workRequests: number; comments: number; milestones: number };
}
