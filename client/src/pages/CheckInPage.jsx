import './CheckInPage.scss';
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
    <div className="checkinpage-style-1">
      <div className="checkinpage-style-2">
        {/* Decorative Top Glow */}
        <div className="checkinpage-style-3"></div>

        <h1 className="checkinpage-style-4">
          مرحباً بك، {userName.split(' ')[0]}
        </h1>
        <p className="checkinpage-style-5">يرجى تسجيل الحضور للبدء في ورديتك</p>

        {shift && (
          <div className="checkinpage-style-6">
            <div className="checkinpage-style-7">
              <span className="checkinpage-style-8">الوردية الحالية:</span>
              <strong className="checkinpage-style-9">{shift.name}</strong>
            </div>
            <div className="checkinpage-style-10">
              <span className="checkinpage-style-11">توقيت الوردية:</span>
              <span className="checkinpage-style-12"><Clock size={14} className="checkinpage-style-13" /> من {shift.startTime} إلى {shift.endTime}</span>
            </div>
            {delayStr && (
              <div className="checkinpage-style-14">
                <AlertCircle size={16} />
                {delayStr}
              </div>
            )}
          </div>
        )}

        <div className="checkinpage-style-15">
          <div className="checkinpage-style-16">
            {formatTime(time)}
          </div>
          <div className="checkinpage-style-17">
            {formatDate(time)}
          </div>
        </div>

        {error && (
          <div className="checkinpage-style-18">
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
