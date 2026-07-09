import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UploadCloud, Users, Activity, DownloadCloud } from 'lucide-react';

const AdminNavBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const links = [
    { path: '/handleAdminAdd', label: 'رفع التقارير المجمعة', icon: UploadCloud },
    { path: '/allcontacts', label: 'سجل التواصل المجمع', icon: Users },
    { path: '/handleAdminReports', label: 'سجل المراقبة المجمع', icon: Activity },
    { path: '/handleAdminPerformance', label: 'سجل مراقبة الأداء', icon: Activity },
    { path: '/handleAdminExport', label: 'تصدير التقارير', icon: DownloadCloud }
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
