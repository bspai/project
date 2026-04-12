-- Migration: course_reviews
-- Adds CourseReview model (one review per learner per course, rating 1-5, optional text)

CREATE TABLE "course_reviews" (
  "id"        TEXT NOT NULL,
  "rating"    INTEGER NOT NULL,
  "body"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "courseId"  TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,

  CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_reviews_courseId_learnerId_key"
  ON "course_reviews"("courseId", "learnerId");

ALTER TABLE "course_reviews"
  ADD CONSTRAINT "course_reviews_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_reviews"
  ADD CONSTRAINT "course_reviews_learnerId_fkey"
  FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
