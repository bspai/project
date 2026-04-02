import { testDb } from "./test-db";
import { InputJsonValue } from "@prisma/client/runtime/library";

const sampleDescriptionJson: InputJsonValue = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "This is a test project description." }],
    },
  ],
};

export async function createTestProject(
  consultantId: string,
  overrides: {
    title?: string;
    status?: "OPEN" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
    deadline?: Date;
    technologies?: string[];
    currentPhase?: number;
    phaseCount?: number;
  } = {}
) {
  const {
    title = "Test Project",
    status = "OPEN",
    deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    technologies = ["React", "TypeScript"],
    currentPhase = 1,
    phaseCount = 2,
  } = overrides;

  const project = await testDb.project.create({
    data: {
      title,
      status,
      deadline,
      technologies,
      currentPhase,
      creatorId: consultantId,
    },
  });

  // Create phases
  const phases = [];
  for (let i = 1; i <= phaseCount; i++) {
    const phase = await testDb.projectPhase.create({
      data: {
        projectId: project.id,
        phaseNumber: i,
        title: `Phase ${i}`,
        status: i === currentPhase ? "ACTIVE" : i < currentPhase ? "COMPLETE" : "UPCOMING",
        startedAt: i <= currentPhase ? new Date() : undefined,
      },
    });
    phases.push(phase);
  }

  // Create milestones
  const milestones = await testDb.milestone.createMany({
    data: [
      {
        projectId: project.id,
        title: "Milestone 1",
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        order: 1,
        phaseNumber: 1,
      },
      {
        projectId: project.id,
        title: "Milestone 2",
        deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        order: 2,
        phaseNumber: 1,
      },
    ],
  });

  // Create version 1 (active, self-approved)
  const version = await testDb.projectVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 1,
      submittedById: consultantId,
      isActive: true,
      status: "SELF_APPROVED",
      phaseNumber: 1,
      descriptionJson: sampleDescriptionJson,
      descriptionText: "This is a test project description.",
      metaSnapshot: {
        title,
        deadline: deadline.toISOString(),
        technologies,
        milestones: [
          { title: "Milestone 1", deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), phaseNumber: 1 },
          { title: "Milestone 2", deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), phaseNumber: 1 },
        ],
      },
    },
  });

  return { project, phases, milestones, version };
}

export async function createPendingVersion(
  projectId: string,
  consultantId: string,
  versionNumber: number,
  overrides: {
    title?: string;
    descriptionText?: string;
  } = {}
) {
  const { title = "Updated Project", descriptionText = "Updated description." } = overrides;

  return testDb.projectVersion.create({
    data: {
      projectId,
      versionNumber,
      submittedById: consultantId,
      isActive: false,
      status: "PENDING",
      phaseNumber: 1,
      descriptionJson: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: descriptionText }] },
        ],
      } as InputJsonValue,
      descriptionText,
      metaSnapshot: {
        title,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        technologies: ["React", "TypeScript", "Node.js"],
        milestones: [
          { title: "Updated Milestone", deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), phaseNumber: 1 },
        ],
      },
    },
  });
}

export async function createTestWorkRequest(projectId: string, learnerId: string) {
  return testDb.workRequest.create({
    data: {
      projectId,
      learnerId,
      status: "PENDING",
      message: "I'd like to work on this project.",
    },
  });
}

export async function assignLearnerToProject(projectId: string, learnerId: string) {
  return testDb.projectAssignee.create({
    data: { projectId, learnerId },
  });
}
