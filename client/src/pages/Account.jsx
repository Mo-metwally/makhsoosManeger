import React, { useState, useEffect } from 'react';
import { User, Shield, Cat, Crown, Star, Smile, Briefcase, Check, Save, Flame, Zap, Heart, Moon, Sun, TriangleAlert, KeyRound, Loader2, XCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import './Account.css';

import AvatarIcon, { avatarOptions } from '../components/AvatarIcon';

const Account = () => {
  const { user, updateProfile, logout } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    jobTitle: '',
    password: ''
  });
  const [selectedAvatar, setSelectedAvatar] = useState('User');

  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle, checking, available, taken

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdStatus, setPwdStatus] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [appMode, setAppMode] = useState(localStorage.getItem('app-mode') || 'dark');

  const handleModeChange = (mode) => {
    setAppMode(mode);
    localStorage.setItem('app-mode', mode);
    document.documentElement.setAttribute('data-mode', mode);
    window.dispatchEvent(new Event('modeUpdated'));
  };

  useEffect(() => {
    document.title = "إعدادات الحساب | مخصوص";
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        username: user.username || '',
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
    let val = e.target.value;
    if (e.target.name === 'username') {
      val = val.replace(/\s/g, '');
    }
    setFormData({ ...formData, [e.target.name]: val });
  };

  useEffect(() => {
    if (!formData.username) {
      setUsernameStatus('empty');
      return;
    }
    if (user && formData.username === user.username) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/check-username?username=${encodeURIComponent(formData.username)}`);
        setUsernameStatus(res.data.available ? 'available' : 'taken');
      } catch (err) {
        setUsernameStatus('idle');
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.username, user]);

  const handleAvatarClick = (id) => {
    setSelectedAvatar(id);
    document.documentElement.setAttribute('data-theme', id);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (usernameStatus === 'taken') {
      showToast('اسم المستخدم مسجل بالفعل، يرجى اختيار اسم آخر.', 'error');
      return;
    }
    try {
      const payload = { ...formData, avatar: selectedAvatar };
      if (!payload.password || payload.password.trim() === '') {
        delete payload.password;
      }
      await updateProfile(payload);
      showToast('تم حفظ البيانات بنجاح!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'حدث خطأ أثناء حفظ البيانات', 'error');
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
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>اسم المستخدم (للتسجيل)</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    style={{
                      borderColor: (usernameStatus === 'taken' || usernameStatus === 'empty') ? '#ef4444' : usernameStatus === 'available' ? '#22c55e' : '',
                      borderWidth: (usernameStatus === 'taken' || usernameStatus === 'available' || usernameStatus === 'empty') ? '2px' : '',
                      outlineColor: (usernameStatus === 'taken' || usernameStatus === 'empty') ? '#ef4444' : usernameStatus === 'available' ? '#22c55e' : '',
                      backgroundColor: (usernameStatus === 'taken' || usernameStatus === 'empty') ? 'rgba(239, 68, 68, 0.05)' : usernameStatus === 'available' ? 'rgba(34, 197, 94, 0.05)' : ''
                    }}
                  />
                  <div style={{ position: 'absolute', left: '1rem', top: '45%', transform: 'translateY(-50%)' }}>
                    {usernameStatus === 'checking' && <Loader2 className="spinning text-secondary" size={18} style={{ position: 'absolute', left: '0.1rem', top: '85%', transform: 'translateY(-5%)' }} />}
                    {usernameStatus === 'available' && <Check color="#22c55e" size={18} />}
                    {usernameStatus === 'taken' && <XCircle color="#ef4444" size={18} />}
                  </div>
                  {usernameStatus === 'empty' && <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '6px', display: 'block', fontWeight: 'bold' }}>اسم المستخدم مطلوب ولا يمكن أن يكون فارغاً أو يحتوي على مسافات.</span>}
                  {usernameStatus === 'taken' && <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '6px', display: 'block', fontWeight: 'bold' }}>هذا الاسم مسجل بالفعل! يرجى اختيار اسم آخر.</span>}
                  {usernameStatus === 'available' && <span style={{ color: '#22c55e', fontSize: '0.85rem', marginTop: '6px', display: 'block', fontWeight: 'bold' }}>الاسم متاح! يمكنك استخدامه.</span>}
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
              <h3 className="section-title">مظهر التطبيق (الوضع النهاري/الليلي)</h3>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => handleModeChange('dark')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: `2px solid ${appMode === 'dark' ? 'var(--theme-color)' : 'var(--border-color)'}`,
                    backgroundColor: appMode === 'dark' ? 'rgba(var(--theme-color-rgb, 59, 130, 246), 0.1)' : 'transparent',
                    color: appMode === 'dark' ? 'var(--theme-color)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <Moon size={20} />
                  <span style={{ fontWeight: appMode === 'dark' ? 'bold' : 'normal' }}>الوضع الداكن</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('light')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: `2px solid ${appMode === 'light' ? 'var(--theme-color)' : 'var(--border-color)'}`,
                    backgroundColor: appMode === 'light' ? 'rgba(var(--theme-color-rgb, 59, 130, 246), 0.1)' : 'transparent',
                    color: appMode === 'light' ? 'var(--theme-color)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <Sun size={20} />
                  <span style={{ fontWeight: appMode === 'light' ? 'bold' : 'normal' }}>الوضع الفاتح</span>
                </button>
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
                      className="avatar-item-container"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                    >
                      <div
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
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: selectedAvatar === opt.id ? 'var(--theme-color)' : 'var(--text-secondary)' }}>
                        {opt.id}
                      </span>
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

          {/* <div className="form-section" style={{ marginTop: '3rem', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
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
          </div> */}
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
              <br /><br />
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
    </div>
  );
};

export default Account;
