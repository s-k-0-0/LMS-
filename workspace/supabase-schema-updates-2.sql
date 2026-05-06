-- 1. Create mapping table for Faculty <-> Students
CREATE TABLE IF NOT EXISTS faculty_students (
    faculty_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (faculty_id, student_id)
);

ALTER TABLE faculty_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty see own" ON faculty_students FOR SELECT USING (faculty_id = auth.uid() OR student_id = auth.uid());
CREATE POLICY "Admins manage" ON faculty_students FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('dept_admin', 'dean', 'super_admin'))
);

-- 2. Add Category to courses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='category') THEN
        ALTER TABLE courses ADD COLUMN category TEXT DEFAULT 'core';
    END IF;
END $$;

-- 3. Update Course Visibility
DROP POLICY IF EXISTS "Published courses readable by everyone" ON courses;
DROP POLICY IF EXISTS "Published courses are readable by everyone" ON courses;
DROP POLICY IF EXISTS "Creators see own courses" ON courses;
DROP POLICY IF EXISTS "Creators see their own courses" ON courses;
DROP POLICY IF EXISTS "Course Visibility" ON courses;

CREATE POLICY "Course Visibility" ON courses FOR SELECT USING (
    -- Admins/Super Admins see all
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('dean', 'super_admin'))
    OR 
    -- Dept Admins see their dept
    EXISTS (SELECT 1 FROM profiles admin WHERE admin.id = auth.uid() AND admin.role = 'dept_admin' AND admin.department_id = courses.department_id)
    OR
    -- Faculty see their own
    faculty_id = auth.uid()
    OR
    -- Students see published courses from their assigned faculty, or if created by admin
    (
        status = 'published' 
        AND department_id = (SELECT department_id FROM profiles WHERE id = auth.uid())
        AND (
            EXISTS (SELECT 1 FROM faculty_students WHERE faculty_id = courses.faculty_id AND student_id = auth.uid())
            OR
            (SELECT role FROM profiles WHERE id = courses.faculty_id) IN ('dept_admin', 'dean', 'super_admin')
        )
    )
);

-- 4. Update Lesson Visibility
DROP POLICY IF EXISTS "Lessons readable logic" ON lessons;
DROP POLICY IF EXISTS "Published lessons are readable by everyone" ON lessons;
DROP POLICY IF EXISTS "Lesson Visibility" ON lessons;

CREATE POLICY "Lesson Visibility" ON lessons FOR SELECT USING (
    -- Same logic as courses
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('dean', 'super_admin'))
    OR
    EXISTS (SELECT 1 FROM courses c JOIN profiles p ON p.id = auth.uid() WHERE c.id = lessons.course_id AND p.role = 'dept_admin' AND p.department_id = c.department_id)
    OR
    created_by = auth.uid()
    OR
    (
        status = 'published'
        AND EXISTS (
             SELECT 1 FROM courses c WHERE c.id = lessons.course_id 
             AND c.department_id = (SELECT department_id FROM profiles WHERE id = auth.uid())
             AND (
                 EXISTS (SELECT 1 FROM faculty_students WHERE faculty_id = c.faculty_id AND student_id = auth.uid())
                 OR (SELECT role FROM profiles WHERE id = c.faculty_id) IN ('dept_admin', 'dean', 'super_admin')
             )
        )
    )
);
