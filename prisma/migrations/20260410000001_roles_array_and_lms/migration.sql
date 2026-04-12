-- Migration: roles_array_and_lms
-- 1. Add MENTOR to Role enum
-- 2. Convert User.role (single) → User.roles (array)
-- 3. Add LMS models

-- Step 1: Add MENTOR value to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MENTOR';

-- Step 2: Add new roles array column (nullable first)
ALTER TABLE "users" ADD COLUMN "roles" "Role"[];

-- Step 3: Populate roles array from existing role column
UPDATE "users" SET "roles" = ARRAY["role"];

-- Step 4: Make roles non-null with default
ALTER TABLE "users" ALTER COLUMN "roles" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['LEARNER'::"Role"];

-- Step 5: Drop old role column
ALTER TABLE "users" DROP COLUMN "role";

-- ─────────────────────────────────────────────
-- LMS Tables
-- ─────────────────────────────────────────────

-- CourseStatus enum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- ContentBlockType enum
CREATE TYPE "ContentBlockType" AS ENUM (
  'TEXT',
  'VIDEO_URL',
  'VIDEO_UPLOAD',
  'AUDIO_URL',
  'AUDIO_UPLOAD',
  'IMAGE_URL',
  'IMAGE_UPLOAD'
);

-- Course
CREATE TABLE "courses" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "coverImage"  TEXT,
    "status"      "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "isOpen"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "creatorId"   TEXT NOT NULL,
    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CourseModule
CREATE TABLE "course_modules" (
    "id"        TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "order"     INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courseId"  TEXT NOT NULL,
    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- Lesson
CREATE TABLE "lessons" (
    "id"        TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "order"     INTEGER NOT NULL,
    "duration"  INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "moduleId"  TEXT NOT NULL,
    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- ContentBlock
CREATE TABLE "content_blocks" (
    "id"        TEXT NOT NULL,
    "type"      "ContentBlockType" NOT NULL,
    "order"     INTEGER NOT NULL,
    "title"     TEXT,
    "payload"   JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lessonId"  TEXT NOT NULL,
    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

-- Enrollment
CREATE TABLE "enrollments" (
    "id"         TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "courseId"   TEXT NOT NULL,
    "learnerId"  TEXT NOT NULL,
    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- LessonProgress
CREATE TABLE "lesson_progress" (
    "id"           TEXT NOT NULL,
    "isComplete"   BOOLEAN NOT NULL DEFAULT false,
    "completedAt"  TIMESTAMP(3),
    "lessonId"     TEXT NOT NULL,
    "learnerId"    TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "course_modules_courseId_order_key" ON "course_modules"("courseId", "order");
CREATE UNIQUE INDEX "lessons_moduleId_order_key" ON "lessons"("moduleId", "order");
CREATE UNIQUE INDEX "content_blocks_lessonId_order_key" ON "content_blocks"("lessonId", "order");
CREATE UNIQUE INDEX "enrollments_courseId_learnerId_key" ON "enrollments"("courseId", "learnerId");
CREATE UNIQUE INDEX "lesson_progress_lessonId_learnerId_key" ON "lesson_progress"("lessonId", "learnerId");

-- Foreign keys
ALTER TABLE "courses" ADD CONSTRAINT "courses_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lessons" ADD CONSTRAINT "lessons_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_learnerId_fkey"
  FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_learnerId_fkey"
  FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
