import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import AdminNavBar from './AdminNavBar';

const AdminGuard = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if previously authenticated in this session
    const authStatus = sessionStorage.getItem('adminAuthStatus');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '01009770207') {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuthStatus', 'true');
      setError('');
    } else {
      setError('كلمة المرور غير صحيحة');
      setPassword('');
    }
  };

  if (isChecking) return null;

  if (isAuthenticated) {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <AdminNavBar />
        {children}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      width: '100%'
    }}>
      <div className="dashboard-card" style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div className="status-icon glow" style={{ width: '60px', height: '60px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Lock size={30} />
          </div>
        </div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>منطقة الإدارة المغلقة</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          يرجى إدخال كلمة المرور للوصول إلى هذه الصفحة.
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور..."
            style={{
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              color: 'white',
              textAlign: 'center',
              letterSpacing: '3px',
              fontSize: '1.2rem'
            }}
            autoFocus
          />
          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={16} /> {error}
            </div>
          )}
          <button
            type="submit"
            className="btn-save"
            style={{ padding: '1rem', marginTop: '0.5rem' }}
          >
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminGuard;
