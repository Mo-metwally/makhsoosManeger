import './CheckoutModal.scss';
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
          checkIfShouldOpen(shift, res.data.log.date, res.data.log.checkInTime);
        }
      } else if (res.data.log && res.data.log.checkOutTime) {
        setCheckedOut(true);
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Error fetching attendance status for checkout modal:', err);
    }
  };

  const checkIfShouldOpen = (shift, logDate, checkInTimeStr) => {
    const now = new Date();
    const [hours, minutes] = shift.endTime.split(':').map(Number);
    const shiftEndTime = new Date(logDate);
    shiftEndTime.setHours(hours, minutes, 0, 0);

    // If shift ends after midnight (e.g. start 20:00, end 04:00)
    const [startH] = shift.startTime.split(':').map(Number);
    if (hours < startH) {
      shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }

    if (checkInTimeStr) {
      const checkInDate = new Date(checkInTimeStr);
      // If checkInDate is significantly AFTER the initially calculated shiftEndTime 
      // (e.g. checked in at 00:55 on Mon, but logical date made shiftEndTime Sun 10:00),
      // it means they checked in early for the next day's shift, so we add 1 day.
      if (checkInDate.getTime() > shiftEndTime.getTime() && (checkInDate.getTime() - shiftEndTime.getTime()) > 4 * 60 * 60 * 1000) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
      }
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
    <div className="checkoutmodal-style-1">
      <div className="checkoutmodal-style-2">
        <button onClick={() => setIsOpen(false)} className="checkoutmodal-style-3">
          <X size={24} />
        </button>

        <div className="checkoutmodal-style-4">
          <LogOut size={32} />
        </div>

        <h2 className="checkoutmodal-style-5">حان وقت الانصراف</h2>
        <p className="checkoutmodal-style-6">
          ورديتك الحالية ({shiftData?.name}) تقترب من نهايتها أو انتهت بالفعل. يرجى تسجيل الانصراف الآن.
        </p>

        <div className="checkoutmodal-style-7">
          <Clock size={20} />
          موعد انتهاء الوردية: <span className="checkoutmodal-style-8">{shiftData?.endTime}</span>
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
