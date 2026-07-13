import React, { useState, useEffect } from 'react';
import { LogOut, Clock, X } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const CheckoutModal = () => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [shiftData, setShiftData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);

  useEffect(() => {
    checkStatus();
    // Poll every 1 minute to check time
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    if (checkedOut) return;
    try {
      const res = await api.get('/attendance/status');
      if (res.data.hasCheckedIn && res.data.log && !res.data.log.checkOutTime) {
        const shift = res.data.log.Shift;
        if (shift && shift.endTime) {
          setShiftData(shift);
          checkIfShouldOpen(shift, res.data.log.date);
        }
      } else if (res.data.log && res.data.log.checkOutTime) {
        setCheckedOut(true);
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Error fetching attendance status for checkout modal:', err);
    }
  };

  const checkIfShouldOpen = (shift, logDate) => {
    const now = new Date();
    const [hours, minutes] = shift.endTime.split(':').map(Number);
    const shiftEndTime = new Date(logDate);
    shiftEndTime.setHours(hours, minutes, 0, 0);

    // If shift ends after midnight (e.g. start 20:00, end 04:00)
    const [startH] = shift.startTime.split(':').map(Number);
    if (hours < startH) {
      shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }

    const diffMs = shiftEndTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    // Open if <= 5 minutes remaining OR if it's already past the end time
    if (diffMins <= 5) {
      setIsOpen(true);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await api.post('/attendance/checkout');
      setCheckedOut(true);
      setIsOpen(false);
      // Optional: reload the page or show success
      window.location.reload();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'حدث خطأ أثناء تسجيل الانصراف', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '2.5rem',
        maxWidth: '450px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        position: 'relative'
      }}>
        <button onClick={() => setIsOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: '#ef4444' }}>
          <LogOut size={32} />
        </div>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>حان وقت الانصراف</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
          ورديتك الحالية ({shiftData?.name}) تقترب من نهايتها أو انتهت بالفعل. يرجى تسجيل الانصراف الآن.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: '#60a5fa' }}>
          <Clock size={20} />
          موعد انتهاء الوردية: <span style={{ direction: 'ltr', fontWeight: 'bold' }}>{shiftData?.endTime}</span>
        </div>

        <button
          onClick={handleCheckOut}
          disabled={loading}
          style={{
            width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white',
            fontSize: '1.1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'transform 0.2s', opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'جاري التسجيل...' : 'تسجيل الانصراف'}
        </button>
      </div>
    </div>
  );
};

export default CheckoutModal;
