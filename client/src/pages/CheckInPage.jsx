import React, { useState, useEffect } from 'react';
import { Fingerprint, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const CheckInPage = ({ onCheckedIn, shift, userName, isDayOffWork }) => {
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/attendance/checkin', { isDayOffWork });
      onCheckedIn(); // Notify parent to dismiss the page
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء تسجيل الحضور');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getDelayString = () => {
    if (!shift || !shift.startTime) return null;
    
    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
    const startTimeDate = new Date();
    startTimeDate.setHours(startHour, startMinute, 0, 0);
    
    // Calculate difference in milliseconds
    const diffMs = time.getTime() - startTimeDate.getTime();
    
    // If not late yet, return null
    if (diffMs <= 0) return null;
    
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    
    if (hours > 0) {
      return `متأخر بمقدار ${hours} ساعة و ${minutes} دقيقة`;
    }
    return `متأخر بمقدار ${minutes} دقيقة`;
  };

  const delayStr = getDelayString();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--bg-main) 0%, #111827 100%)',
      color: 'var(--text-primary)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '24px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Top Glow */}
        <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '100px', background: 'var(--accent-blue)', filter: 'blur(80px)', opacity: 0.5 }}></div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', background: 'linear-gradient(90deg, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          مرحباً بك، {userName.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.1rem' }}>يرجى تسجيل الحضور للبدء في ورديتك</p>

        {shift && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>الوردية الحالية:</span>
              <strong style={{ color: '#60a5fa' }}>{shift.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>توقيت الوردية:</span>
              <span style={{ color: 'var(--text-primary)' }}><Clock size={14} style={{ display: 'inline', marginLeft: '4px', verticalAlign: 'middle', color: '#60a5fa' }} /> من {shift.startTime} إلى {shift.endTime}</span>
            </div>
            {delayStr && (
              <div style={{ marginTop: '0.5rem', padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                {delayStr}
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '3rem' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px', color: 'var(--text-primary)', textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>
            {formatTime(time)}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
            {formatDate(time)}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <button
          onClick={handleCheckIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '1.2rem',
            borderRadius: '16px',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.8rem',
            boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            opacity: loading ? 0.7 : 1
          }}
          onMouseOver={e => !loading && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 15px 25px rgba(59, 130, 246, 0.4)')}
          onMouseOut={e => !loading && (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 10px 20px rgba(59, 130, 246, 0.3)')}
        >
          {loading ? (
            <span>جاري التسجيل...</span>
          ) : (
            <>
              <Fingerprint size={28} />
              تسجيل الحضور الآن
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CheckInPage;
