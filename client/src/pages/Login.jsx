import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, Mail, Phone, UserPlus, LogIn, KeyRound, Briefcase, Loader2 } from 'lucide-react';
import api from '../services/api';
import "./Login.scss";

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    jobTitle: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(formData.username, formData.password);
        navigate('/');
      } else if (mode === 'signup') {
        const res = await api.post('/auth/signup', formData);
        setSuccess(res.data.message || 'تم التسجيل بنجاح، بانتظار موافقة الإدارة.');
        setMode('login');
      } else if (mode === 'forgot_email') {
        const res = await api.post('/auth/forgot-password', { email: formData.email });
        setSuccess(res.data.message || 'تم إرسال رمز التأكيد.');
        setMode('forgot_otp');
      } else if (mode === 'forgot_otp') {
        const res = await api.post('/auth/verify-otp', { email: formData.email, otp: formData.otp });
        setSuccess(res.data.message || 'تم التحقق بنجاح.');
        setMode('forgot_reset');
      } else if (mode === 'forgot_reset') {
        if (formData.newPassword !== formData.confirmPassword) {
          setError('كلمتي المرور غير متطابقتين.');
          setIsLoading(false);
          return;
        }
        const res = await api.post('/auth/reset-password', { email: formData.email, otp: formData.otp, newPassword: formData.newPassword });
        setSuccess(res.data.message || 'تم تغيير كلمة المرور.');
        setMode('login');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في العملية');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className={`login-card glass-panel ${mode === 'signup' ? 'signup-mode' : ''}`}>
        <h2 className="gradient-title login-style-1" >
          {mode === 'login' && 'تسجيل الدخول'}
          {mode === 'signup' && 'إنشاء حساب جديد'}
          {mode === 'forgot_email' && 'استعادة كلمة المرور'}
          {mode === 'forgot_otp' && 'إدخال رمز التأكيد'}
          {mode === 'forgot_reset' && 'كلمة المرور الجديدة'}
        </h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className={mode === 'signup' ? 'signup-form' : 'login-form'}>
          {mode === 'signup' && (
            <>
              <div className="input-group">
                <UserIcon className="input-icon" size={20} />
                <input 
                  type="text" 
                  name="fullName"
                  placeholder="الاسم الكامل" 
                  value={formData.fullName} 
                  onChange={handleChange}
                  required 
                />
              </div>
              <div className="input-group">
                <Mail className="input-icon" size={20} />
                <input 
                  type="email" 
                  name="email"
                  placeholder="البريد الإلكتروني" 
                  value={formData.email} 
                  onChange={handleChange}
                  required 
                />
              </div>
              <div className="input-group">
                <Phone className="input-icon" size={20} />
                <input 
                  type="text" 
                  name="phone"
                  placeholder="رقم الهاتف" 
                  value={formData.phone} 
                  onChange={handleChange}
                  required 
                />
              </div>
              <div className="input-group">
                <Briefcase className="input-icon" size={20} />
                <input 
                  type="text" 
                  name="jobTitle"
                  placeholder="المسمى الوظيفي" 
                  value={formData.jobTitle} 
                  onChange={handleChange}
                  required 
                />
              </div>
            </>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <>
              <div className="input-group">
                <UserIcon className="input-icon" size={20} />
                <input 
                  type="text" 
                  name="username"
                  placeholder={mode === 'login' ? 'اسم المستخدم أو الإيميل' : 'اسم المستخدم (للدخول)'} 
                  value={formData.username} 
                  onChange={handleChange}
                  required 
                />
              </div>

              <div className="input-group">
                <Lock className="input-icon" size={20} />
                <input 
                  type="password" 
                  name="password"
                  placeholder="كلمة المرور" 
                  value={formData.password} 
                  onChange={handleChange}
                  required 
                />
              </div>
            </>
          )}

          {mode === 'forgot_email' && (
            <div className="input-group">
              <Mail className="input-icon" size={20} />
              <input 
                type="email" 
                name="email"
                placeholder="البريد الإلكتروني" 
                value={formData.email} 
                onChange={handleChange}
                required 
              />
            </div>
          )}

          {mode === 'forgot_otp' && (
            <div className="input-group">
              <Lock className="input-icon" size={20} />
              <input 
                type="text" 
                name="otp"
                placeholder="رمز التأكيد (6 أرقام)" 
                value={formData.otp} 
                onChange={handleChange}
                maxLength="6"
                required 
              />
            </div>
          )}

          {mode === 'forgot_reset' && (
            <>
              <div className="input-group">
                <Lock className="input-icon" size={20} />
                <input 
                  type="password" 
                  name="newPassword"
                  placeholder="كلمة المرور الجديدة" 
                  value={formData.newPassword} 
                  onChange={handleChange}
                  required 
                />
              </div>
              <div className="input-group">
                <Lock className="input-icon" size={20} />
                <input 
                  type="password" 
                  name="confirmPassword"
                  placeholder="تأكيد كلمة المرور" 
                  value={formData.confirmPassword} 
                  onChange={handleChange}
                  required 
                />
              </div>
            </>
          )}

          {mode === 'login' && (
            <div className="forgot-password">
              <button type="button" className="link-btn" onClick={() => { setMode('forgot_email'); setError(''); setSuccess(''); }}>
                <KeyRound size={16} />
                نسيت كلمة السر؟
              </button>
            </div>
          )}

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? (
              <Loader2 size={20} className="spinner-icon" />
            ) : (
              <>
                {mode === 'login' && <><LogIn size={20} className="login-style-2" /> دخول</>}
                {mode === 'signup' && <><UserPlus size={20} className="login-style-3" /> إنشاء الحساب</>}
                {mode === 'forgot_email' && 'إرسال الرمز'}
                {mode === 'forgot_otp' && 'تأكيد الرمز'}
                {mode === 'forgot_reset' && 'تعيين كلمة المرور'}
              </>
            )}
          </button>
        </form>

        <div className="toggle-mode">
          {(mode === 'login' || mode.startsWith('forgot')) ? (
            <p>ليس لديك حساب؟ <button type="button" className="link-btn primary" onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>إنشاء حساب جديد</button></p>
          ) : (
            <p>لديك حساب بالفعل؟ <button type="button" className="link-btn primary" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>تسجيل الدخول</button></p>
          )}
          {mode.startsWith('forgot') && (
            <p className="login-style-4"><button type="button" className="link-btn" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>العودة لتسجيل الدخول</button></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
