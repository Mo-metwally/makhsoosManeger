import React, { useState, useEffect } from 'react';
import { User, Shield, Cat, Crown, Star, Smile, Briefcase, Check, Save, Flame, Zap, Heart, Moon, TriangleAlert, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Account.css';

const GithubIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4"></path>
  </svg>
);

const ReactIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="-10.5 -9.45 21 18.9" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="0" cy="0" r="2" fill="currentColor"></circle>
    <g stroke="currentColor" strokeWidth="1" fill="none">
      <ellipse rx="10" ry="4.5"></ellipse>
      <ellipse rx="10" ry="4.5" transform="rotate(60)"></ellipse>
      <ellipse rx="10" ry="4.5" transform="rotate(120)"></ellipse>
    </g>
  </svg>
);

const ViteIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 410 404" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M399.641 43.1539L214.288 393.188C210.155 400.99 198.814 400.99 194.681 393.188L9.32832 43.1539C4.84378 34.6841 12.9231 25.4055 21.6663 28.9882L198.718 101.52C202.43 103.041 206.539 103.041 210.251 101.52L387.303 28.9882C396.046 25.4055 404.125 34.6841 399.641 43.1539Z" fill="url(#vite-grad)" />
    <path d="M293.411 1.76185L208.627 122.188C206.565 125.118 202.404 125.118 200.342 122.188L115.558 1.76185C111.455 -4.06227 102.399 0.0818292 104.053 7.03965L149.332 197.433C150.312 201.554 154.512 203.955 158.423 202.668L199.191 189.261C202.646 188.125 206.323 188.125 209.778 189.261L250.546 202.668C254.457 203.955 258.657 201.554 259.637 197.433L304.916 7.03965C306.57 0.0818292 297.514 -4.06227 293.411 1.76185Z" fill="url(#vite-grad-2)" />
    <defs>
      <linearGradient id="vite-grad" x1="204.485" y1="389.273" x2="204.485" y2="44.2543" gradientUnits="userSpaceOnUse">
        <stop stopColor="currentColor" stopOpacity="1" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id="vite-grad-2" x1="204.485" y1="195.457" x2="204.485" y2="2.75628" gradientUnits="userSpaceOnUse">
        <stop stopColor="currentColor" stopOpacity="1" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0.3" />
      </linearGradient>
    </defs>
  </svg>
);

const NextIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M90 180C139.706 180 180 139.706 180 90C180 40.2944 139.706 0 90 0C40.2944 0 0 40.2944 0 90C0 139.706 40.2944 180 90 180ZM65.8694 65V124H76.2804L121.737 57.0674L113.626 51.579L65.8694 65ZM111.458 114.372L74.8878 65H65.8694V115H74.8878V76.8406L104.912 120.25L111.458 114.372Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M115 65H124.018V115H115V65Z" fill="currentColor" />
  </svg>
);

const VueIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 256 221" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M204.8 0H256L128 220.8L0 0H51.2L128 132.48L204.8 0Z" fill="currentColor" />
    <path d="M204.8 0H153.6L128 44.16L102.4 0H51.2L128 132.48L204.8 0Z" fill="rgba(255,255,255,0.4)" />
  </svg>
);

const avatarOptions = [
  { id: 'User', icon: User },
  { id: 'Shield', icon: Shield },
  { id: 'Cat', icon: Cat },
  { id: 'Crown', icon: Crown },
  { id: 'Star', icon: Star },
  { id: 'Smile', icon: Smile },
  { id: 'Briefcase', icon: Briefcase },
  { id: 'React', icon: ReactIcon },
  { id: 'Github', icon: GithubIcon },
  { id: 'Vite', icon: ViteIcon },
  { id: 'Next', icon: NextIcon },
  { id: 'Vue', icon: VueIcon },
  { id: 'Flame', icon: Flame },
  { id: 'Zap', icon: Zap },
  { id: 'Heart', icon: Heart },
  { id: 'Moon', icon: Moon }
];

const Account = () => {
  const { user, updateProfile, logout } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    jobTitle: '',
    password: ''
  });
  const [selectedAvatar, setSelectedAvatar] = useState('User');
  
  const [toast, setToast] = useState({ show: false, message: '' });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdStatus, setPwdStatus] = useState('');
  const [pwdError, setPwdError] = useState('');
  
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => {
    document.title = "إعدادات الحساب | مخصوص";
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        jobTitle: user.jobTitle || '',
        password: ''
      });
      setSelectedAvatar(user.avatar || 'User');
    }

    return () => {
      const finalAvatar = user?.avatar || 'User';
      document.documentElement.setAttribute('data-theme', finalAvatar);
    };
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarClick = (id) => {
    setSelectedAvatar(id);
    document.documentElement.setAttribute('data-theme', id);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, avatar: selectedAvatar };
      if (!payload.password || payload.password.trim() === '') {
        delete payload.password;
      }
      await updateProfile(payload);
      setToast({ show: true, message: 'تم حفظ البيانات بنجاح!' });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    } catch (err) {
      setToast({ show: true, message: 'حدث خطأ أثناء حفظ البيانات' });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    }
  };

  const handleResetClick = () => {
    setIsResetModalOpen(true);
  };

  const confirmReset = () => {
    setIsResetModalOpen(false);
    logout();
  };

  const handlePwdChange = (e) => {
    setPwdForm({ ...pwdForm, [e.target.name]: e.target.value });
  };

  const submitChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdStatus('');

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('كلمة المرور الجديدة غير متطابقة.');
      return;
    }

    try {
      const api = (await import('../services/api')).default;
      const res = await api.put('/auth/change-password', {
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword
      });
      setPwdStatus(res.data.message);
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setIsPwdModalOpen(false);
        setPwdStatus('');
      }, 3000);
    } catch (err) {
      setPwdError(err.response?.data?.error || 'حدث خطأ أثناء التغيير.');
    }
  };

  return (
    <div className="account-container">
      <header className="page-header">
        <div className="page-title-wrapper">
          <User size={28} className="title-icon text-blue" />
          <h1 className="page-title gradient-title">إعدادات الحساب</h1>
        </div>
      </header>

      <div className="account-content">
        <div className="account-card">
          <form onSubmit={handleSave}>
            <div className="form-section">
              <h3 className="section-title">المعلومات الأساسية</h3>

              <div className="form-row two-cols">
                <div className="form-group">
                  <label>اسم المستخدم (للتسجيل)</label>
                  <input type="text" value={user?.username || ''} disabled style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }} />
                </div>
                <div className="form-group">
                  <label>الاسم الكامل</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>
              </div>

              <div className="form-row two-cols">
                <div className="form-group">
                  <label>البريد الإلكتروني</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@makhsoos.com"
                  />
                </div>
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="05X XXX XXXX"
                  />
                </div>
              </div>

              <div className="form-row two-cols">
                <div className="form-group">
                  <label>المسمى الوظيفي</label>
                  <input
                    type="text"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    placeholder="المسمى الوظيفي (مثل: مشرف مبيعات)"
                  />
                </div>
                <div className="form-group">
                  <label>تأمين الحساب</label>
                  <button 
                    type="button" 
                    onClick={() => setIsPwdModalOpen(true)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: 'var(--accent-blue)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      padding: '0.85rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'var(--accent-blue)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                      e.currentTarget.style.color = 'var(--accent-blue)';
                    }}
                  >
                    <KeyRound size={18} />
                    <span>تغيير كلمة المرور</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">اختيار الأفاتار (الأيقونة)</h3>
              <div className="avatar-grid">
                {avatarOptions.map((opt) => {
                  const IconComponent = opt.icon;
                  return (
                    <div
                      key={opt.id}
                      className={`avatar-option ${selectedAvatar === opt.id ? 'selected' : ''}`}
                      onClick={() => handleAvatarClick(opt.id)}
                    >
                      <IconComponent size={32} />
                      {selectedAvatar === opt.id && (
                        <div className="avatar-check">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: '2rem' }}>
              <button type="submit" className="btn-save" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={18} />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>

          <div className="form-section" style={{ marginTop: '3rem', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
            <h3 className="section-title" style={{ color: '#ef4444', borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>إحترس (إعادة تعيين)</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              سيؤدي هذا الإجراء إلى مسح <strong>جميع بيانات الموقع</strong> نهائياً، بما في ذلك سجل المكالمات، أوقات الخمول، والإعدادات المحفوظة. سيعود الموقع لحالته الأولى كأنه جديد. <strong>هذا الإجراء لا يمكن التراجع عنه.</strong>
            </p>
            <button 
              type="button" 
              onClick={handleResetClick} 
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                padding: '0.8rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <TriangleAlert size={18} />
              <span>إعادة تعيين الموقع وحذف كل شيء</span>
            </button>
          </div>
        </div>
      </div>

      {isResetModalOpen && (
        <div className="modal-overlay" onClick={() => setIsResetModalOpen(false)}>
          <div className="modal-content warning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TriangleAlert size={24} />
                إحترس (إعادة تعيين)
              </h2>
              <button className="close-btn" onClick={() => setIsResetModalOpen(false)}>&times;</button>
            </div>
            <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              أنت على وشك مسح <strong>جميع بيانات الموقع نهائياً</strong>، بما في ذلك سجلات المكالمات وكل الإعدادات التي قمت بها.
              <br/><br/>
              هل أنت متأكد من رغبتك في الاستمرار؟ <strong>هذا الإجراء لا يمكن التراجع عنه.</strong>
            </p>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setIsResetModalOpen(false)}>إلغاء</button>
              <button 
                type="button" 
                className="btn-save" 
                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }} 
                onClick={confirmReset}
              >
                نعم، احذف كل شيء
              </button>
            </div>
          </div>
        </div>
      )}

      {isPwdModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPwdModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={24} className="text-blue" />
                تغيير كلمة المرور
              </h2>
              <button className="close-btn" onClick={() => setIsPwdModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {pwdError && <div className="error-message" style={{ color: '#ef4444', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{pwdError}</div>}
              {pwdStatus && <div className="success-message" style={{ color: '#22c55e', marginBottom: '1rem', background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{pwdStatus}</div>}
              <form onSubmit={submitChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>كلمة المرور القديمة</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showOldPwd ? "text" : "password"} name="oldPassword" value={pwdForm.oldPassword} onChange={handlePwdChange} required style={{ paddingLeft: '40px', width: '100%' }} />
                    <button type="button" onClick={() => setShowOldPwd(!showOldPwd)} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      {showOldPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>كلمة المرور الجديدة</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showNewPwd ? "text" : "password"} name="newPassword" value={pwdForm.newPassword} onChange={handlePwdChange} required style={{ paddingLeft: '40px', width: '100%', borderColor: (pwdForm.newPassword && pwdForm.newPassword.length < 6) ? '#ef4444' : '' }} />
                    <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {pwdForm.newPassword && pwdForm.newPassword.length < 6 && (
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>كلمة المرور يجب أن لا تقل عن 6 أحرف</span>
                  )}
                </div>
                <div className="form-group">
                  <label>تأكيد كلمة المرور الجديدة</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConfirmPwd ? "text" : "password"} name="confirmPassword" value={pwdForm.confirmPassword} onChange={handlePwdChange} required style={{ paddingLeft: '40px', width: '100%', borderColor: (pwdForm.confirmPassword && pwdForm.confirmPassword !== pwdForm.newPassword) ? '#ef4444' : '' }} />
                    <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {pwdForm.confirmPassword && pwdForm.confirmPassword !== pwdForm.newPassword && (
                    <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', display: 'block' }}>كلمتا المرور غير متطابقتين</span>
                  )}
                </div>
                <div className="modal-actions" style={{ marginTop: '1rem' }}>
                  <button type="submit" className="btn-save" style={{ width: '100%' }} disabled={pwdForm.newPassword.length < 6 || pwdForm.newPassword !== pwdForm.confirmPassword}>حفظ كلمة المرور</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="toast-notification toast-success">
          <Check size={20} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Account;
