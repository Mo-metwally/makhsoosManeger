import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Briefcase, LogIn, LogOut, CheckCircle, Info, Users, XCircle, Plane } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Account.css'; // Reuse container styles

const DAYS_OF_WEEK = [
  { id: 'Saturday', label: 'السبت' },
  { id: 'Sunday', label: 'الأحد' },
  { id: 'Monday', label: 'الإثنين' },
  { id: 'Tuesday', label: 'الثلاثاء' },
  { id: 'Wednesday', label: 'الأربعاء' },
  { id: 'Thursday', label: 'الخميس' },
  { id: 'Friday', label: 'الجمعة' }
];

const Attendance = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [myShifts, setMyShifts] = useState([]);
  const [expandedRowId, setExpandedRowId] = useState(null);

  useEffect(() => {
    document.title = "الحضور والانصراف | مخصوص";
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [logsRes, shiftsRes] = await Promise.all([
        api.get('/attendance/logs'),
        api.get('/shifts/my-shifts')
      ]);
      setLogs(logsRes.data);
      setMyShifts(shiftsRes.data);
    } catch (err) {
      console.error('Error fetching data', err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDelay = (checkInDateStr, shiftStartTimeStr) => {
    if (!checkInDateStr || !shiftStartTimeStr) return '---';

    const checkInDate = new Date(checkInDateStr);
    const [shiftHours, shiftMinutes] = shiftStartTimeStr.split(':').map(Number);

    const shiftStartDate = new Date(checkInDate);
    shiftStartDate.setHours(shiftHours, shiftMinutes, 0, 0);

    const diffMs = checkInDate - shiftStartDate;
    if (diffMs <= 0) return 'لا يوجد';

    const diffMins = Math.floor(diffMs / 60000);
    const allowedDelay = Number(localStorage.getItem('allowedDelayMinutes') || '15');
    const actualDelayMins = diffMins - allowedDelay;

    if (actualDelayMins <= 0) return 'لا يوجد';

    const hours = Math.floor(actualDelayMins / 60);
    const mins = actualDelayMins % 60;

    if (hours > 0) return `${hours} س ${mins > 0 ? `و ${mins} د` : ''}`;
    return `${mins} دقيقة`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="account-container">
      <header className="page-header">
        <div className="page-title-wrapper">
          <Briefcase size={28} className="title-icon text-blue" />
          <h1 className="page-title gradient-title">سجل الحضور والانصراف</h1>
        </div>
      </header>

      <div className="account-content">

        {/* Shift Info Section */}
        {myShifts.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={24} className="text-blue" />
              بيانات الوردية الحالية
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {myShifts.map(shift => {
                const shiftUsers = shift.Users || [];
                return (
                  <div key={shift.id} className="account-card" style={{ padding: '1.5rem 2rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>{shift.name}</h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', direction: 'ltr' }}>
                        <Clock size={16} className="text-blue" />
                        {shift.endTime} - {shift.startTime}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={16} className="text-blue" />
                        {(shift.workingDays || []).map(dId => DAYS_OF_WEEK.find(d => d.id === dId)?.label).join('، ')}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={16} className="text-blue" />
                        {shiftUsers.length} موظف
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                        <strong>نظام الإجازات:</strong>
                        {shift.dayOffType === 'Fixed' ? 'ثابت' : 'متغير'}
                      </span>
                      {shift.dayOffType === 'Fixed' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                          <strong>الأيام:</strong>
                          {(shift.fixedDaysOff || []).map(dId => DAYS_OF_WEEK.find(d => d.id === dId)?.label).join('، ') || 'لا يوجد'}
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                          <strong>الأيام المسموحة شهرياً:</strong>
                          {shift.variableDaysOffCount || 0} أيام
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                        <strong>فترة السماح للتأخير:</strong>
                        {localStorage.getItem('allowedDelayMinutes') || '15'} دقيقة
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={24} className="text-blue" />
          حركة الدوام السابقة
        </h2>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            لا توجد سجلات حضور مسجلة لك حالياً.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.02)' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'right' }}>
                  <th style={{ padding: '1rem' }}>التاريخ</th>
                  <th style={{ padding: '1rem' }}>اسم الموظف</th>
                  <th style={{ padding: '1rem' }}>الوردية</th>
                  <th style={{ padding: '1rem' }}>وقت الحضور</th>
                  <th style={{ padding: '1rem' }}>وقت الانصراف</th>
                  <th style={{ padding: '1rem' }}>التأخير</th>
                  <th style={{ padding: '1rem' }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <React.Fragment key={log.id}>
                  <tr 
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: log.notes ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (log.notes) setExpandedRowId(expandedRowId === log.id ? null : log.id);
                    }}
                  >
                    <td style={{ padding: '1rem' }}>{formatDate(log.date)}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{user ? user.fullName : '---'}</td>
                    <td style={{ padding: '1rem' }}>{log.Shift ? log.Shift.name : '---'}</td>
                    <td style={{ padding: '1rem', color: '#10b981' }}><LogIn size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {formatTime(log.checkInTime)}</td>
                    <td style={{ padding: '1rem', color: log.checkOutTime ? '#ef4444' : 'var(--text-secondary)' }}>
                      {log.checkOutTime ? <><LogOut size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {formatTime(log.checkOutTime)}</> : 'لم ينصرف بعد'}
                    </td>
                    <td style={{ padding: '1rem', color: '#f59e0b', fontWeight: 'bold' }}>
                      {calculateDelay(log.checkInTime, log.Shift?.startTime)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {log.status === 'Absent' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '20px', fontSize: '0.85rem' }}>
                          <XCircle size={14} /> غياب
                        </span>
                      ) : log.status === 'BusinessTrip' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderRadius: '20px', fontSize: '0.85rem' }}>
                          <Plane size={14} /> سفر عمل
                        </span>
                      ) : log.status === 'DayOff' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '20px', fontSize: '0.85rem' }}>
                          <Calendar size={14} /> إجازة عادية
                        </span>
                      ) : log.status === 'DayOffWork' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '20px', fontSize: '0.85rem' }}>
                          <Briefcase size={14} /> عمل بإجازة
                        </span>
                      ) : log.status === 'Late' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '20px', fontSize: '0.85rem' }}>
                          <Clock size={14} /> تأخير
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '20px', fontSize: '0.85rem' }}>
                          <CheckCircle size={14} /> حضور
                        </span>
                      )}
                      {log.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--theme-color)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Info size={12} /> اضغط لعرض السبب
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedRowId === log.id && log.notes && (
                    <tr className="tf-expanded-row">
                      <td colSpan="7" style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: 'none' }}>
                        <div style={{ padding: '1rem 1.5rem', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '0 0 12px 12px', borderRight: '3px solid var(--theme-color)', color: 'var(--text-secondary)', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '-0.8rem', boxShadow: 'inset 0 4px 6px -4px rgba(0,0,0,0.1)' }}>
                          <strong style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                            <Info size={16} style={{ color: 'var(--theme-color)' }} />
                            السبب المرفق:
                          </strong>
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.9rem', marginRight: '24px', color: 'rgba(255,255,255,0.7)' }}>{log.notes}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
