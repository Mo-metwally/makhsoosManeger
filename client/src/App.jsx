import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { TriangleAlert, PlayCircle, Info } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './services/api';

import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Calls from './pages/Calls';
import Account from './pages/Account';
import Monitoring from './pages/Monitoring';
import HandleAdminAdd from './pages/HandleAdminAdd';
import HandleAdmin from './pages/HandleAdmin';
import HandleAdminReports from './pages/HandleAdminReports';
import HandleAdminPerformance from './pages/HandleAdminPerformance';
import HandleAdminExport from './pages/HandleAdminExport';
import Summary from './pages/Summary';
import PerformanceLog from './pages/PerformanceLog';
import ReportEditor from './pages/ReportEditor';
import QualityReport from './pages/QualityReport';
import DiscountsReport from './pages/DiscountsReport';
import PermissionsReport from './pages/PermissionsReport';
import ShiftManagement from './pages/ShiftManagement';
import Attendance from './pages/Attendance';
import DayOff from './pages/DayOff';
import DayOffManagement from './pages/DayOffManagement';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import StaffManagement from './pages/StaffManagement';
import ShiftStaffDetails from './pages/ShiftStaffDetails';
import PendingApproval from './pages/PendingApproval';
import CheckInPage from './pages/CheckInPage';
import CheckoutModal from './components/CheckoutModal';
import TodayFollowup from './pages/TodayFollowup';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  

  // Attendance State
  const [attendanceChecked, setAttendanceChecked] = useState(false);
  const [needsCheckIn, setNeedsCheckIn] = useState(false);
  const [todayShift, setTodayShift] = useState(null);

  useEffect(() => {
    if (user && user.status === 'Active') {
      api.get('/attendance/status').then(res => {
         if (res.data.hasShiftToday && !res.data.hasCheckedIn) {
            setTodayShift(res.data.shift);
            setNeedsCheckIn(true);
         } else {
            setNeedsCheckIn(false);
         }
         setAttendanceChecked(true);
      }).catch(err => {
         console.error('Error checking attendance status:', err);
         setAttendanceChecked(true); // Proceed on error to avoid blocking
      });
    } else {
      setAttendanceChecked(true);
    }
  }, [user]);
  

  useEffect(() => {
    const applyTheme = () => {
      const avatar = user?.avatar || localStorage.getItem('userAvatar') || 'User';
      document.documentElement.setAttribute('data-theme', avatar);
    };

    applyTheme(); 
    window.addEventListener('profileUpdated', applyTheme);

    return () => {
      window.removeEventListener('profileUpdated', applyTheme);
    };
  }, [user]);


  if (loading || (user && user.status === 'Active' && !attendanceChecked)) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>جاري التحميل...</div>;
  }

  if (!user) {
    return <Login />;
  }

  // Handle pending approval users
  if (user.status === 'Pending Approval') {
    return <PendingApproval />;
  }

  if (needsCheckIn) {
    return <CheckInPage onCheckedIn={() => setNeedsCheckIn(false)} shift={todayShift} userName={user.fullName} />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calls" element={<Calls />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/account" element={<Account />} />
          <Route path="/handleAdminAdd" element={<HandleAdminAdd />} />
          <Route path="/handleAdmin" element={<HandleAdmin />} />
          <Route path="/handleAdminReports" element={<HandleAdminReports />} />
          <Route path="/handleAdminPerformance" element={<HandleAdminPerformance />} />
          <Route path="/handleAdminExport" element={<HandleAdminExport />} />
          <Route path="/summery" element={<Summary />} />
          <Route path="/performance-log" element={<PerformanceLog />} />
          <Route path="/report-editor" element={<ReportEditor />} />
          <Route path="/report-editor/quality" element={<QualityReport />} />
          <Route path="/report-editor/discounts" element={<DiscountsReport />} />
          <Route path="/permissions" element={<PermissionsReport />} />
          <Route path="/shift-management" element={<ShiftManagement />} />
          <Route path="/dayoff-management" element={<DayOffManagement />} />
          <Route path="/dayoff" element={<DayOff />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/staff-management" element={<StaffManagement />} />
          <Route path="/staff-management/:shiftId" element={<ShiftStaffDetails />} />
          <Route path="/today-followup" element={<TodayFollowup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        <footer className="global-footer">
          <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()}</p>
          <a href="https://mohammed-metwally-classic.web.app/" target="_blank" rel="noopener noreferrer" className="footer-link">
            Mohamed Metwally
          </a>
        </footer>
      </main>

      <CheckoutModal />


    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
