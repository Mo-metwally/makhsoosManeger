import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, CalendarDays, Loader, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import './StaffManagement.css';

const StaffManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const response = await api.get('/shifts');
      setShifts(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching shifts:', err);
      setError('حدث خطأ أثناء جلب الورديات. يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      return timeStr;
    }
  };

  if (loading) {
    return (
      <div className="staff-loading">
        <Loader className="spinner" size={40} />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="staff-error">
        <ShieldAlert size={50} />
        <p>{error}</p>
        <button onClick={fetchShifts} className="retry-btn">إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="staff-management-container">
      <div className="sm-header">
        <div>
          <h1 className="sm-title">
            <Users size={32} className="sm-title-icon" />
            إدارة الموظفين
          </h1>
          <p className="sm-subtitle">إدارة ومتابعة الموظفين حسب الورديات والإحصائيات الخاصة بهم</p>
        </div>
      </div>

      <div className="shifts-grid">
        {shifts.length === 0 ? (
          <div className="no-shifts">لا يوجد ورديات مسجلة حالياً.</div>
        ) : (
          shifts.map((shift) => (
            <div 
              key={shift.id} 
              className="shift-card"
              onClick={() => navigate(`/staff-management/${shift.id}`)}
            >
              <div className="shift-card-header">
                <h2>{shift.name}</h2>
                <span className="staff-badge">
                  <Users size={14} />
                  {shift.Users ? shift.Users.length : 0} موظفين
                </span>
              </div>
              
              <div className="shift-card-body">
                <div className="shift-detail">
                  <Clock size={16} />
                  <span>{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</span>
                </div>
                <div className="shift-detail">
                  <CalendarDays size={16} />
                  <span>
                    {shift.workingDays.length} أيام عمل 
                    {shift.dayOffType === 'Fixed' ? ` (${shift.fixedDaysOff.join('، ')})` : ` (متغير)`}
                  </span>
                </div>
              </div>
              
              <div className="shift-card-footer">
                <button className="view-staff-btn">
                  عرض تفاصيل الموظفين
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StaffManagement;
