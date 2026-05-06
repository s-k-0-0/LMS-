-- Add is_mandatory and content_type to courses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='is_mandatory') THEN
        ALTER TABLE courses ADD COLUMN is_mandatory BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='content_type') THEN
        ALTER TABLE courses ADD COLUMN content_type TEXT DEFAULT 'course'; -- 'course' or 'upskilling'
    END IF;
END $$;

-- Check and create Yoga department admin/faculty and the mandatory course
DO $$
DECLARE
    yoga_course_id UUID;
    superadmin_id UUID;
BEGIN
    SELECT id INTO superadmin_id FROM profiles WHERE role = 'super_admin' LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Mandatory Yoga & Wellness') THEN
        INSERT INTO courses (title, description, status, category, is_mandatory, content_type, faculty_id)
        VALUES ('Mandatory Yoga & Wellness', 'A holistic approach to mental and physical well-being. Mandatory for all students.', 'published', 'soft_skills', true, 'course', superadmin_id)
        RETURNING id INTO yoga_course_id;

        IF yoga_course_id IS NOT NULL THEN
            INSERT INTO lessons (course_id, title, content_type, cf_stream_id, status)
            VALUES (yoga_course_id, 'Introduction to Ashtanga Yoga', 'youtube_video', 'v7AYKMP6rOE', 'published');
        END IF;
    END IF;
END $$;
