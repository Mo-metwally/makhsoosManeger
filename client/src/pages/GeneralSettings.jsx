import React, { useState, useEffect } from 'react';
import { Settings, Target, Save, Loader2, CheckCircle2, Moon, Sun, Sunrise, Clock } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';

const GeneralSettings = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [targetCalls, setTargetCalls] = useState('');
  const [logicalDayCutoff, setLogicalDayCutoff] = useState('5');
  const [autoCheckoutHours, setAutoCheckoutHours] = useState('1');
  const [allowedDelayMinutes, setAllowedDelayMinutes] = useState('15');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "الإعدادات العامة | مخصوص";
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings'); // fetch all settings
      if (res.data) {
        setTargetCalls(res.data.dailyCallsTarget || '30');
        setLogicalDayCutoff(res.data.logicalDayCutoff || '5');
        setAutoCheckoutHours(res.data.autoCheckoutHours || '1');
        setAllowedDelayMinutes(res.data.allowedDelayMinutes || '15');
        localStorage.setItem('logicalDayCutoff', res.data.logicalDayCutoff || '5');
        localStorage.setItem('allowedDelayMinutes', res.data.allowedDelayMinutes || '15');
      } else {
        setTargetCalls('30');
        setLogicalDayCutoff('5');
        setAutoCheckoutHours('1');
        setAllowedDelayMinutes('15');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showToast('فشل في جلب الإعدادات الحالية', 'error');
      setTargetCalls('30');
      setLogicalDayCutoff('5');
      setAutoCheckoutHours('1');
      setAllowedDelayMinutes('15');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!targetCalls || isNaN(targetCalls) || Number(targetCalls) < 1) {
      showToast('يرجى إدخال رقم صحيح للتارجت', 'error');
      return;
    }

    try {
      setSaving(true);
      
      await api.put('/settings', {
        key: 'dailyCallsTarget',
        value: targetCalls.toString()
      });

      await api.put('/settings', {
        key: 'logicalDayCutoff',
        value: logicalDayCutoff.toString()
      });

      await api.put('/settings', {
        key: 'autoCheckoutHours',
        value: autoCheckoutHours.toString()
      });

      await api.put('/settings', {
        key: 'allowedDelayMinutes',
        value: allowedDelayMinutes.toString()
      });

      localStorage.setItem('logicalDayCutoff', logicalDayCutoff.toString());
      localStorage.setItem('allowedDelayMinutes', allowedDelayMinutes.toString());
      showToast('تم حفظ الإعدادات بنجاح', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('فشل في حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Only allow Admin and Super Admin
  if (user && user.role !== 'Admin' && user.role !== 'SuperAdmin') {
    return (
      <div className="general-settings-container">
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>غير مصرح لك بالدخول لهذه الصفحة</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="general-settings-container">
      <div className="page-title-wrapper">
        <Settings size={32} className="title-icon" />
        <div>
          <h1 className="gradient-title">الإعدادات العامة</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            إدارة إعدادات النظام وتحديد الأهداف المطلوبة للموظفين
          </p>
        </div>
      </div>

      <div className="glass-panel fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 className="spin" size={32} color="var(--theme-color)" />
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="form-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--theme-color)' }}>
                <Target size={24} />
                تارجت المكالمات اليومي
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
                <label style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                  عدد المكالمات المستهدف يومياً
                </label>
                <input
                  type="number"
                  min="1"
                  value={targetCalls}
                  onChange={(e) => setTargetCalls(e.target.value)}
                  style={{
                    padding: '0.8rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--glass-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1.1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--theme-color)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  سيتم تطبيق هذا التارجت على جميع الموظفين في الصفحة الرئيسية لتقييم أدائهم.
                </span>
              </div>
            </div>

            <div className="form-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--theme-color)' }}>
                <Target size={24} />
                موعد بداية اليوم الجديد (الفيصل الزمني)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                <label style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '0.5rem' }}>
                  اختر وقت تجديد اليوم:
                </label>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', 
                  gap: '12px',
                  marginBottom: '1rem'
                }}>
                  {[
                    { value: '0', label: '12:00', period: 'منتصف الليل', icon: <Moon size={18} /> },
                    { value: '1', label: '1:00', period: 'صباحاً', icon: <Moon size={18} /> },
                    { value: '2', label: '2:00', period: 'صباحاً', icon: <Moon size={18} /> },
                    { value: '3', label: '3:00', period: 'صباحاً', icon: <Moon size={18} /> },
                    { value: '4', label: '4:00', period: 'صباحاً', icon: <Sunrise size={18} /> },
                    { value: '5', label: '5:00', period: 'فجراً', icon: <Sunrise size={18} /> },
                    { value: '6', label: '6:00', period: 'صباحاً', icon: <Sun size={18} /> },
                    { value: '7', label: '7:00', period: 'صباحاً', icon: <Sun size={18} /> },
                    { value: '8', label: '8:00', period: 'صباحاً', icon: <Sun size={18} /> },
                    { value: '9', label: '9:00', period: 'صباحاً', icon: <Sun size={18} /> },
                    { value: '10', label: '10:00', period: 'صباحاً', icon: <Sun size={18} /> },
                    { value: '11', label: '11:00', period: 'صباحاً', icon: <Sun size={18} /> },
                    { value: '12', label: '12:00', period: 'ظهراً', icon: <Sun size={18} /> },
                  ].map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => setLogicalDayCutoff(opt.value)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem 0.5rem',
                        borderRadius: '16px',
                        border: logicalDayCutoff === opt.value ? '2px solid var(--theme-color)' : '1px solid var(--border-color)',
                        background: logicalDayCutoff === opt.value ? 'rgba(var(--theme-color-rgb, 59, 130, 246), 0.1)' : 'var(--glass-bg)',
                        color: logicalDayCutoff === opt.value ? 'var(--theme-color)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: logicalDayCutoff === opt.value ? '0 8px 20px rgba(var(--theme-color-rgb, 59, 130, 246), 0.2)' : 'none',
                        transform: logicalDayCutoff === opt.value ? 'translateY(-3px)' : 'translateY(0)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {logicalDayCutoff === opt.value && (
                        <div style={{ position: 'absolute', top: '5px', right: '5px', color: 'var(--theme-color)' }}>
                          <CheckCircle2 size={14} />
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                        {opt.icon}
                        <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: logicalDayCutoff === opt.value ? 'var(--theme-color)' : 'var(--text-primary)' }}>
                          {opt.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>{opt.period}</span>
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--theme-color)' }}>
                  <Clock size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle', color: 'var(--theme-color)' }} />
                  أي تقرير أداء أو مكالمات يتم تسجيله قبل هذه الساعة سيُحسب لليوم الذي قبله. 
                  (يستخدم للملخصات والمكالمات فقط ولا يؤثر على وقت الحضور والانصراف الفعلي).
                </span>
              </div>
            </div>

            <div className="form-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--theme-color)' }}>
                <Clock size={24} />
                تقفيل إجباري للشيفت (Auto Checkout)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
                <label style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                  عدد الساعات المسموحة بعد انتهاء الوردية لتسجيل الانصراف التلقائي
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={autoCheckoutHours}
                  onChange={(e) => setAutoCheckoutHours(e.target.value)}
                  style={{
                    padding: '0.8rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--glass-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1.1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--theme-color)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  إذا سجل الموظف حضور ولم يسجل انصراف، سيقوم النظام تلقائياً بتسجيل انصرافه بميعاد نهاية الوردية الأصلي بعد مرور هذه الساعات من وقت انتهاء الوردية. (مثلاً: 1 ساعة).
                </span>
              </div>
            </div>

            <div className="form-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--theme-color)' }}>
                <Clock size={24} />
                الحد الأقصي المسموح به للتأخير (دقيقة)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
                <label style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                  عدد الدقائق المسموح بها قبل احتساب غرامة تأخير
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={allowedDelayMinutes}
                  onChange={(e) => setAllowedDelayMinutes(e.target.value)}
                  style={{
                    padding: '0.8rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--glass-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1.1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--theme-color)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  إذا سجل الموظف حضوره بعد مرور هذا الوقت من بداية الشفت، سيتم اعتباره متأخراً (مثال: 15 دقيقة).
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.8rem 2rem',
                  borderRadius: '12px',
                  background: 'var(--theme-color)',
                  color: 'var(--btn-text-color)',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  boxShadow: '0 4px 15px var(--theme-glow)'
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="spin" size={20} />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    حفظ التعديلات
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default GeneralSettings;
