import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UploadCloud, Users, Activity } from 'lucide-react';

const AdminNavBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const links = [
    { path: '/handleAdminAdd', label: 'رفع التقارير المجمعة', icon: UploadCloud },
    { path: '/handleAdmin', label: 'سجل المندوبين المجمع', icon: Users },
    { path: '/handleAdminReports', label: 'سجل المراقبة المجمع', icon: Activity }
  ];

  return (
    <div className="admin-navbar-container">
      <nav className="admin-navbar">
        {links.map(({ path, label, icon: Icon }) => (
          <Link 
            key={path} 
            to={path} 
            className={`admin-nav-link ${currentPath === path ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default AdminNavBar;
