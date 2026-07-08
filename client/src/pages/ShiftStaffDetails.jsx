import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, ArrowRight, Loader, ShieldAlert, CheckCircle, XCircle, Clock, CalendarDays, PhoneCall, AlertTriangle, CalendarRange, Search, Filter, Shield, Cat, Crown, Star, Smile, Briefcase, Flame, Zap, Heart, Moon, User } from 'lucide-react';
import api from '../services/api';
import './ShiftStaffDetails.css';

const avatarMap = {
  User, Shield, Cat, Crown, Star, Smile, Briefcase, Flame, Zap, Heart, Moon
};

const ShiftStaffDetails = () => {
  const { shiftId } = useParams();
  const navigate = useNavigate();
  
  const [shift, setShift] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [actionModal, setActionModal] = useState({ show: false, type: '', userId: null, userName: '' });
  const [selectedDate, setSelectedDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Search and Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, calls, present, absent, late

  useEffect(() => {
    fetchStaffStats();
  }, [shiftId]);

  const fetchStaffStats = async () => {
    try {
      const response = await api.get(`/shifts/${shiftId}/staff-stats`);
      setShift(response.data.shift);
      setStaff(response.data.users);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching staff stats:', err);
      setError('حدث خطأ أثناء جلب تفاصيل الموظفين للوردية.');
      setLoading(false);
    }
  };

  const openModal = (type, userId, userName) => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setActionModal({ show: true, type, userId, userName });
  };

  const closeModal = () => {
    setActionModal({ show: false, type: '', userId: null, userName: '' });
    setSelectedDate('');
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    
    try {
      if (actionModal.type === 'absence') {
        await api.post('/attendance/admin/absence', {
          userId: actionModal.userId,
          date: selectedDate
        });
      } else if (actionModal.type === 'dayoff') {
        await api.post('/dayoff/admin/register', {
          userId: actionModal.userId,
          date: selectedDate,
          dayName: new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }),
          reason: 'تسجيل يدوي بواسطة الإدارة'
        });
      }
      
      // Refresh data
      await fetchStaffStats();
      closeModal();
      alert('تم تنفيذ الإجراء بنجاح!');
    } catch (err) {
      console.error('Action error:', err);
      alert(err.response?.data?.error || 'حدث خطأ أثناء تنفيذ الإجراء');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  const getFilteredAndSortedStaff = () => {
    let result = [...staff];

    // Search
    if (searchQuery) {
      result = result.filter(user => 
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'calls':
          return b.stats.totalCalls - a.stats.totalCalls;
        case 'present':
          return b.stats.presentDays - a.stats.presentDays;
        case 'absent':
          return b.stats.absentDays - a.stats.absentDays;
        case 'late':
          return b.stats.lateDays - a.stats.lateDays;
        case 'name':
        default:
          return a.fullName.localeCompare(b.fullName, 'ar');
      }
    });

    return result;
  };

  if (loading) {
    return (
      <div className="staff-loading">
        <Loader className="spinner" size={40} />
        <p>جاري تحميل إحصائيات الموظفين...</p>
      </div>
    );
  }

  if (error || !shift) {
    return (
      <div className="staff-error">
        <ShieldAlert size={50} />
        <p>{error || 'الوردية غير موجودة'}</p>
        <button onClick={() => navigate('/staff-management')} className="back-btn">
          العودة لإدارة الموظفين
        </button>
      </div>
    );
  }

  return (
    <div className="shift-staff-container">
      <div className="ssd-header">
        <button className="ssd-back-btn" onClick={() => navigate('/staff-management')}>
          <ArrowRight size={20} />
        </button>
        <div>
          <h1 className="ssd-title">
            <Users size={28} className="ssd-title-icon" />
            موظفي وردية: {shift.name}
          </h1>
          <p className="ssd-subtitle">
            إحصائيات الشهر الحالي (مكالمات، حضور، وغياب)
          </p>
        </div>
      </div>

      <div className="ssd-controls">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="ابحث بالاسم..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="sort-pills">
          <span className="sort-label"><Filter size={16} /> ترتيب حسب:</span>
          
          <button 
            className={`sort-pill ${sortBy === 'name' ? 'active' : ''}`}
            onClick={() => setSortBy('name')}
          >
            الاسم
          </button>
          
          <button 
            className={`sort-pill ${sortBy === 'calls' ? 'active blue' : ''}`}
            onClick={() => setSortBy('calls')}
          >
            الأكثر مكالمات
          </button>
          
          <button 
            className={`sort-pill ${sortBy === 'present' ? 'active green' : ''}`}
            onClick={() => setSortBy('present')}
          >
            الأكثر حضوراً
          </button>
          
          <button 
            className={`sort-pill ${sortBy === 'absent' ? 'active red' : ''}`}
            onClick={() => setSortBy('absent')}
          >
            الأكثر غياباً
          </button>
          
          <button 
            className={`sort-pill ${sortBy === 'late' ? 'active yellow' : ''}`}
            onClick={() => setSortBy('late')}
          >
            الأكثر تأخيراً
          </button>
        </div>
      </div>

      <div className="staff-table-wrapper">
        <table className="staff-stats-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الأداء والمكالمات</th>
              <th>سجل الحضور</th>
              <th>الإجازات المستهلكة</th>
              <th>إجراءات الإدارة</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredAndSortedStaff().length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-400">لا يوجد موظفين يطابقون بحثك</td>
              </tr>
            ) : (
              getFilteredAndSortedStaff().map(user => {
                const AvatarIcon = avatarMap[user.avatar] || User;
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="staff-user-info">
                        <div className="staff-avatar">
                          <AvatarIcon size={24} className="staff-avatar-icon" />
                        </div>
                        <div>
                          <h4>{user.fullName}</h4>
                          <span>{user.jobTitle || 'موظف'}</span>
                        </div>
                      </div>
                    </td>
                  <td>
                    <div className="stat-badges-col">
                      <div className="stat-badge blue">
                        <PhoneCall size={14} />
                        {user.stats.totalCalls} مكالمة
                      </div>
                      <div className="stat-badge purple">
                        <Clock size={14} />
                        {formatDuration(user.stats.totalDuration)}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="stat-badges-row">
                      <div className="stat-mini green" title="أيام الحضور">
                        <CheckCircle size={16} /> {user.stats.presentDays}
                      </div>
                      <div className="stat-mini red" title="أيام الغياب">
                        <XCircle size={16} /> {user.stats.absentDays}
                      </div>
                      <div className="stat-mini yellow" title="أيام التأخير">
                        <AlertTriangle size={16} /> {user.stats.lateDays}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="stat-badge orange">
                      <CalendarDays size={14} />
                      {user.stats.approvedDayOffs} {shift.dayOffType === 'Variable' ? `/ ${shift.variableDaysOffCount}` : 'يوم'}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn absent-btn"
                        onClick={() => openModal('absence', user.id, user.fullName)}
                        title="تسجيل غياب"
                      >
                        <XCircle size={18} />
                        <span>غياب</span>
                      </button>
                      <button 
                        className="action-btn dayoff-btn"
                        onClick={() => openModal('dayoff', user.id, user.fullName)}
                        title="تسجيل إجازة"
                      >
                        <CalendarRange size={18} />
                        <span>إجازة</span>
                      </button>
                    </div>
                  </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {actionModal.show && (
        <div className="action-modal-overlay">
          <div className="action-modal">
            <h3 className={`action-modal-title ${actionModal.type === 'absence' ? 'text-red' : 'text-orange'}`}>
              {actionModal.type === 'absence' ? 'تسجيل غياب' : 'تسجيل إجازة'}
            </h3>
            <p className="action-modal-desc">
              أنت تقوم بتسجيل {actionModal.type === 'absence' ? 'غياب' : 'إجازة'} للموظف: <strong>{actionModal.userName}</strong>
            </p>
            
            <form onSubmit={handleActionSubmit}>
              <div className="form-group">
                <label>التاريخ:</label>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  required 
                />
              </div>
              
              <div className="action-modal-footer">
                <button type="button" className="cancel-btn" onClick={closeModal} disabled={actionLoading}>إلغاء</button>
                <button type="submit" className={`confirm-btn ${actionModal.type === 'absence' ? 'bg-red' : 'bg-orange'}`} disabled={actionLoading}>
                  {actionLoading ? <Loader size={18} className="spinner" /> : 'تأكيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftStaffDetails;
