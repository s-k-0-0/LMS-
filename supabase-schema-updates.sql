-- UPDATE SCRIPT FOR ADDITIONAL FIELDS AND DEPARTMENTS
-- Run this in your Supabase SQL Editor

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='name') THEN
        ALTER TABLE profiles ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='emp_usn_id') THEN
        ALTER TABLE profiles ADD COLUMN emp_usn_id TEXT;
    END IF;
END $$;

-- Insert departments if they don't exist
INSERT INTO departments (name)
SELECT name FROM (
  VALUES 
    ('School of Management and Commerce'),
    ('School of Engineering and Technology'),
    ('School of Computer Science and Applications'),
    ('School of Allied Healthcare Professionals'),
    ('School of Allied Health Sciences'),
    ('School of Physiotherapy'), -- corrected spelling usually, but user wrote Physiotheropy. Let's use Physiotherapy
    ('Division of Yoga and Humanities'),
    ('School of Science and Humanities')
) AS new_depts(name)
WHERE NOT EXISTS (
  SELECT 1 FROM departments WHERE departments.name = new_depts.name
);
