import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, Mail, Phone, UserPlus, LogIn, KeyRound } from 'lucide-react';
import api from '../services/api';
import './Login.css';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (mode === 'login') {
        await login(formData.username, formData.password);
        navigate('/');
      } else {
        const res = await api.post('/auth/signup', formData);
        setSuccess(res.data.message || 'تم التسجيل بنجاح، بانتظار موافقة الإدارة.');
        setMode('login');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في العملية');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <h2 className="gradient-title" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem' }}>
          {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
        </h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
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
            </>
          )}

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

          {mode === 'login' && (
            <div className="forgot-password">
              <button type="button" className="link-btn" onClick={() => alert('يرجى مراجعة إدارة النظام (SuperAdmin) لإعادة تعيين كلمة المرور الخاصة بك.')}>
                <KeyRound size={16} />
                نسيت كلمة السر؟
              </button>
            </div>
          )}

          <button type="submit" className="login-btn">
            {mode === 'login' ? (
              <><LogIn size={20} style={{ marginLeft: '8px' }} /> دخول</>
            ) : (
              <><UserPlus size={20} style={{ marginLeft: '8px' }} /> إنشاء الحساب</>
            )}
          </button>
        </form>

        <div className="toggle-mode">
          {mode === 'login' ? (
            <p>ليس لديك حساب؟ <button type="button" className="link-btn primary" onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>إنشاء حساب جديد</button></p>
          ) : (
            <p>لديك حساب بالفعل؟ <button type="button" className="link-btn primary" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>تسجيل الدخول</button></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
