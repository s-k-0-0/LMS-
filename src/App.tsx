import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout, ProtectedRoute } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Compiler from './pages/Compiler';
import FacultyStudio from './pages/FacultyStudio';
import ContentApprovals from './pages/ContentApprovals';
import UsersPanel from './pages/UsersPanel';
import VideoPlayer from './pages/VideoPlayer';
import Courses from './pages/Courses';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Layout />}>
          {/* Universal Dashboard (Role-specific content inside) */}
          <Route index element={
            <ProtectedRoute allowedRoles={['student', 'faculty', 'dept_admin', 'dean', 'super_admin']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="courses" element={
            <ProtectedRoute allowedRoles={['student', 'faculty', 'dept_admin', 'dean', 'super_admin']}>
              <Courses />
            </ProtectedRoute>
          } />
          
          {/* Student & Faculty */}
          <Route path="compiler" element={
            <ProtectedRoute allowedRoles={['student', 'faculty', 'dept_admin', 'super_admin', 'dean']}>
              <Compiler />
            </ProtectedRoute>
          } />
          
          {/* Student Only */}
          <Route path="courses/:id" element={
            <ProtectedRoute allowedRoles={['student', 'faculty', 'dept_admin', 'dean', 'super_admin']}>
              <VideoPlayer />
            </ProtectedRoute>
          } />

          {/* Faculty & Admin */}
          <Route path="studio" element={
            <ProtectedRoute allowedRoles={['faculty', 'dept_admin', 'dean', 'super_admin']}>
              <FacultyStudio />
            </ProtectedRoute>
          } />

          {/* Verification (Dept Admin & Dean) */}
          <Route path="approvals" element={
            <ProtectedRoute allowedRoles={['dept_admin', 'dean', 'super_admin']}>
              <ContentApprovals />
            </ProtectedRoute>
          } />

          {/* Admin & Super Admin */}
          <Route path="admin" element={
            <ProtectedRoute allowedRoles={['dept_admin', 'dean', 'super_admin']}>
              <UsersPanel />
            </ProtectedRoute>
          } />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
