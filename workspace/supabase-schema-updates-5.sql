-- S-VYASA LMS DATABASE EXPANSE (MIGRATION #5)
-- Run this in your Supabase SQL Editor to support live grading, credits, lock deadlines, and levels.

-- 1. ADD COURSE METADATA COLUMNS FOR DIRECT CONTROL
ALTER TABLE courses ADD COLUMN IF NOT EXISTS credits INT DEFAULT 3;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'All Levels';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS deadline TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS grading_weight TEXT DEFAULT 'Pass/Fail';

-- 2. ADD STUDENT STUDY TELEMETRY & GRADE ENTRIES
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS feedback TEXT;

-- 3. VERIFY EXAMPLES AND INDICES
CREATE INDEX IF NOT EXISTS idx_student_progress_course ON student_progress(course_id);
