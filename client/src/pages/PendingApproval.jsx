import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, RefreshCw, LogOut } from 'lucide-react';
import './PendingApproval.css';

const PendingApproval = () => {
  const { logout } = useAuth();

  useEffect(() => {
    document.title = "حسابك قيد المراجعة | مخصوص";
  }, []);

  const [status, setStatus] = React.useState('');

  const handleRefresh = () => {
    window.location.reload();
  };

  const requestActivation = async () => {
    try {
      setStatus('جاري الإرسال...');
      const api = (await import('../services/api')).default;
      const res = await api.post('/notifications/request-activation');
      setStatus(res.data.message || 'تم إرسال التنبيه للإدارة بنجاح.');
    } catch (error) {
      setStatus(error.response?.data?.error || 'حدث خطأ أثناء إرسال التنبيه.');
    }
  };

  return (
    <div className="pending-container">
      <div className="pending-card">
        <div className="pending-icon-wrapper">
          <Clock size={80} strokeWidth={1.5} className="pending-icon text-blue" />
        </div>
        <h1 className="pending-title gradient-title">حسابك قيد المراجعة</h1>
        <p className="pending-desc">
          برجاء إنتظار موافقة المشرف.
          <br/>
          تم تسجيل جهازك بنجاح، ولن تتمكن من الدخول من أي جهاز آخر بدون موافقة الإدارة للحفاظ على أمان حسابك.
        </p>

        {status && (
          <div style={{ margin: '1rem 0', padding: '0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--theme-glow)', fontWeight: 'bold' }}>
            {status}
          </div>
        )}

        <div className="pending-actions">
          <button className="btn-refresh" onClick={requestActivation} style={{ background: 'var(--theme-color)', color: '#fff', border: 'none' }}>
            <Clock size={20} />
            <span>تنبيه الإدارة للتفعيل</span>
          </button>
          
          <button className="btn-refresh" onClick={handleRefresh}>
            <RefreshCw size={20} />
            <span>تحديث حالة الحساب</span>
          </button>
          
          <button className="btn-logout" onClick={logout}>
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
