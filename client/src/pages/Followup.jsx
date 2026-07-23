import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, Loader, Activity, LogIn, LogOut, Phone, FileText, CheckCircle, AlertCircle, Search, XCircle, Briefcase, Calendar, Clock, Coffee, ExternalLink } from 'lucide-react';
import AdminGuard from '../components/AdminGuard';
import AvatarIcon from '../components/AvatarIcon';
import CustomSelect from '../components/CustomSelect';
import api from '../services/api';
import "./TodayFollowup.scss"; // Reusing styles

const Followup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedShift, setSelectedShift] = useState('all');
  const [shiftStatusFilter, setShiftStatusFilter] = useState('assigned');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "الأداء اليومي | مخصوص";
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shiftsRes, statusRes] = await Promise.all([
        api.get('/shifts'),
        api.get('/attendance/today-status')
      ]);

      let allowedShifts = shiftsRes.data;
      if (user?.role !== 'SuperAdmin') {
        // Filter shifts for the specific admin
        allowedShifts = shiftsRes.data.filter(s => s.Users && s.Users.some(u => u.id === user?.id));
      }

      setShifts(allowedShifts);
      setAllUsers(statusRes.data.users || []);
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '---';
    return new Date(timeStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <AdminGuard hideNavBar={true}>
        <div className="followup-style-1">
          <Loader className="spinner" size={48} />
          <h2>جاري تحميل الأداء اليومي...</h2>
        </div>
      </AdminGuard>
    );
  }

  const filteredUsers = allUsers.filter(u => {
    // Shift Enrollment Filter
    if (shiftStatusFilter === 'assigned') {
      if (!u.shifts || u.shifts.length === 0) return false;
    } else if (shiftStatusFilter === 'unassigned') {
      if (u.shifts && u.shifts.length > 0) return false;
    }

    // Shift filter
    if (selectedShift !== 'all') {
      const shiftObj = shifts.find(s => s.id === selectedShift);
      if (!shiftObj || !u.shifts.includes(shiftObj.name)) return false;
    }

    // Status filter
    if (statusFilter !== 'All') {
      if (u.todayStatus !== statusFilter) return false;
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = u.fullName?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
      const titleMatch = u.jobTitle?.toLowerCase().includes(q);
      if (!nameMatch && !titleMatch) return false;
    }

    return true;
  });

  const statuses = [
    { id: 'All', label: 'الكل', icon: Activity, color: '#6366f1' },
    { id: 'Present', label: 'حضور', icon: CheckCircle, color: '#10b981' },
    { id: 'CheckedOut', label: 'انصراف', icon: LogOut, color: '#f97316' },
    { id: 'Late', label: 'تأخير', icon: Clock, color: '#f59e0b' },
    { id: 'Absent', label: 'غياب', icon: XCircle, color: '#ef4444' },
    { id: 'BusinessTrip', label: 'سفر عمل', icon: Briefcase, color: '#0ea5e9' },
    { id: 'DayOff', label: 'إجازة', icon: Calendar, color: '#3b82f6' },
    { id: 'Pending', label: 'لم يسجل', icon: Coffee, color: '#94a3b8' }
  ];

  return (
    <AdminGuard hideNavBar={true}>
      <div className="followup-style-2">
        <header className="page-header followup-style-3" >
          <div className="page-title-wrapper followup-style-4" >
            <Flame size={28} className="title-icon text-orange" color="#f97316" />
            <h1 className="page-title gradient-title followup-style-5" >الأداء اليومي</h1>
          </div>

          <div className="admin-filter-group followup-style-6" >
            {[{ id: 'all', name: 'كل الورديات' }, ...shifts].map(s => (
              <div className="admin-filter-radio" key={s.id}>
                <label className="followup-style-7">
                  <input
                    type="radio"
                    name="shiftFilter"
                    value={s.id}
                    checked={selectedShift === s.id}
                    onChange={(e) => setSelectedShift(e.target.value)}
                  />
                  <span style={{ position: 'relative', zIndex: 1, color: selectedShift === s.id ? '#fff' : 'var(--text-color)' }}>
                    {s.name}
                  </span>
                  {selectedShift === s.id && <div className="radio-bg"></div>}
                </label>
              </div>
            ))}
          </div>
        </header>

        <div className="followup-style-8">
          {/* Status Filters */}
          <div className="admin-filter-group followup-style-9" >
            {statuses.map(st => {
              const Icon = st.icon;
              return (
                <div className="admin-filter-radio" key={st.id}>
                  <label className="followup-style-10">
                    <input
                      type="radio"
                      name="statusFilter"
                      value={st.id}
                      checked={statusFilter === st.id}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    />
                    <Icon size={16} color={statusFilter === st.id ? '#fff' : st.color} className="followup-style-11" />
                    <span style={{ position: 'relative', zIndex: 1, color: statusFilter === st.id ? '#fff' : 'var(--text-color)' }}>
                      {st.label}
                    </span>
                    {statusFilter === st.id && <div className="radio-bg" style={{ background: st.color }}></div>}
                  </label>
                </div>
              );
            })}
          </div>

          {/* Search Bar and Enrollment Filter */}
          <div className="followup-style-12">
            <div className="admin-filter-group followup-style-13" >
              {[
                { id: 'all', label: 'الكل (حالة الوردية)' },
                { id: 'assigned', label: 'مدرج في وردية' },
                { id: 'unassigned', label: 'غير مدرج في وردية' }
              ].map(opt => (
                <div className="admin-filter-radio" key={opt.id}>
                  <label className="followup-style-14">
                    <input
                      type="radio"
                      name="shiftStatusFilter"
                      value={opt.id}
                      checked={shiftStatusFilter === opt.id}
                      onChange={(e) => setShiftStatusFilter(e.target.value)}
                    />
                    <span style={{ position: 'relative', zIndex: 1, color: shiftStatusFilter === opt.id ? '#fff' : 'var(--text-color)' }}>
                      {opt.label}
                    </span>
                    {shiftStatusFilter === opt.id && <div className="radio-bg"></div>}
                  </label>
                </div>
              ))}
            </div>
            <div className="search-bar followup-style-15" >
              <Search size={18} className="followup-style-16" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو المسمى الوظيفي..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="followup-style-17"
              />
            </div>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="followup-style-18">
            <Activity size={64} className="followup-style-19" />
            <h2>لا يوجد موظفين لعرضهم في هذه الوردية</h2>
          </div>
        ) : (
          <div className="followup-style-20">
            {filteredUsers.map(emp => (
              <div key={emp.id} className="followup-style-21">
                {/* Header: Name, Title, Avatar */}
                <div className="followup-card-header" onClick={() => navigate(`/personal-followup/${emp.id}`)}>
                  <div className="followup-style-22">
                    <AvatarIcon name={emp.avatar || emp.fullName} size={50} />
                    <div>
                      <h3 className="followup-style-23">{emp.fullName}</h3>
                      <span className="followup-style-24">{emp.jobTitle || 'غير محدد'}</span>
                    </div>
                  </div>
                  <ExternalLink size={20} className="followup-card-link-icon" />
                </div>

                <hr className="followup-style-25" />

                {/* Info Rows */}
                <div className="followup-style-26">
                  <div className="followup-style-27">
                    <span className="followup-style-28"><Activity size={15} /> حالة اليوم:</span>
                    {/* Status Badge */}
                    {emp.todayStatus === 'Present' ? <span className="status-badge followup-style-29" >حضور</span> :
                      emp.todayStatus === 'CheckedOut' ? <span className="status-badge followup-style-30" >انصراف</span> :
                        emp.todayStatus === 'Absent' ? <span className="status-badge followup-style-31" >غياب</span> :
                          emp.todayStatus === 'Late' ? <span className="status-badge followup-style-32" >تأخير</span> :
                            emp.todayStatus === 'DayOff' ? <span className="status-badge followup-style-33" >إجازة</span> :
                              emp.todayStatus === 'BusinessTrip' ? <span className="status-badge followup-style-34" >سفر عمل</span> :
                                <span className="status-badge">{emp.todayStatus === 'Pending' ? 'لم يسجل بعد' : emp.todayStatus}</span>}
                  </div>
                  {emp.notes && (
                    <div className="followup-style-35">
                      <span className="followup-style-36">السبب: </span> {emp.notes}
                    </div>
                  )}

                  <div className="followup-style-37">
                    <span className="followup-style-38"><LogIn size={15} /> الحضور:</span>
                    <span className="followup-style-39">{formatTime(emp.checkInTime)}</span>
                  </div>

                  <div className="followup-style-40">
                    <span className="followup-style-41"><LogOut size={15} /> الانصراف:</span>
                    <span className="followup-style-42">{formatTime(emp.checkOutTime)}</span>
                  </div>

                  <div className="followup-style-43">
                    <span className="followup-style-44"><Phone size={15} /> المكالمات:</span>
                    <span className="followup-style-45">{emp.callsCount}</span>
                  </div>

                  <div className="followup-style-46">
                    <span className="followup-style-47"><FileText size={15} /> تقرير المهام:</span>
                    {emp.hasSummary ? (
                      <span className="followup-style-48"><CheckCircle size={14} /> مُرسل</span>
                    ) : (
                      <span className="followup-style-49"><AlertCircle size={14} /> لم يُرسل</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminGuard>
  );
};

export default Followup;
