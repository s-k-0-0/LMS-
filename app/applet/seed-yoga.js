import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  console.log("Checking for super admin profile...");
  const { data: superAdmins, error: saError } = await supabase.from('profiles').select('id').eq('role', 'super_admin').limit(1);
  if (saError) { console.error(saError); return; }
  
  const superAdminId = superAdmins && superAdmins.length > 0 ? superAdmins[0].id : null;
  
  if (!superAdminId) {
      console.log('No super admin found. Assuming anonymous insertion works or will fail gracefully.');
  }

  // Insert yoga course
  console.log("Inserting Yoga course...");
  const { data: course, error } = await supabase.from('courses').insert({
    title: 'Mandatory Yoga & Wellness',
    description: 'A holistic approach to mental and physical well-being. Mandatory for all students.',
    category: 'soft_skills',
    status: 'published',
    content_type: 'course',
    is_mandatory: true,
    faculty_id: superAdminId
  }).select().single();
  
  if (error) {
    if (error.code === '42703' && error.message.includes('content_type')) {
       console.log('content_type column does not exist! User needs to run SQL.');
    } else {
       console.error('Error inserting course:', error);
    }
    return;
  }
  
  console.log("Yoga course created with ID", course.id);
  
  // Insert yoga lesson
  const { error: lessonErr } = await supabase.from('lessons').insert({
    course_id: course.id,
    title: 'Introduction to Ashtanga Yoga',
    content_type: 'youtube_video',
    cf_stream_id: 's2NQhpFGIOg',
    status: 'published',
    created_by: superAdminId
  });
  
  if (lessonErr) {
    console.error('Error inserting lesson:', lessonErr);
  } else {
    console.log("Yoga lesson created!");
  }
}

run();
