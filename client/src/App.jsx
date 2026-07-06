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
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  
  const [isIdle, setIsIdle] = useState(false);
  const [idleStartTime, setIdleStartTime] = useState(null);
  
  // 5 minutes in milliseconds for the warning popup
  const IDLE_TIMEOUT = 5 * 60 * 1000;
  // 10 minutes in milliseconds for logging
  const LOG_THRESHOLD = 10 * 60 * 1000;

  const resetIdleTimer = useCallback(() => {
    if (isIdle || !user) return; // Don't reset if already idle or not logged in
    
    // Clear existing timer
    if (window.idleTimer) clearTimeout(window.idleTimer);
    
    // Set new timer
    window.idleTimer = setTimeout(() => {
      const activeBreak = localStorage.getItem('activeBreak');
      if (activeBreak) {
        return;
      }
      
      setIsIdle(true);
      setIdleStartTime(new Date(Date.now() - IDLE_TIMEOUT));
    }, IDLE_TIMEOUT);
  }, [isIdle, user, IDLE_TIMEOUT]);

  useEffect(() => {
    if (!user) return;
    
    resetIdleTimer();
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    
    const handleUserActivity = () => {
      resetIdleTimer();
    };

    events.forEach(event => window.addEventListener(event, handleUserActivity));

    return () => {
      if (window.idleTimer) clearTimeout(window.idleTimer);
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, [resetIdleTimer, user]);

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

  const handleReactivate = async () => {
    if (idleStartTime) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - idleStartTime.getTime();
      
      if (durationMs > LOG_THRESHOLD) {
        const newLog = {
          id: Date.now().toString(),
          startTime: idleStartTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: durationMs,
          type: 'idle',
          supervisorName: user.name
        };
        try {
          await api.post('/data/inactivity', [newLog]);
        } catch (error) {
          console.error("Failed to save idle log to server", error);
        }
      }
    }

    setIsIdle(false);
    setIdleStartTime(null);

    if (window.idleTimer) clearTimeout(window.idleTimer);
    window.idleTimer = setTimeout(() => {
      setIsIdle(true);
      setIdleStartTime(new Date(Date.now() - IDLE_TIMEOUT));
    }, IDLE_TIMEOUT);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>جاري التحميل...</div>;
  }

  if (!user) {
    return <Login />;
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
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        <footer className="global-footer">
          <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()}</p>
          <a href="https://mohammed-metwally-classic.web.app/" target="_blank" rel="noopener noreferrer" className="footer-link">
            Mohamed Metwally
          </a>
        </footer>
      </main>

      {isIdle && (
        <div className="idle-overlay">
          <div className="idle-modal">
            <div className="idle-icon-wrapper">
              <TriangleAlert size={70} strokeWidth={1.5} color="#f97316" />
            </div>
            
            <h2 className="idle-title">تنبيه خمول:</h2>
            
            <p className="idle-subtitle">
              تم تحويل حالتك إلى <span className="idle-red-text">(غير نشط)</span>
            </p>
            <p className="idle-desc">لعدم رصد حركة.</p>
            
            <button className="idle-reactivate-btn" onClick={handleReactivate}>
              <PlayCircle size={22} />
              <span>إعادة تنشيط والعودة للعمل</span>
            </button>
            
            <div className="idle-footer">
              <Info size={14} />
              <span>لم يتم رصد أي حركة لمدة 5 دقائق.</span>
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
      <AppContent />
    </AuthProvider>
  );
}

export default App;
