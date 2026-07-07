import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ExportModal from './ExportModal';
import { Home, Phone, User, Users, Activity, Shield, Cat, Crown, Star, Smile, Briefcase, Download, Flame, Zap, Heart, Moon, FileText, History, Summary, Menu, Database, ChevronDown, ChevronUp, Folder, Bell, Clock, Calendar, Settings, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { exportToExcel } from '../utils/exportExcel';
import api from '../services/api';
import './Sidebar.css';

const GithubIcon = ({ size = 24, color = "currentColor", className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4"></path>
  </svg>
);

const ReactIcon = ({ size = 24, color = "currentColor", className = '' }) => (
  <svg width={size} height={size} viewBox="-10.5 -9.45 21 18.9" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="0" cy="0" r="2" fill={color}></circle>
    <g stroke={color} strokeWidth="1" fill="none">
      <ellipse rx="10" ry="4.5"></ellipse>
      <ellipse rx="10" ry="4.5" transform="rotate(60)"></ellipse>
      <ellipse rx="10" ry="4.5" transform="rotate(120)"></ellipse>
    </g>
  </svg>
);

const ViteIcon = ({ size = 24, color = "currentColor", className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 410 404" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M399.641 43.1539L214.288 393.188C210.155 400.99 198.814 400.99 194.681 393.188L9.32832 43.1539C4.84378 34.6841 12.9231 25.4055 21.6663 28.9882L198.718 101.52C202.43 103.041 206.539 103.041 210.251 101.52L387.303 28.9882C396.046 25.4055 404.125 34.6841 399.641 43.1539Z" fill="url(#vite-grad-sidebar)"/>
    <path d="M293.411 1.76185L208.627 122.188C206.565 125.118 202.404 125.118 200.342 122.188L115.558 1.76185C111.455 -4.06227 102.399 0.0818292 104.053 7.03965L149.332 197.433C150.312 201.554 154.512 203.955 158.423 202.668L199.191 189.261C202.646 188.125 206.323 188.125 209.778 189.261L250.546 202.668C254.457 203.955 258.657 201.554 259.637 197.433L304.916 7.03965C306.57 0.0818292 297.514 -4.06227 293.411 1.76185Z" fill="url(#vite-grad-2-sidebar)"/>
    <defs>
      <linearGradient id="vite-grad-sidebar" x1="204.485" y1="389.273" x2="204.485" y2="44.2543" gradientUnits="userSpaceOnUse">
        <stop stopColor={color} stopOpacity="1"/>
        <stop offset="1" stopColor={color} stopOpacity="0.5"/>
      </linearGradient>
      <linearGradient id="vite-grad-2-sidebar" x1="204.485" y1="195.457" x2="204.485" y2="2.75628" gradientUnits="userSpaceOnUse">
        <stop stopColor={color} stopOpacity="1"/>
        <stop offset="1" stopColor={color} stopOpacity="0.3"/>
      </linearGradient>
    </defs>
  </svg>
);

const NextIcon = ({ size = 24, color = "currentColor", className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M90 180C139.706 180 180 139.706 180 90C180 40.2944 139.706 0 90 0C40.2944 0 0 40.2944 0 90C0 139.706 40.2944 180 90 180ZM65.8694 65V124H76.2804L121.737 57.0674L113.626 51.579L65.8694 65ZM111.458 114.372L74.8878 65H65.8694V115H74.8878V76.8406L104.912 120.25L111.458 114.372Z" fill={color}/>
    <path fillRule="evenodd" clipRule="evenodd" d="M115 65H124.018V115H115V65Z" fill={color}/>
  </svg>
);

const VueIcon = ({ size = 24, color = "currentColor", className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 256 221" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M204.8 0H256L128 220.8L0 0H51.2L128 132.48L204.8 0Z" fill={color}/>
    <path d="M204.8 0H153.6L128 44.16L102.4 0H51.2L128 132.48L204.8 0Z" fill="rgba(255,255,255,0.4)"/>
  </svg>
);

const avatarMap = {
  User, Shield, Cat, Crown, Star, Smile, Briefcase,
  React: ReactIcon, Github: GithubIcon, Vite: ViteIcon, Next: NextIcon, Vue: VueIcon,
  Flame, Zap, Heart, Moon
};

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
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isWorkMenuOpen, setIsWorkMenuOpen] = useState(false);
  const [isPerfMenuOpen, setIsPerfMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const navigate = useNavigate();

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

  const handleNotifClick = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setIsNotifOpen(false);
      navigate('/permissions');
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const AvatarIcon = avatarMap[profile.avatar] || User;

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
          <div className="notif-container">
            <button className="notif-btn" onClick={() => setIsNotifOpen(!isNotifOpen)}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notif-badge">
                  {unreadCount}
                </span>
              )}
            </button>
            {isNotifOpen && (
              <div className="notif-dropdown glass-panel">
                <div className="notif-header">
                  <h4>الإشعارات</h4>
                  {unreadCount > 0 && <span className="unread-text">{unreadCount} جديد</span>}
                </div>
                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <p className="no-notifs">لا توجد إشعارات حالياً</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => handleNotifClick(n.id)} className={`notif-item ${!n.isRead ? 'unread' : ''}`}>
                        <p className="notif-message">{n.message}</p>
                        <span className="notif-time">
                          {new Date(n.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
              <span>الرئيسية</span>
            </NavLink>
          </li>
          {/* Work Logs Group */}
          <li className="nav-group">
            <div 
              className={`nav-item ${isWorkMenuOpen ? 'active-group' : ''}`} 
              onClick={() => {
                setIsWorkMenuOpen(!isWorkMenuOpen);
                if (!isOpen) setIsOpen(true);
              }}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Briefcase size={20} />
                <span>سجلات العمل</span>
              </div>
              {isWorkMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            
            <div className={`sub-menu ${isWorkMenuOpen ? 'open' : ''}`}>
              <NavLink to="/calls" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <Phone size={16} />
                <span>المكالمات</span>
              </NavLink>
              <NavLink to="/monitoring" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <Activity size={16} />
                <span>المتابعة</span>
              </NavLink>
            </div>
          </li>

          {/* Settings Group (Admin & SuperAdmin only) */}
          {(profile.role === 'Admin' || profile.role === 'SuperAdmin') && (
            <li className="nav-group">
              <div 
                className={`nav-item ${isSettingsMenuOpen ? 'active-group' : ''}`} 
                onClick={() => {
                  setIsSettingsMenuOpen(!isSettingsMenuOpen);
                  if (!isOpen) setIsOpen(true);
                }}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Settings size={20} />
                  <span>الإعدادات</span>
                </div>
                {isSettingsMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              
              <div className={`sub-menu ${isSettingsMenuOpen ? 'open' : ''}`}>
                <NavLink to="/shift-management" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                  <Clock size={16} />
                  <span>تنظيم الورديات</span>
                </NavLink>
                <NavLink to="/dayoff-management" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                  <Calendar size={16} />
                  <span>إدارة الإجازات</span>
                </NavLink>
                <NavLink to="/expenses" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                  <Wallet size={16} />
                  <span>إدارة المصروفات</span>
                </NavLink>
                <NavLink to="/general-settings" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                  <Settings size={16} />
                  <span>إعدادات عامة</span>
                </NavLink>
              </div>
            </li>
          )}

          {/* Performance & Reports Group */}
          <li className="nav-group">
            <div 
              className={`nav-item ${isPerfMenuOpen ? 'active-group' : ''}`} 
              onClick={() => {
                setIsPerfMenuOpen(!isPerfMenuOpen);
                if (!isOpen) setIsOpen(true);
              }}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <FileText size={20} />
                <span>الأداء والتقارير</span>
              </div>
              {isPerfMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            
            <div className={`sub-menu ${isPerfMenuOpen ? 'open' : ''}`}>
              <NavLink to="/summery" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <Summary size={16} />
                <span>الملخص</span>
              </NavLink>
              <NavLink to="/performance-log" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <History size={16} />
                <span>سجل الأداء</span>
              </NavLink>
              <NavLink to="/report-editor" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <FileText size={16} />
                <span>محرر التقارير</span>
              </NavLink>
            </div>
          </li>
          {profile.role === 'SuperAdmin' || profile.role === 'Admin' ? (
            <li className="nav-group">
              <div 
                className={`nav-item ${isAdminMenuOpen ? 'active-group' : ''}`} 
                onClick={() => {
                  setIsAdminMenuOpen(!isAdminMenuOpen);
                  if (!isOpen) setIsOpen(true);
                }}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Shield size={20} />
                  <span>الإدارة العامة</span>
                </div>
                {isAdminMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              
              <div className={`sub-menu ${isAdminMenuOpen ? 'open' : ''}`}>
                <NavLink to="/handleAdmin" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                  <Database size={16} />
                  <span>سجل المندوبين المجمع</span>
                </NavLink>
                <NavLink to="/handleAdminReports" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                  <Folder size={16} />
                  <span>سجل المراقبة المجمع</span>
                </NavLink>
                <NavLink to="/handleAdminPerformance" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                  <Activity size={16} />
                  <span>سجل مراقبة الأداء</span>
                </NavLink>
                <NavLink to="/permissions" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                  <Users size={16} />
                  <span>إدارة الحسابات</span>
                </NavLink>
                <NavLink to="/handleAdminExport" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                  <Download size={16} />
                  <span>تصدير التقارير</span>
                </NavLink>
              </div>
            </li>
          ) : null}
          <li className="nav-group">
            <div 
              className={`nav-item ${isAccountMenuOpen ? 'active-group' : ''}`} 
              onClick={() => {
                setIsAccountMenuOpen(!isAccountMenuOpen);
                if (!isOpen) setIsOpen(true);
              }}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <User size={20} />
                <span>حسابي</span>
              </div>
              {isAccountMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            
            <div className={`sub-menu ${isAccountMenuOpen ? 'open' : ''}`}>
              <NavLink to="/attendance" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <Clock size={16} />
                <span>الحضور</span>
              </NavLink>
              <NavLink to="/dayoff" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <Calendar size={16} />
                <span>الإجازات</span>
              </NavLink>
              <NavLink to="/account" className={({ isActive }) => isActive ? "sub-nav-item active" : "sub-nav-item"}>
                <User size={16} />
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
          <div className="user-avatar">
            <AvatarIcon size={20} color="#ffffff" />
          </div>
          <div className="user-info">
            <span className="user-name">{profile.name}</span>
            <span className="user-role">{profile.role}</span>
          </div>
          <div className="user-status">متصل</div>
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
