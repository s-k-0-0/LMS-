-- 1. Policies for DELETE on courses
-- Only super_admin, dean, dept_admin, and the faculty who created the course can delete it
DROP POLICY IF EXISTS "Delete Course" ON courses;
CREATE POLICY "Delete Course" ON courses FOR DELETE USING (
   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dean'))
   OR 
   EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'dept_admin' AND p.department_id = courses.department_id)
   OR
   faculty_id = auth.uid()
);

-- 2. Policies for DELETE on lessons
DROP POLICY IF EXISTS "Delete Lesson" ON lessons;
CREATE POLICY "Delete Lesson" ON lessons FOR DELETE USING (
   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dean'))
   OR
   EXISTS (SELECT 1 FROM courses c JOIN profiles p ON p.id = auth.uid() WHERE c.id = lessons.course_id AND p.role = 'dept_admin' AND p.department_id = c.department_id)
   OR
   EXISTS (SELECT 1 FROM courses c WHERE c.id = lessons.course_id AND c.faculty_id = auth.uid())
);

-- 3. Policies for DELETE on student_progress
DROP POLICY IF EXISTS "Delete Progress" ON student_progress;
CREATE POLICY "Delete Progress" ON student_progress FOR DELETE USING (
   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dean', 'dept_admin', 'faculty'))
   OR
   student_id = auth.uid()
);
