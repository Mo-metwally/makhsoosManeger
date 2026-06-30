import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { TriangleAlert, PlayCircle, Info } from 'lucide-react';
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
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  const [isIdle, setIsIdle] = useState(false);
  const [idleStartTime, setIdleStartTime] = useState(null);
  
  // 5 minutes in milliseconds for the warning popup
  const IDLE_TIMEOUT = 5 * 60 * 1000;
  // 10 minutes in milliseconds for logging
  const LOG_THRESHOLD = 10 * 60 * 1000;

  const resetIdleTimer = useCallback(() => {
    if (isIdle) return; // Don't reset if already idle, user must click the button
    
    // Clear existing timer
    if (window.idleTimer) clearTimeout(window.idleTimer);
    
    // Set new timer
    window.idleTimer = setTimeout(() => {
      const activeBreak = localStorage.getItem('activeBreak');
      if (activeBreak) {
        // If the user is on a sub-status (break, meeting, etc.), do not trigger idle warning.
        return;
      }
      
      setIsIdle(true);
      // The actual idle period started 5 minutes ago
      setIdleStartTime(new Date(Date.now() - IDLE_TIMEOUT));
    }, IDLE_TIMEOUT);
  }, [isIdle, IDLE_TIMEOUT]);

  useEffect(() => {
    // Initial timer setup
    resetIdleTimer();

    // Events to track activity
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    
    const handleUserActivity = () => {
      resetIdleTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      if (window.idleTimer) clearTimeout(window.idleTimer);
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    const applyTheme = () => {
      const avatar = localStorage.getItem('userAvatar') || 'User';
      document.documentElement.setAttribute('data-theme', avatar);
    };

    applyTheme(); // Apply on mount
    window.addEventListener('profileUpdated', applyTheme);

    return () => {
      window.removeEventListener('profileUpdated', applyTheme);
    };
  }, []);

  const handleReactivate = () => {
    // Check if we need to log the inactivity
    if (idleStartTime) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - idleStartTime.getTime();
      
      // Only log if total inactivity exceeds 10 minutes
      if (durationMs > LOG_THRESHOLD) {
        const logs = JSON.parse(localStorage.getItem('inactivity_logs') || '[]');
        const newLog = {
          id: Date.now(),
          startTime: idleStartTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: durationMs,
          type: 'idle'
        };
        localStorage.setItem('inactivity_logs', JSON.stringify([...logs, newLog]));
      }
    }

    setIsIdle(false);
    setIdleStartTime(null);

    // Reset timer immediately after reactivating
    if (window.idleTimer) clearTimeout(window.idleTimer);
    window.idleTimer = setTimeout(() => {
      setIsIdle(true);
      setIdleStartTime(new Date(Date.now() - IDLE_TIMEOUT));
    }, IDLE_TIMEOUT);
  };

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
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        {/* Global Footer */}
        <footer className="global-footer">
          <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()}</p>
          <a href="https://mohammed-metwally-classic.web.app/" target="_blank" rel="noopener noreferrer" className="footer-link">
            Mohamed Metwally
          </a>
        </footer>
      </main>

      {/* Idle Warning Modal */}
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

export default App;
