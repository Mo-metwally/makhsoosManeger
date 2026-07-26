import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Briefcase, LogIn, LogOut, CheckCircle, Info, Users, XCircle, Plane } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import "./Account.scss"; // Reuse container styles

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
    const actualDelayMins = diffMins > allowedDelay ? diffMins : 0;

    if (actualDelayMins <= 0) return 'لا يوجد';

    const hours = Math.floor(actualDelayMins / 60);
    const mins = actualDelayMins % 60;

    if (hours > 0) return `${hours} س ${mins > 0 ? `و ${mins} د` : ''}`;
    return `${mins} دقيقة`;
  };

  const calculateEarlyDeparture = (checkOutDateStr, shiftStr) => {
    if (!checkOutDateStr || !shiftStr || !shiftStr.endTime || !shiftStr.startTime) return '---';

    const checkOutDate = new Date(checkOutDateStr);
    const [startH] = shiftStr.startTime.split(':').map(Number);
    const [endH, endM] = shiftStr.endTime.split(':').map(Number);
    
    const shiftEndDate = new Date(checkOutDate);
    shiftEndDate.setHours(endH, endM, 0, 0);
    if (endH < startH && checkOutDate.getHours() >= startH) {
      shiftEndDate.setDate(shiftEndDate.getDate() + 1);
    }

    const diffMs = shiftEndDate - checkOutDate;
    if (diffMs <= 0) return 'لا يوجد';

    const diffMins = Math.floor(diffMs / 60000);
    const allowedEarly = Number(localStorage.getItem('allowedEarlyDepartureMinutes') || '0');
    const actualEarlyMins = diffMins > allowedEarly ? diffMins : 0;

    if (actualEarlyMins <= 0) return 'لا يوجد';

    const hours = Math.floor(actualEarlyMins / 60);
    const mins = actualEarlyMins % 60;

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
          <div className="attendance-style-1">
            <h2 className="attendance-style-2">
              <Info size={24} className="text-blue" />
              بيانات الوردية الحالية
            </h2>
            <div className="attendance-style-3">
              {myShifts.map(shift => {
                const shiftUsers = shift.Users || [];
                return (
                  <div key={shift.id} className="account-card attendance-style-4" >
                    <h3 className="attendance-style-5">{shift.name}</h3>

                    <div className="attendance-style-6">
                      <span className="attendance-style-7">
                        <Clock size={16} className="text-blue" />
                        {shift.endTime} - {shift.startTime}
                      </span>
                      <span className="attendance-style-8">
                        <Calendar size={16} className="text-blue" />
                        {(shift.workingDays || []).map(dId => DAYS_OF_WEEK.find(d => d.id === dId)?.label).join('، ')}
                      </span>
                      <span className="attendance-style-9">
                        <Users size={16} className="text-blue" />
                        {shiftUsers.length} موظف
                      </span>
                    </div>

                    <div className="attendance-style-10">
                      <span className="attendance-style-11">
                        <strong>نظام الإجازات:</strong>
                        {shift.dayOffType === 'Fixed' ? 'ثابت' : 'متغير'}
                      </span>
                      {shift.dayOffType === 'Fixed' ? (
                        <span className="attendance-style-12">
                          <strong>الأيام:</strong>
                          {(shift.fixedDaysOff || []).map(dId => DAYS_OF_WEEK.find(d => d.id === dId)?.label).join('، ') || 'لا يوجد'}
                        </span>
                      ) : (
                        <span className="attendance-style-13">
                          <strong>الأيام المسموحة شهرياً:</strong>
                          {shift.variableDaysOffCount || 0} أيام
                        </span>
                      )}
                      <span className="attendance-style-14">
                        <strong>فترة السماح للتأخير:</strong>
                        {localStorage.getItem('allowedDelayMinutes') || '15'} دقيقة
                      </span>
                      <span className="attendance-style-14" style={{marginRight: '1rem'}}>
                        <strong>سماحية الانصراف المبكر:</strong>
                        {localStorage.getItem('allowedEarlyDepartureMinutes') || '0'} دقيقة
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <h2 className="attendance-style-15">
          <Calendar size={24} className="text-blue" />
          حركة الدوام السابقة
        </h2>

        {logs.length === 0 ? (
          <div className="attendance-style-16">
            لا توجد سجلات حضور مسجلة لك حالياً.
          </div>
        ) : (
          <div className="attendance-style-17">
            <table className="attendance-style-18">
              <thead>
                <tr className="attendance-style-19">
                  <th className="attendance-style-20">التاريخ</th>
                  <th className="attendance-style-21">اسم الموظف</th>
                  <th className="attendance-style-22">الوردية</th>
                  <th className="attendance-style-23">وقت الحضور</th>
                  <th className="attendance-style-24">وقت الانصراف</th>
                  <th className="attendance-style-25">التأخير</th>
                  <th className="attendance-style-25">الانصراف المبكر</th>
                  <th className="attendance-style-26">الحالة</th>
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
                    <td className="attendance-style-27">{formatDate(log.date)}</td>
                    <td className="attendance-style-28">{user ? user.fullName : '---'}</td>
                    <td className="attendance-style-29">{log.Shift ? log.Shift.name : '---'}</td>
                    <td className="attendance-style-30"><LogIn size={16} className="attendance-style-31" /> {formatTime(log.checkInTime)}</td>
                    <td style={{ padding: '1rem', color: log.checkOutTime ? '#ef4444' : 'var(--text-secondary)' }}>
                      {log.checkOutTime ? <><LogOut size={16} className="attendance-style-32" /> {formatTime(log.checkOutTime)}</> : 'لم ينصرف بعد'}
                    </td>
                    <td className="attendance-style-33">
                      {calculateDelay(log.checkInTime, log.Shift?.startTime)}
                    </td>
                    <td className="attendance-style-33" style={{ color: calculateEarlyDeparture(log.checkOutTime, log.Shift) !== 'لا يوجد' && calculateEarlyDeparture(log.checkOutTime, log.Shift) !== '---' ? '#ef4444' : 'inherit' }}>
                      {calculateEarlyDeparture(log.checkOutTime, log.Shift)}
                    </td>
                    <td className="attendance-style-34">
                      {log.status === 'Absent' ? (
                        <span className="attendance-style-35">
                          <XCircle size={14} /> غياب
                        </span>
                      ) : log.status === 'BusinessTrip' ? (
                        <span className="attendance-style-36">
                          <Plane size={14} /> سفر عمل
                        </span>
                      ) : log.status === 'DayOff' ? (
                        <span className="attendance-style-37">
                          <Calendar size={14} /> إجازة عادية
                        </span>
                      ) : log.status === 'DayOffWork' ? (
                        <span className="attendance-style-38">
                          <Briefcase size={14} /> عمل بإجازة
                        </span>
                      ) : log.status === 'Late' ? (
                        <span className="attendance-style-39">
                          <Clock size={14} /> تأخير
                        </span>
                      ) : (
                        <span className="attendance-style-40">
                          <CheckCircle size={14} /> حضور
                        </span>
                      )}
                      {log.notes && (
                        <div className="attendance-style-41">
                          <Info size={12} /> اضغط لعرض السبب
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedRowId === log.id && log.notes && (
                    <tr className="tf-expanded-row">
                      <td colSpan="7" className="attendance-style-42">
                        <div className="attendance-style-43">
                          <strong className="attendance-style-44">
                            <Info size={16} className="attendance-style-45" />
                            السبب المرفق:
                          </strong>
                          <div className="attendance-style-46">{log.notes}</div>
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
