import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export const testDb = new PrismaClient({
  log: ["error"],
});

/**
 * Truncate all tables in dependency order for test isolation.
 */
export async function resetDb() {
  await testDb.$transaction([
    testDb.usageEvent.deleteMany(),
    testDb.notification.deleteMany(),
    testDb.comment.deleteMany(),
    testDb.workRequest.deleteMany(),
    testDb.projectAssignee.deleteMany(),
    testDb.versionSignoff.deleteMany(),
    testDb.projectVersion.deleteMany(),
    testDb.milestone.deleteMany(),
    testDb.projectPhase.deleteMany(),
    testDb.project.deleteMany(),
    testDb.user.deleteMany(),
  ]);
}

const hashedPassword = bcrypt.hashSync("password123", 4); // low rounds for speed

export async function seedTestData() {
  const consultant = await testDb.user.create({
    data: {
      email: "consultant@test.com",
      name: "Test Consultant",
      password: hashedPassword,
      role: Role.CONSULTANT,
      bio: "Test consultant",
    },
  });

  const learner = await testDb.user.create({
    data: {
      email: "learner@test.com",
      name: "Test Learner",
      password: hashedPassword,
      role: Role.LEARNER,
      bio: "Test learner",
    },
  });

  const admin = await testDb.user.create({
    data: {
      email: "admin@test.com",
      name: "Test Admin",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  return { consultant, learner, admin };
}

export async function disconnectDb() {
  await testDb.$disconnect();
}
