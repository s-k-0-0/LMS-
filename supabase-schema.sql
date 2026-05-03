-- 1. IDENTITY & RBAC
-- Create custom types for roles
CREATE TYPE user_role AS ENUM ('student', 'faculty', 'admin', 'super_admin');

-- Create Profiles Table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    streak_count INT DEFAULT 0,
    last_login DATE,
    points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Only skhebbarkd@gmail.com becomes super_admin
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

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. COURSES
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    faculty_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LESSONS
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_type TEXT, -- e.g., 'video', 'pdf', 'quiz'
    cf_stream_id TEXT, -- Cloudflare Stream Video ID
    external_url TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. APTITUDE QUESTIONS
CREATE TABLE aptitude_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUBMISSIONS
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language_id INT NOT NULL, -- Judge0 Language ID
    status TEXT NOT NULL,
    output TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ANNOUNCEMENTS
CREATE TABLE announcements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) setup

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE aptitude_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles (needed for dashboards), but only update their own (admins/super_admins can update all)
CREATE POLICY "Profiles are readable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admins can update any profile" ON profiles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Lessons: Anyone can read, faculty/admin/super_admin can insert/update
CREATE POLICY "Lessons are readable by everyone" ON lessons FOR SELECT USING (true);
CREATE POLICY "Faculty and Admins can insert lessons" ON lessons FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'super_admin')
  )
);
CREATE POLICY "Faculty and Admins can update lessons" ON lessons FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'super_admin')
  )
);
CREATE POLICY "Faculty and Admins can delete lessons" ON lessons FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'super_admin')
  )
);

-- Courses: 
CREATE POLICY "Courses are readable by everyone" ON courses FOR SELECT USING (true);
CREATE POLICY "Faculty and Admins can insert courses" ON courses FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'super_admin')
  )
);
CREATE POLICY "Faculty and Admins can update courses" ON courses FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'super_admin')
  )
);
CREATE POLICY "Faculty and Admins can delete courses" ON courses FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'super_admin')
  )
);

