import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import ExportModal from './ExportModal';
import { Home, Phone, User, Users, Activity, Shield, Cat, Crown, Star, Smile, Briefcase, Download, Flame, Zap, Heart, Moon, FileText, History, Summary, Menu, Database, ChevronDown, ChevronUp, Folder, Bell, Clock, Calendar, Settings, Wallet, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { exportToExcel } from '../utils/exportExcel';
import api from '../services/api';
import "./Sidebar.scss";

import AvatarIcon from './AvatarIcon';

const Sidebar = () => {
  const { user } = useAuth();

  // Use user data from AuthContext, fallback to defaults
  const profile = {
    name: user?.fullName || user?.name || 'المشرف',
    role: user?.role || 'Supervisor',
    avatar: user?.avatar || 'User'
  };

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isHRMenuOpen, setIsHRMenuOpen] = useState(false);
  const [isOpsMenuOpen, setIsOpsMenuOpen] = useState(false);
  const [isPerfMenuOpen, setIsPerfMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isFinancesMenuOpen, setIsFinancesMenuOpen] = useState(false);
  const [isWorkMenuOpen, setIsWorkMenuOpen] = useState(false);
  const [isPersonalMenuOpen, setIsPersonalMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [userStatus, setUserStatus] = useState({ text: 'جاري التحميل...', color: 'var(--text-secondary)' });
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserStatus = async () => {
    try {
      const res = await api.get('/attendance/status');
      const { hasCheckedIn, log } = res.data;

      if (!hasCheckedIn || !log) {
        setUserStatus({ text: 'غير متصل', color: 'var(--text-secondary)' });
        return;
      }

      if (log.checkOutTime) {
        setUserStatus({ text: 'انصراف', color: '#ef4444' });
        return;
      }

      const activeBreak = localStorage.getItem('activeBreak');
      if (activeBreak === 'بريك غداء') {
        setUserStatus({ text: 'غداء', color: '#f59e0b' });
      } else if (activeBreak === 'بريك صلاة') {
        setUserStatus({ text: 'صلاة', color: '#8b5cf6' });
      } else if (activeBreak === 'تدريب') {
        setUserStatus({ text: 'تدريب', color: '#3b82f6' });
      } else {
        if (res.data.trackerStatus === 'idle') {
          setUserStatus({ text: 'خامل', color: '#f97316' }); // orange
        } else {
          setUserStatus({ text: 'متصل', color: '#22c55e' });
        }
      }
    } catch (err) {
      setUserStatus({ text: 'متصل', color: '#22c55e' });
    }
  };

  useEffect(() => {
    fetchUserStatus();
    const handleStorage = () => fetchUserStatus();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('userStatusChanged', handleStorage);

    const interval = setInterval(fetchUserStatus, 30000); // 30s
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('userStatusChanged', handleStorage);
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Click outside to close notifications
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  useEffect(() => {
    if (user?.role === 'Admin' || user?.role === 'SuperAdmin') {
      const fetchNotifs = async () => {
        try {
          const res = await api.get('/notifications');
          setNotifications(res.data);
        } catch (e) {
          console.error(e);
        }
      };
      fetchNotifs();
      // Optional: Poll every 60 seconds
      const interval = setInterval(fetchNotifs, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleNotifClick = async (n, e) => {
    if (e) e.stopPropagation();
    try {
      // Remove from UI immediately for better UX
      setNotifications(prev => prev.filter(notif => notif.id !== n.id));

      // Update in backend
      await api.put(`/notifications/${n.id}/read`);

      // If no notifications left, optionally close the dropdown
      if (notifications.length <= 1) {
        setIsNotifOpen(false);
      }

      // Navigate based on content
      if (n.message.includes('إجازة')) {
        navigate('/dayoff-management');
      } else if (n.message.includes('تفعيل') || n.message.includes('تسجيل') || n.message.includes('حساب')) {
        navigate('/permissions');
      } else {
        // Default or generic
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getNotifIcon = (message) => {
    if (message.includes('إجازة')) return <Calendar size={20} color="#f97316" strokeWidth={2.5} />;
    if (message.includes('تفعيل') || message.includes('تسجيل') || message.includes('حساب')) return <Users size={20} color="#3b82f6" strokeWidth={2.5} />;
    return <Bell size={20} color="#94a3b8" strokeWidth={2.5} />;
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const unreadCount = unreadNotifications.length;

  return (
    <aside className={`sidebar ${isOpen ? '' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="flex items-center gap-3">
          <div className="logo-icon">
            <Users size={24} />
          </div>
          <div className="logo-text">
            <h2>Makhsoos</h2>
            <span>لوحة المشرف</span>
          </div>
        </div>

        {/* Notification Bell */}
        {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && isOpen && (
          <div className="notif-container" ref={notifRef}>
            <button className="notif-btn" onClick={() => setIsNotifOpen(!isNotifOpen)}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notif-badge">
                  {unreadCount}
                </span>
              )}
            </button>
            {isNotifOpen && (
              <div className="notif-dropdown glass-panel sidebar-style-1" >
                <div className="notif-header">
                  <h4>الإشعارات</h4>
                  {unreadCount > 0 && <span className="unread-text">{unreadCount} جديد</span>}
                </div>
                <div className="notif-list">
                  {unreadNotifications.length === 0 ? (
                    <p className="no-notifs">لا توجد إشعارات حالياً</p>
                  ) : (
                    unreadNotifications.map(n => (
                      <div key={n.id} onClick={(e) => handleNotifClick(n, e)} className={`notif-item ${!n.isRead ? 'unread' : ''}`}>
                        <div className="sidebar-style-2">
                          <div className="notif-icon-box sidebar-style-3" >
                            {getNotifIcon(n.message)}
                          </div>
                          <div className="sidebar-style-4">
                            <p className="notif-message">{n.message}</p>
                            <span className="notif-time">
                              {new Date(n.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsOpen(!isOpen)}
          title="تبديل القائمة الجانبية"
        >
          <Menu size={22} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              <Home size={20} />
              <span>لوحة التشغيل</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/followup" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              <Flame size={20} />
              <span>الأداء اليومي</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/personal-followup" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              <Activity size={20} />
              <span>المتابعة الشخصية</span>
            </NavLink>
          </li>


          {(profile.role === 'Admin' || profile.role === 'SuperAdmin') && (
            <>
              <li className="nav-group">
                <div
                  className="nav-section-header"
                  onClick={() => { setIsHRMenuOpen(!isHRMenuOpen); if (!isOpen) setIsOpen(true); }}
                  title="إدارة الموارد البشرية"
                >
                  <div className="section-title">
                    <Users size={18} className="section-icon" />
                    <span>إدارة الموارد البشرية</span>
                  </div>
                  {isHRMenuOpen ? <ChevronUp size={14} className="section-chevron" /> : <ChevronDown size={14} className="section-chevron" />}
                </div>
                <div className={`sub-menu ${isHRMenuOpen ? 'open' : ''}`}>
                  <NavLink to="/staff-management" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Users size={18} />
                    <span>إدارة الموظفين</span>
                  </NavLink>
                  <NavLink to="/shift-management" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Clock size={18} />
                    <span>تنظيم الورديات</span>
                  </NavLink>
                  {/* <NavLink to="/attendance" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Calendar size={18} />
                    <span>الحضور والانصراف</span>
                  </NavLink> */}
                  <NavLink to="/dayoff-management" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Moon size={18} />
                    <span>طلبات الإجازات</span>
                  </NavLink>
                  <NavLink to="/permissions" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Shield size={18} />
                    <span>إدارة الحسابات</span>
                  </NavLink>
                </div>
              </li>

              <li className="nav-group">
                <div
                  className="nav-section-header"
                  onClick={() => { setIsOpsMenuOpen(!isOpsMenuOpen); if (!isOpen) setIsOpen(true); }}
                  title="العمليات والمتابعة"
                >
                  <div className="section-title">
                    <Briefcase size={18} className="section-icon" />
                    <span>العمليات والمتابعة</span>
                  </div>
                  {isOpsMenuOpen ? <ChevronUp size={14} className="section-chevron" /> : <ChevronDown size={14} className="section-chevron" />}
                </div>
                <div className={`sub-menu ${isOpsMenuOpen ? 'open' : ''}`}>
                  <NavLink to="/today-followup" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Activity size={18} />
                    <span>متابعة اليوم</span>
                  </NavLink>
                  <NavLink to="/attendancereports" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Folder size={18} />
                    <span>سجل الحضور المجمع</span>
                  </NavLink>
                  <NavLink to="/monitoring" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Activity size={18} />
                    <span>سجل الإستراحات المجمع</span>
                  </NavLink>
                  <NavLink to="/allPerformance" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <History size={18} />
                    <span>سجل المهام المجمع</span>
                  </NavLink>
                  <NavLink to="/allcontacts" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Database size={18} />
                    <span>سجل التواصل المجمع</span>
                  </NavLink>
                </div>
              </li>

              <li className="nav-group">
                <div
                  className="nav-section-header"
                  onClick={() => { setIsPerfMenuOpen(!isPerfMenuOpen); if (!isOpen) setIsOpen(true); }}
                  title="الأداء والتقارير"
                >
                  <div className="section-title">
                    <Star size={18} className="section-icon" />
                    <span>الأداء والتقارير</span>
                  </div>
                  {isPerfMenuOpen ? <ChevronUp size={14} className="section-chevron" /> : <ChevronDown size={14} className="section-chevron" />}
                </div>
                <div className={`sub-menu ${isPerfMenuOpen ? 'open' : ''}`}>
                  <NavLink to="/summery" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Summary size={18} />
                    <span>الملخص العام</span>
                  </NavLink>
                  {/* <NavLink to="/performance-log" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <FileText size={18} />
                    <span>سجل تقييم الأداء</span>
                  </NavLink> */}
                  <NavLink to="/report-editor" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <FileText size={18} />
                    <span>محرر التقارير</span>
                  </NavLink>
                  <NavLink to="/handleAdminExport" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Download size={18} />
                    <span>تصدير البيانات</span>
                  </NavLink>
                </div>
              </li>

              <li className="nav-group">
                <div
                  className="nav-section-header"
                  onClick={() => { setIsFinancesMenuOpen(!isFinancesMenuOpen); if (!isOpen) setIsOpen(true); }}
                  title="الماليات"
                >
                  <div className="section-title">
                    <DollarSign size={18} className="section-icon" />
                    <span>الماليات</span>
                  </div>
                  {isFinancesMenuOpen ? <ChevronUp size={14} className="section-chevron" /> : <ChevronDown size={14} className="section-chevron" />}
                </div>
                <div className={`sub-menu ${isFinancesMenuOpen ? 'open' : ''}`}>
                  <NavLink to="/employees-accounts" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <DollarSign size={18} />
                    <span>حسابات الموظفين</span>
                  </NavLink>
                  <NavLink to="/expenses" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Wallet size={18} />
                    <span>إدارة المصروفات</span>
                  </NavLink>
                  {(profile.role === 'SuperAdmin') && (
                    <NavLink to="/expenses-add" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                      <DollarSign size={18} />
                      <span>إدارة الميزانيات</span>
                    </NavLink>
                  )}
                </div>
              </li>

              {(profile.role === 'SuperAdmin') && (
                <li className="nav-group">
                  <div
                    className="nav-section-header"
                    onClick={() => { setIsSettingsMenuOpen(!isSettingsMenuOpen); if (!isOpen) setIsOpen(true); }}
                    title="الإعدادات"
                  >
                    <div className="section-title">
                      <Settings size={18} className="section-icon" />
                      <span>الإعدادات</span>
                    </div>
                    {isSettingsMenuOpen ? <ChevronUp size={14} className="section-chevron" /> : <ChevronDown size={14} className="section-chevron" />}
                  </div>
                  <div className={`sub-menu ${isSettingsMenuOpen ? 'open' : ''}`}>
                    <NavLink to="/general-settings" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                      <Settings size={18} />
                      <span>إعدادات النظام</span>
                    </NavLink>
                    <NavLink to="/tracker-settings" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                      <Activity size={18} />
                      <span>إعدادات التراكر</span>
                    </NavLink>
                  </div>
                </li>
              )}
            </>
          )}

          {profile.role === 'Supervisor' && (
            <>
              <li className="nav-group">
                <div
                  className="nav-section-header"
                  onClick={() => { setIsWorkMenuOpen(!isWorkMenuOpen); if (!isOpen) setIsOpen(true); }}
                  title="سجلات العمل"
                >
                  <div className="section-title">
                    <Folder size={18} className="section-icon" />
                    <span>سجلات العمل</span>
                  </div>
                  {isWorkMenuOpen ? <ChevronUp size={14} className="section-chevron" /> : <ChevronDown size={14} className="section-chevron" />}
                </div>
                <div className={`sub-menu ${isWorkMenuOpen ? 'open' : ''}`}>
                  <NavLink to="/contacts" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Phone size={18} />
                    <span>سجل التواصل</span>
                  </NavLink>
                  <NavLink to="/my-monitoring" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Activity size={18} />
                    <span>المتابعة</span>
                  </NavLink>
                </div>
              </li>

              <li className="nav-group">
                <div
                  className="nav-section-header"
                  onClick={() => { setIsPerfMenuOpen(!isPerfMenuOpen); if (!isOpen) setIsOpen(true); }}
                  title="الأداء والتقارير"
                >
                  <div className="section-title">
                    <Activity size={18} className="section-icon" />
                    <span>الأداء والتقارير</span>
                  </div>
                  {isPerfMenuOpen ? <ChevronUp size={14} className="section-chevron" /> : <ChevronDown size={14} className="section-chevron" />}
                </div>
                <div className={`sub-menu ${isPerfMenuOpen ? 'open' : ''}`}>
                  <NavLink to="/summery" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <Summary size={18} />
                    <span>الملخص</span>
                  </NavLink>

                  <NavLink to="/report-editor" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                    <FileText size={18} />
                    <span>محرر التقارير</span>
                  </NavLink>
                </div>
              </li>
            </>
          )}

          <li className="nav-group">
            <div
              className="nav-section-header"
              onClick={() => { setIsPersonalMenuOpen(!isPersonalMenuOpen); if (!isOpen) setIsOpen(true); }}
              title="مساحتي الشخصية"
            >
              <div className="section-title">
                <User size={18} className="section-icon" />
                <span>مساحتي الشخصية</span>
              </div>
              {isPersonalMenuOpen ? <ChevronUp size={14} className="section-chevron" /> : <ChevronDown size={14} className="section-chevron" />}
            </div>
            <div className={`sub-menu ${isPersonalMenuOpen ? 'open' : ''}`}>
              <NavLink to="/contacts" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <Phone size={18} />
                <span>سجل التواصل</span>
              </NavLink>
              <NavLink to="/performance-log" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <History size={18} />
                <span>سجل المهام</span>
              </NavLink>
              <NavLink to="/attendance" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <Clock size={18} />
                <span>سجل الحضور</span>
              </NavLink>
              <NavLink to="/dayoff" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <Calendar size={18} />
                <span>أجازاتي</span>
              </NavLink>
              <NavLink to="/my-advances" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <Wallet size={18} />
                <span>محفظتي</span>
              </NavLink>
              <NavLink to="/account" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <User size={18} />
                <span>الملف الشخصي</span>
              </NavLink>
            </div>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="export-excel-btn" onClick={() => setIsExportModalOpen(true)} title="تحميل التقارير كملف إكسيل">
          <Download size={18} />
          <span>تحميل التقارير</span>
        </button>

        <div className="user-profile">
          <div className="user-icon">
            <AvatarIcon name={profile.avatar} size={20} color="#ffffff" />
          </div>
          <div className="user-info">
            <span className="user-name">{profile.name ? profile.name.split(' ')[0] : ''}</span>
            <span className="user-role">{profile.role}</span>
          </div>
          <div className="user-status" style={{ color: userStatus.color }}>
            {userStatus.text}
          </div>
        </div>
      </div>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={exportToExcel}
        title="تحميل التقارير الشاملة"
      />
    </aside>
  );
};

export default Sidebar;
