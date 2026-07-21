import React, { useState, useEffect } from 'react';
import { User, Shield, Cat, Crown, Star, Smile, Briefcase, Check, Save, Flame, Zap, Heart, Moon, Sun, TriangleAlert, KeyRound, Loader2, XCircle, Eye, EyeOff, Info, Clock, Calendar, Users, Wallet, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import './Account.css';

import AvatarIcon, { avatarOptions } from '../components/AvatarIcon';

const DAYS_OF_WEEK = [
  { id: 'Saturday', label: 'السبت' },
  { id: 'Sunday', label: 'الأحد' },
  { id: 'Monday', label: 'الإثنين' },
  { id: 'Tuesday', label: 'الثلاثاء' },
  { id: 'Wednesday', label: 'الأربعاء' },
  { id: 'Thursday', label: 'الخميس' },
  { id: 'Friday', label: 'الجمعة' }
];

const Account = () => {
  const { user, updateProfile, logout } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    walletNumber: '',
    walletType: 'E-Wallet',
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
  const [myShifts, setMyShifts] = useState([]);

  // Wallet Lock State
  const [isWalletLocked, setIsWalletLocked] = useState(true);
  const [showVerifyPwdModal, setShowVerifyPwdModal] = useState(false);
  const [verifyPwdStr, setVerifyPwdStr] = useState('');
  const [verifyPwdError, setVerifyPwdError] = useState('');

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
        walletNumber: user.walletNumber || '',
        walletType: user.walletType || 'E-Wallet',
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

  useEffect(() => {
    if (user && user.status === 'Active') {
      api.get('/shifts/my-shifts').then(res => {
        if (res.data) setMyShifts(res.data);
      }).catch(console.error);
    }
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

  const handleVerifyPassword = async () => {
    try {
      setVerifyPwdError('');
      const res = await api.post('/auth/verify-password', { password: verifyPwdStr });
      if (res.data.valid) {
        setIsWalletLocked(false);
        setShowVerifyPwdModal(false);
        setVerifyPwdStr('');
        showToast('تم فك القفل بنجاح، يمكنك الآن تعديل البيانات', 'success');
      }
    } catch (error) {
      setVerifyPwdError(error.response?.data?.error || 'كلمة المرور غير صحيحة');
    }
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
        <div className="page-title-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={28} className="title-icon text-blue" />
            <h1 className="page-title gradient-title">إعدادات الحساب</h1>
          </div>
          {user?.isTrackerOnline && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#22c55e', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }}></div>
              التراكر متصل
            </div>
          )}
        </div>
      </header>

      <div className="account-content">
        {/* Shift Info Section */}
        {myShifts.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={24} className="text-blue" />
              بيانات الوردية الحالية
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {myShifts.map(shift => {
                const shiftUsers = shift.Users || [];
                return (
                  <div key={shift.id} className="account-card" style={{ padding: '1.5rem 2rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>{shift.name}</h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', direction: 'ltr' }}>
                        <Clock size={16} className="text-blue" />
                        {shift.endTime} - {shift.startTime}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={16} className="text-blue" />
                        {(shift.workingDays || []).map(dId => DAYS_OF_WEEK.find(d => d.id === dId)?.label).join('، ')}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={16} className="text-blue" />
                        {shiftUsers.length} موظف
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                        <strong>نظام الإجازات:</strong>
                        {shift.dayOffType === 'Fixed' ? 'ثابت' : 'متغير'}
                      </span>
                      {shift.dayOffType === 'Fixed' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                          <strong>الأيام:</strong>
                          {(shift.fixedDaysOff || []).map(dId => DAYS_OF_WEEK.find(d => d.id === dId)?.label).join('، ') || 'لا يوجد'}
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                          <strong>الأيام المسموحة شهرياً:</strong>
                          {shift.variableDaysOffCount || 0} أيام
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                        <strong>فترة السماح للتأخير:</strong>
                        {localStorage.getItem('allowedDelayMinutes') || '15'} دقيقة
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
              <h3 className="section-title">البيانات المالية</h3>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                <TriangleAlert color="#ef4444" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ color: '#ef4444', marginBottom: '0.3rem', fontSize: '0.95rem' }}>تنويه هام جدًا</h4>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', lineHeight: '1.5' }}>
                    بيانات التحويل المكتوبة هنا هي <strong>مسؤولية صاحب الحساب بالكامل</strong>، وسوف يتم إرسال كافة مستحقاتك المالية عليها. يرجى التأكد من صحتها ومراجعتها بعناية.
                  </p>
                </div>
              </div>

              <div style={{ position: 'relative', marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                {isWalletLocked && (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(3px)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'white' }}>
                      <Lock size={24} />
                      <h4 style={{ margin: 0, fontSize: '1.1rem' }}>بيانات الدفع  </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowVerifyPwdModal(true)}
                      style={{
                        backgroundColor: 'var(--theme-color)',
                        color: 'white',
                        border: 'none',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.opacity = '0.9'}
                      onMouseOut={(e) => e.target.style.opacity = '1'}
                    >
                      تعديل البيانات
                    </button>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>نوع حساب الاستلام</label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <label style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1.5rem', borderRadius: '16px', border: `2px solid ${formData.walletType === 'E-Wallet' ? 'var(--theme-color)' : 'var(--border-color)'}`, background: formData.walletType === 'E-Wallet' ? 'rgba(var(--theme-color-rgb, 59, 130, 246), 0.1)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.3s', boxShadow: formData.walletType === 'E-Wallet' ? '0 8px 20px rgba(59, 130, 246, 0.2)' : 'none' }}>
                      <input
                        type="radio"
                        name="walletType"
                        value="E-Wallet"
                        checked={formData.walletType === 'E-Wallet'}
                        onChange={handleChange}
                        style={{ display: 'none' }}
                        disabled={isWalletLocked}
                      />
                      <Wallet size={32} color={formData.walletType === 'E-Wallet' ? 'var(--theme-color)' : 'var(--text-secondary)'} />
                      <span style={{ fontWeight: formData.walletType === 'E-Wallet' ? 'bold' : 'normal', color: formData.walletType === 'E-Wallet' ? 'var(--theme-color)' : 'var(--text-primary)', fontSize: '1.1rem' }}>محفظة إلكترونية</span>
                      {formData.walletType === 'E-Wallet' && (
                        <CheckCircle size={20} color="var(--theme-color)" style={{ position: 'absolute', top: '10px', right: '10px' }} />
                      )}
                    </label>

                    <label style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1.5rem', borderRadius: '16px', border: `2px solid ${formData.walletType === 'InstaPay' ? '#a855f7' : 'var(--border-color)'}`, background: formData.walletType === 'InstaPay' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.3s', boxShadow: formData.walletType === 'InstaPay' ? '0 8px 20px rgba(168, 85, 247, 0.2)' : 'none' }}>
                      <input
                        type="radio"
                        name="walletType"
                        value="InstaPay"
                        checked={formData.walletType === 'InstaPay'}
                        onChange={handleChange}
                        style={{ display: 'none' }}
                        disabled={isWalletLocked}
                      />
                      <Zap size={32} color={formData.walletType === 'InstaPay' ? '#a855f7' : 'var(--text-secondary)'} />
                      <span style={{ fontWeight: formData.walletType === 'InstaPay' ? 'bold' : 'normal', color: formData.walletType === 'InstaPay' ? '#a855f7' : 'var(--text-primary)', fontSize: '1.1rem' }}>انستا باي (InstaPay)</span>
                      {formData.walletType === 'InstaPay' && (
                        <CheckCircle size={20} color="#a855f7" style={{ position: 'absolute', top: '10px', right: '10px' }} />
                      )}
                    </label>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{formData.walletType === 'InstaPay' ? 'عنوان الدفع الخاص بانستا باي (IPA) أو رقم الهاتف' : 'رقم المحفظة الإلكترونية (فودافون كاش - اتصالات كاش - إلخ)'}</label>
                    <input
                      type="text"
                      name="walletNumber"
                      value={formData.walletNumber}
                      onChange={handleChange}
                      placeholder={formData.walletType === 'InstaPay' ? 'أدخل عنوان انستا باي (مثال: user@instapay) أو الرقم' : 'أدخل رقم المحفظة (مثال: 010XXXXXXX)'}
                      style={{ borderColor: formData.walletType === 'InstaPay' && formData.walletNumber ? '#6b21a8' : '' }}
                      disabled={isWalletLocked}
                    />
                  </div>
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
        <div className="modal-overlay active" onClick={() => setIsResetModalOpen(false)}>
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

      {showVerifyPwdModal && (
        <div className="modal-overlay active" onClick={() => setShowVerifyPwdModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={24} className="text-blue" />
                تأكيد هويتك
              </h2>
              <button className="close-btn" onClick={() => setShowVerifyPwdModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                يرجى إدخال كلمة مرور حسابك لتتمكن من تعديل بيانات الدفع والمحفظة الإلكترونية.
              </p>
              {verifyPwdError && <div className="error-message" style={{ color: '#ef4444', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{verifyPwdError}</div>}
              <div className="form-group">
                <label>كلمة المرور</label>
                <input
                  type="password"
                  value={verifyPwdStr}
                  onChange={(e) => setVerifyPwdStr(e.target.value)}
                  required
                  style={{ width: '100%' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-cancel" onClick={() => setShowVerifyPwdModal(false)}>إلغاء</button>
              <button type="button" className="btn-save" onClick={handleVerifyPassword}>تأكيد</button>
            </div>
          </div>
        </div>
      )}

      {isPwdModalOpen && (
        <div className="modal-overlay active" onClick={() => setIsPwdModalOpen(false)}>
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
