import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { TriangleAlert, PlayCircle, Info } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './services/api';
import { getLogicalDateString } from './utils/dateHelpers';

import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Calls from './pages/Calls';
import Account from './pages/Account';
import Monitoring from './pages/Monitoring';
// import HandleAdminAdd from './pages/HandleAdminAdd';
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
import ReportEditorPermissions from './pages/ReportEditorPermissions';
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
import PersonalFollowup from './pages/PersonalFollowup';
import Expenses from './pages/Expenses';
import ExpensesAdd from './pages/ExpensesAdd';
import MyAdvances from './pages/MyAdvances';
import ComingSoon from './pages/ComingSoon';
import GeneralSettings from './pages/GeneralSettings';
import TrackerSettings from './pages/TrackerSettings';
import { ToastProvider } from './contexts/ToastContext';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();


  // Attendance State
  const [attendanceChecked, setAttendanceChecked] = useState(false);
  const [needsCheckIn, setNeedsCheckIn] = useState(false);
  const [todayShift, setTodayShift] = useState(null);
  const [isEarlyForShift, setIsEarlyForShift] = useState(false);

  const [showSummaryReminder, setShowSummaryReminder] = useState(false);
  const [activeWorkShift, setActiveWorkShift] = useState(null);

  const [leaveStatus, setLeaveStatus] = useState(null); // 'Absent' | 'DayOff'
  const [overrideLeave, setOverrideLeave] = useState(false);

  useEffect(() => {
    if (user && user.status === 'Active') {
      // Fetch settings first to ensure logicalDayCutoff is up to date
      api.get('/settings').then(res => {
        if (res.data) {
          if (res.data.logicalDayCutoff) localStorage.setItem('logicalDayCutoff', res.data.logicalDayCutoff);
          if (res.data.allowedDelayMinutes) localStorage.setItem('allowedDelayMinutes', res.data.allowedDelayMinutes);
        }
      }).catch(console.error);

      api.get('/attendance/status').then(res => {
        if (res.data.isDayOff || (res.data.log && res.data.log.status === 'Absent')) {
          setLeaveStatus(res.data.isDayOff ? 'DayOff' : 'Absent');
          setTodayShift(res.data.shift);
          setNeedsCheckIn(true);
        } else if (res.data.hasShiftToday && !res.data.hasCheckedIn) {
          setTodayShift(res.data.shift);
          setNeedsCheckIn(true);

          // Calculate isEarlyForShift synchronously to prevent UI flicker
          if (res.data.shift && res.data.shift.startTime) {
            const [startHour, startMinute] = res.data.shift.startTime.split(':').map(Number);
            const startTimeDate = new Date();
            startTimeDate.setHours(startHour, startMinute, 0, 0);
            const diffMs = new Date().getTime() - startTimeDate.getTime();
            setIsEarlyForShift(diffMs < -300000);
          }
        } else if (res.data.hasCheckedIn && res.data.log && !res.data.log.checkOutTime) {
          // User is currently checked in
          setActiveWorkShift(res.data.log.Shift || res.data.shift);
          setNeedsCheckIn(false);
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

  // Check if it's too early for the shift (more than 5 minutes before start)
  useEffect(() => {
    if (needsCheckIn && todayShift && todayShift.startTime) {
      const checkEarly = () => {
        const [startHour, startMinute] = todayShift.startTime.split(':').map(Number);
        const startTimeDate = new Date();
        startTimeDate.setHours(startHour, startMinute, 0, 0);

        const diffMs = new Date().getTime() - startTimeDate.getTime();
        // If diffMs < -300000 (more than 5 mins early), it is early
        setIsEarlyForShift(diffMs < -300000);
      };

      checkEarly();
      const timer = setInterval(checkEarly, 10000); // Check every 10 seconds
      return () => clearInterval(timer);
    } else {
      setIsEarlyForShift(false);
    }
  }, [needsCheckIn, todayShift]);

  // Check if it's 30 mins before shift ends to show Summary reminder
  useEffect(() => {
    if (!activeWorkShift || !activeWorkShift.endTime) return;

    const checkReminder = () => {
      const now = new Date();
      const todayStr = getLogicalDateString(now);
      if (localStorage.getItem('summaryReminderDate') === todayStr) return;

      const [startHour] = activeWorkShift.startTime ? activeWorkShift.startTime.split(':').map(Number) : [0];
      const [endHour, endMinute] = activeWorkShift.endTime.split(':').map(Number);
      const endTimeDate = new Date();
      endTimeDate.setHours(endHour, endMinute, 0, 0);

      // If shift crosses midnight (e.g. 17:00 to 01:00)
      if (endHour < startHour) {
        if (now.getHours() >= startHour) {
          // If current time is before midnight, the end time is tomorrow
          endTimeDate.setDate(endTimeDate.getDate() + 1);
        } else {
          // If current time is after midnight, the end time is today (which is already set)
        }
      }

      const diffMs = endTimeDate.getTime() - now.getTime();
      const diffMins = diffMs / 60000;

      // If within 30 minutes before end time, or even past it but still checked in
      if (diffMins <= 30 && diffMins > -120) {
        setShowSummaryReminder(true);
      }
    };

    checkReminder();
    const timer = setInterval(checkReminder, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [activeWorkShift]);

  useEffect(() => {
    const applyTheme = () => {
      const avatar = user?.avatar || localStorage.getItem('userAvatar') || 'User';
      document.documentElement.setAttribute('data-theme', avatar);
      
      const appMode = localStorage.getItem('app-mode') || 'dark';
      document.documentElement.setAttribute('data-mode', appMode);
    };

    applyTheme();
    window.addEventListener('profileUpdated', applyTheme);
    window.addEventListener('modeUpdated', applyTheme);

    return () => {
      window.removeEventListener('profileUpdated', applyTheme);
      window.removeEventListener('modeUpdated', applyTheme);
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

  // Show CheckInPage only if they need to check in AND it's not more than 5 mins early
  if (needsCheckIn && !isEarlyForShift) {
    if (leaveStatus && !overrideLeave) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '2rem', textAlign: 'center' }}>
          <div style={{ background: 'var(--glass-bg)', padding: '3rem', borderRadius: '24px', border: 'var(--glass-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxWidth: '450px', width: '100%' }}>
            <div style={{ background: leaveStatus === 'DayOff' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: leaveStatus === 'DayOff' ? '#3b82f6' : '#ef4444', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem' }}>
              <Info size={40} />
            </div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>
              {leaveStatus === 'DayOff' ? 'أنت في إجازة اليوم' : 'تم تسجيلك غياب اليوم'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              {leaveStatus === 'DayOff' ? 'نتمنى لك إجازة سعيدة. لا تحتاج لتسجيل الحضور اليوم.' : 'لقد تم تسجيلك كغياب في نظام الحضور والانصراف لهذا اليوم.'}
            </p>
            <button
              onClick={() => setOverrideLeave(true)}
              style={{ padding: '0.8rem 1.5rem', background: 'transparent', border: '1px solid var(--theme-color)', color: 'var(--theme-color)', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseOver={e => { e.target.style.background = 'rgba(16, 185, 129, 0.1)' }}
              onMouseOut={e => { e.target.style.background = 'transparent' }}
            >
              تسجيل حضور
            </button>
          </div>
        </div>
      );
    }
    return <CheckInPage onCheckedIn={() => setNeedsCheckIn(false)} shift={todayShift} userName={user.fullName} />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contacts" element={<Calls />} />
          {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
            <Route path="/monitoring" element={<Monitoring />} />
          )}
          <Route path="/my-monitoring" element={<Monitoring isMyMonitoring={true} />} />
          <Route path="/account" element={<Account />} />
          {/* <Route path="/handleAdminAdd" element={<HandleAdminAdd />} /> */}
          <Route path="/allcontacts" element={<HandleAdmin />} />
          <Route path="/attendancereports" element={<HandleAdminReports />} />
          <Route path="/allPerformance" element={<HandleAdminPerformance />} />
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
          <Route path="/personal-followup/:employeeId?" element={<PersonalFollowup />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/expenses-add" element={<ExpensesAdd />} />
          <Route path="/my-advances" element={<MyAdvances />} />
          <Route path="/general-settings" element={<GeneralSettings />} />
          <Route path="/tracker-settings" element={<TrackerSettings />} />
          <Route path="/report-editor/permissions" element={<ReportEditorPermissions />} />
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

      {/* Summary Reminder Modal */}
      {showSummaryReminder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="fade-in" style={{ background: 'var(--bg-main)', padding: '2.5rem', borderRadius: '16px', maxWidth: '450px', width: '90%', textAlign: 'center', border: '1px solid var(--theme-color)', boxShadow: '0 10px 40px rgba(var(--theme-color-rgb, 16,185,129), 0.3)' }}>
            <div style={{ color: 'var(--theme-color)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <Info size={64} />
            </div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1.8rem' }}>تذكير هام!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.6' }}>
              شارفت ورديتك على الانتهاء (أقل من 30 دقيقة). يرجى التأكد من كتابة <strong>ملخص المهام اليومية</strong> قبل الانصراف.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => {
                  setShowSummaryReminder(false);
                  localStorage.setItem('summaryReminderDate', getLogicalDateString(new Date()));
                  window.location.href = '/summery';
                }}
                style={{ flex: 1, background: 'var(--theme-color)', color: 'white', padding: '1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
              >
                الذهاب للملخص
              </button>
              <button 
                onClick={() => {
                  setShowSummaryReminder(false);
                  localStorage.setItem('summaryReminderDate', getLogicalDateString(new Date()));
                }}
                style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
              >
                تخطي
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
