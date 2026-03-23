// prisma/seed.ts
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.usageEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.workRequest.deleteMany();
  await prisma.projectAssignee.deleteMany();
  await prisma.versionSignoff.deleteMany();
  await prisma.projectVersion.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.projectPhase.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("password123", 12);

  // Create consultant user
  const consultant = await prisma.user.create({
    data: {
      email: "consultant@kaliyuva.com",
      name: "Arjun Rao",
      password: hashedPassword,
      role: Role.CONSULTANT,
      bio: "Senior full-stack consultant with 10 years of experience.",
    },
  });

  // Create learner user
  const learner = await prisma.user.create({
    data: {
      email: "learner@kaliyuva.com",
      name: "Priya Sharma",
      password: hashedPassword,
      role: Role.LEARNER,
      bio: "Aspiring developer looking to build real-world projects.",
    },
  });

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: "admin@kaliyuva.com",
      name: "Admin User",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  // Create a sample project
  const project = await prisma.project.create({
    data: {
      title: "E-Commerce Platform with Recommendation Engine",
      status: "OPEN",
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      technologies: ["React", "Node.js", "PostgreSQL", "Python", "TensorFlow"],
      currentPhase: 1,
      creatorId: consultant.id,
      phases: {
        create: [
          { phaseNumber: 1, title: "Foundation & Core Features", status: "ACTIVE", startedAt: new Date() },
          { phaseNumber: 2, title: "Recommendation Engine", status: "UPCOMING" },
          { phaseNumber: 3, title: "Deployment & Optimisation", status: "UPCOMING" },
        ],
      },
      milestones: {
        create: [
          {
            title: "Project setup & architecture design",
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            order: 1,
            phaseNumber: 1,
          },
          {
            title: "User authentication & product catalogue",
            deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            order: 2,
            phaseNumber: 1,
          },
          {
            title: "Shopping cart & checkout flow",
            deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
            order: 3,
            phaseNumber: 1,
          },
          {
            title: "Recommendation model training",
            deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            order: 4,
            phaseNumber: 2,
          },
          {
            title: "Integration & final deployment",
            deadline: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000),
            order: 5,
            phaseNumber: 3,
          },
        ],
      },
    },
  });

  // Create the first version for the sample project
  await prisma.projectVersion.create({
    data: {
      versionNumber: 1,
      projectId: project.id,
      submittedById: consultant.id,
      isActive: true,
      status: "SELF_APPROVED",
      phaseNumber: 1,
      descriptionText:
        "Build a full-featured e-commerce platform with an AI-powered recommendation engine.",
      descriptionJson: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "E-Commerce Platform with Recommendation Engine" }],
          },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Project Overview" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Build a full-featured e-commerce platform with an AI-powered product recommendation engine. The learner will gain experience across the full stack, from database design to ML model integration.",
              },
            ],
          },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Goals" }],
          },
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Design and implement a scalable product catalogue with search and filtering." }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Implement secure checkout flow with payment gateway integration (Stripe sandbox)." }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Train a collaborative filtering model for personalised product recommendations." }],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  });

  console.log("✅ Seed complete!");
  console.log("\n📋 Test Accounts:");
  console.log("  Consultant: consultant@kaliyuva.com / password123");
  console.log("  Learner:    learner@kaliyuva.com    / password123");
  console.log("  Admin:      admin@kaliyuva.com      / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
