-- COMPREHENSIVE SUPABASE SCHEMA
-- Run this securely in the Supabase SQL Editor

-- 1. ENUMS
-- Postgres 9.3+ supports ADD VALUE IF NOT EXISTS. 
-- We ensure the type exists first, then safely add missing values to avoid clashes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('student', 'faculty', 'admin', 'super_admin');
  END IF;
END
$$;

-- Outside transaction block safely add new enum values
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'dept_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'dean';


-- 2. HIERARCHY TABLES
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    streak_count INT DEFAULT 0,
    last_login DATE,
    points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely altering profiles to add new hierarchy columns (prevents column clash)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='department_id') THEN
        ALTER TABLE profiles ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='section_id') THEN
        ALTER TABLE profiles ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_active') THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 4. NEW USER TRIGGER
-- Updates automatically with correct overrides.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Force super_admin for main email
    IF NEW.email = 'skhebbarkd@gmail.com' THEN
        INSERT INTO public.profiles (id, email, role)
        VALUES (NEW.id, NEW.email, 'super_admin');
    ELSE
        INSERT INTO public.profiles (id, email, role)
        VALUES (NEW.id, NEW.email, 'student');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Overwrite existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 5. COURSES & LESSONS
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    faculty_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='department_id') THEN
        ALTER TABLE courses ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='status') THEN
        ALTER TABLE courses ADD COLUMN status TEXT DEFAULT 'pending_verification';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='is_compiler_enabled') THEN
        ALTER TABLE courses ADD COLUMN is_compiler_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;


CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_type TEXT,
    cf_stream_id TEXT,
    external_url TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='created_by') THEN
        ALTER TABLE lessons ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='status') THEN
        ALTER TABLE lessons ADD COLUMN status TEXT DEFAULT 'pending_verification';
    END IF;
END $$;


-- 6. OTHERS
CREATE TABLE IF NOT EXISTS aptitude_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language_id INT NOT NULL,
    status TEXT NOT NULL,
    output TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'started' CHECK (status IN ('started', 'completed')),
    score NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ENABLE RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE aptitude_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;


-- 8. RESET AND APPLY RLS POLICIES
-- Drops all existing policies to completely prevent duplicate name clashes!
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('departments', 'sections', 'profiles', 'courses', 'lessons', 'aptitude_questions', 'submissions', 'announcements', 'student_progress')
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;


-- ### PROFILES ###
CREATE POLICY "Profiles readable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Dept Admins update department profiles" ON profiles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles admin 
    WHERE admin.id = auth.uid() AND admin.role = 'dept_admin' AND admin.department_id = profiles.department_id
  )
) WITH CHECK (role IN ('student', 'faculty'));

CREATE POLICY "Dean updates profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dean')
) WITH CHECK (role != 'super_admin');

CREATE POLICY "Super admin update all profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);


-- ### DEPARTMENTS & SECTIONS ###
CREATE POLICY "Departments readable by all" ON departments FOR SELECT USING (true);
CREATE POLICY "Super admin manage departments" ON departments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Sections readable by all" ON sections FOR SELECT USING (true);
CREATE POLICY "Dean and Super admin manage sections" ON sections FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dean'))
);


-- ### COURSES ###
CREATE POLICY "Published courses readable by everyone" ON courses FOR SELECT USING (status = 'published');
CREATE POLICY "Creators see own courses" ON courses FOR SELECT USING (faculty_id = auth.uid());
CREATE POLICY "Dept Admins see dept courses" ON courses FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles admin WHERE admin.id = auth.uid() AND admin.role = 'dept_admin' AND admin.department_id = courses.department_id)
);
CREATE POLICY "Super users see all courses" ON courses FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('dean', 'super_admin'))
);
CREATE POLICY "Faculty and Admins insert courses" ON courses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'dept_admin', 'dean', 'super_admin'))
);
CREATE POLICY "Faculty update own courses, Admins all" ON courses FOR UPDATE USING (
  faculty_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('dept_admin', 'dean', 'super_admin'))
);


-- ### LESSONS ###
CREATE POLICY "Lessons readable logic" ON lessons FOR SELECT USING (
  status = 'published' OR 
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('dept_admin', 'dean', 'super_admin'))
);
CREATE POLICY "Faculty and Admins insert lessons" ON lessons FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'dept_admin', 'dean', 'super_admin'))
);
CREATE POLICY "Faculty update own lessons, Admins edit all" ON lessons FOR UPDATE USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dept_admin', 'dean', 'super_admin'))
);
CREATE POLICY "Faculty delete own lessons, Admins delete all" ON lessons FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dept_admin', 'dean', 'super_admin'))
);


-- ### PROGRESS ###
CREATE POLICY "Students see own progress" ON student_progress FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students update own progress" ON student_progress FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Super Users see all progress" ON student_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'dept_admin', 'dean', 'super_admin'))
);


-- ### OTHERS ###
CREATE POLICY "Aptitude readable by all" ON aptitude_questions FOR SELECT USING (true);
CREATE POLICY "Aptitude managed by supers" ON aptitude_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('dean', 'super_admin'))
);

CREATE POLICY "Submissions owner read" ON submissions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Submissions inserted by owner" ON submissions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Submissions supervised by faculties" ON submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'dept_admin', 'dean', 'super_admin'))
);
