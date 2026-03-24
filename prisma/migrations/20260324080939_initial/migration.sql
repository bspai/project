-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CONSULTANT', 'LEARNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('PENDING', 'APPROVED', 'DEFERRED', 'SELF_APPROVED');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('ACTIVE', 'COMPLETE', 'UPCOMING');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WORK_REQUEST_RECEIVED', 'WORK_REQUEST_APPROVED', 'WORK_REQUEST_REJECTED', 'VERSION_SUBMITTED', 'VERSION_APPROVED', 'VERSION_DEFERRED', 'PROJECT_COMPLETE', 'COMMENT_ADDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'LEARNER',
    "avatar" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'OPEN',
    "deadline" TIMESTAMP(3) NOT NULL,
    "technologies" TEXT[],
    "currentPhase" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_versions" (
    "id" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "descriptionJson" JSONB NOT NULL,
    "descriptionText" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "phaseNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "VersionStatus" NOT NULL DEFAULT 'PENDING',
    "projectId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,

    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_signoffs" (
    "id" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "Role" NOT NULL,
    "versionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "version_signoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "phaseNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_phases" (
    "id" TEXT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "status" "PhaseStatus" NOT NULL DEFAULT 'UPCOMING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_requests" (
    "id" TEXT NOT NULL,
    "message" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,

    CONSTRAINT "work_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assignees" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,

    CONSTRAINT "project_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "sessionId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "projectId" TEXT,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_versions_projectId_versionNumber_key" ON "project_versions"("projectId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "version_signoffs_versionId_userId_key" ON "version_signoffs"("versionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_phases_projectId_phaseNumber_key" ON "project_phases"("projectId", "phaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "work_requests_projectId_learnerId_key" ON "work_requests"("projectId", "learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignees_projectId_learnerId_key" ON "project_assignees"("projectId", "learnerId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_signoffs" ADD CONSTRAINT "version_signoffs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "project_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_signoffs" ADD CONSTRAINT "version_signoffs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_requests" ADD CONSTRAINT "work_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_requests" ADD CONSTRAINT "work_requests_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignees" ADD CONSTRAINT "project_assignees_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignees" ADD CONSTRAINT "project_assignees_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
