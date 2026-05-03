import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout, ProtectedRoute } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Compiler from './pages/Compiler';
import AptitudeEngine from './pages/AptitudeEngine';
import FacultyStudio from './pages/FacultyStudio';
import SuperAdminPanel from './pages/SuperAdminPanel';
import VideoPlayer from './pages/VideoPlayer';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Layout />}>
          {/* Universal Dashboard (Role-specific content inside) */}
          <Route index element={
            <ProtectedRoute allowedRoles={['student', 'faculty', 'admin', 'super_admin']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Student & Faculty */}
          <Route path="compiler" element={
            <ProtectedRoute allowedRoles={['student', 'faculty', 'admin', 'super_admin']}>
              <Compiler />
            </ProtectedRoute>
          } />
          
          {/* Student Only */}
          <Route path="aptitude" element={
            <ProtectedRoute allowedRoles={['student', 'admin', 'super_admin']}>
              <AptitudeEngine />
            </ProtectedRoute>
          } />
          
          <Route path="lesson/:id" element={
            <ProtectedRoute allowedRoles={['student', 'faculty', 'admin', 'super_admin']}>
              <VideoPlayer />
            </ProtectedRoute>
          } />

          {/* Faculty & Admin */}
          <Route path="studio" element={
            <ProtectedRoute allowedRoles={['faculty', 'admin', 'super_admin']}>
              <FacultyStudio />
            </ProtectedRoute>
          } />

          {/* Admin & Super Admin */}
          <Route path="admin" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <SuperAdminPanel />
            </ProtectedRoute>
          } />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
