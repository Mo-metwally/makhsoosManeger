import React, { useState, useEffect } from 'react';
import { Activity, Save, Loader2, Clock, Zap, ShieldAlert, Monitor } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';

const TrackerSettings = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [idleThresholdMins, setIdleThresholdMins] = useState('5');
  const [allowedIdleThresholdMins, setAllowedIdleThresholdMins] = useState('5');
  const [checkIntervalSecs, setCheckIntervalSecs] = useState('1');
  const [enableTracking, setEnableTracking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "إعدادات التراكر | مخصوص";
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings'); // fetch all settings
      if (res.data) {
        // Convert from ms to user-friendly units (mins/secs)
        if (res.data.tracker_idleThresholdMs) {
          setIdleThresholdMins((parseInt(res.data.tracker_idleThresholdMs) / 60000).toString());
        }
        if (res.data.tracker_allowedIdleThresholdMs) {
          setAllowedIdleThresholdMins((parseInt(res.data.tracker_allowedIdleThresholdMs) / 60000).toString());
        }
        if (res.data.tracker_checkIntervalMs) {
          setCheckIntervalSecs((parseInt(res.data.tracker_checkIntervalMs) / 1000).toString());
        }
        if (res.data.tracker_enable !== undefined) {
          setEnableTracking(res.data.tracker_enable === 'true');
        }
      }
    } catch (error) {
      console.error('Error fetching tracker settings:', error);
      showToast('فشل في جلب إعدادات التراكر الحالية', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!idleThresholdMins || isNaN(idleThresholdMins) || Number(idleThresholdMins) < 1) {
      showToast('يرجى إدخال حد أدنى صالح للخمول (دقيقة واحدة على الأقل)', 'error');
      return;
    }
    if (!allowedIdleThresholdMins || isNaN(allowedIdleThresholdMins) || Number(allowedIdleThresholdMins) < 0) {
      showToast('يرجى إدخال حد أقصى صالح للخمول المسموح به', 'error');
      return;
    }
    if (!checkIntervalSecs || isNaN(checkIntervalSecs) || Number(checkIntervalSecs) < 1) {
      showToast('يرجى إدخال معدل فحص صالح (ثانية واحدة على الأقل)', 'error');
      return;
    }

    try {
      setSaving(true);
      
      const thresholdMs = (Number(idleThresholdMins) * 60000).toString();
      const allowedThresholdMs = (Number(allowedIdleThresholdMins) * 60000).toString();
      const intervalMs = (Number(checkIntervalSecs) * 1000).toString();

      await api.put('/settings', {
        key: 'tracker_idleThresholdMs',
        value: thresholdMs
      });

      await api.put('/settings', {
        key: 'tracker_allowedIdleThresholdMs',
        value: allowedThresholdMs
      });

      await api.put('/settings', {
        key: 'tracker_checkIntervalMs',
        value: intervalMs
      });

      await api.put('/settings', {
        key: 'tracker_enable',
        value: enableTracking.toString()
      });

      showToast('تم حفظ إعدادات التراكر بنجاح', 'success');
    } catch (error) {
      console.error('Error saving tracker settings:', error);
      showToast('فشل في حفظ إعدادات التراكر', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Only allow Super Admin
  if (user && user.role !== 'SuperAdmin') {
    return (
      <div className="general-settings-container">
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>غير مصرح لك بالدخول لهذه الصفحة. (صلاحية مدير تنفيذي فقط)</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="general-settings-container">
      <div className="page-title-wrapper">
        <Activity size={32} className="title-icon" style={{ color: '#22c55e' }} />
        <div>
          <h1 className="gradient-title">إعدادات متتبع النشاط (Tracker)</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            التحكم الشامل في أداة تتبع الأجهزة، معدلات الفحص، وحدود الخمول.
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
            
            {/* Enable/Disable Tracker */}
            <div className="form-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: enableTracking ? '#22c55e' : '#ef4444' }}>
                <Monitor size={24} />
                حالة نظام التتبع
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                  <input 
                    type="checkbox" 
                    checked={enableTracking} 
                    onChange={(e) => setEnableTracking(e.target.checked)} 
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider round" style={{ 
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: enableTracking ? '#22c55e' : '#ef4444', 
                    transition: '.4s', borderRadius: '34px' 
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '26px', width: '26px', left: '4px', bottom: '4px',
                      backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                      transform: enableTracking ? 'translateX(26px)' : 'translateX(0)'
                    }}></span>
                  </span>
                </label>
                <div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {enableTracking ? 'التتبع مفعل (قيد التشغيل)' : 'التتبع متوقف (معطل عالمياً)'}
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    عند الإيقاف، ستتوقف جميع تطبيقات التتبع لدى الموظفين عن إرسال أي بيانات للسيرفر.
                  </p>
                </div>
              </div>
            </div>

            {/* Idle Threshold */}
            <div className="form-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--theme-color)' }}>
                <Clock size={24} />
                الحد الأقصى للخمول (Idle Threshold)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
                <label style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                  مدة التوقف بالدقائق لاحتساب خمول
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="1"
                    value={idleThresholdMins}
                    onChange={(e) => setIdleThresholdMins(e.target.value)}
                    style={{
                      padding: '0.8rem 1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--glass-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '1.1rem',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                      width: '100%',
                      paddingLeft: '60px'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                  <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>دقيقة</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  يبدأ البرنامج في اعتبار الموظف (خامل) بعد هذه المدة من عدم تحريك الماوس.
                </span>
              </div>
            </div>

            {/* Allowed Idle Threshold */}
            <div className="form-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--theme-color)' }}>
                <Clock size={24} />
                الحد الأقصى للخمول المسموح به
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
                <label style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                  المدة الإضافية المسموحة قبل تسجيل الخمول بالدقائق
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    value={allowedIdleThresholdMins}
                    onChange={(e) => setAllowedIdleThresholdMins(e.target.value)}
                    style={{
                      padding: '0.8rem 1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--glass-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '1.1rem',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                      width: '100%',
                      paddingLeft: '60px'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                  <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>دقيقة</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  إذا توقف الموظف لمدة (الحد الأقصى للخمول + المسموح به)، سيتم تسجيل الخمول. مثلاً: 5 + 5 = 10 دقائق لتسجيل الخمول.
                </span>
              </div>
            </div>

            {/* Check Interval */}
            <div className="form-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--theme-color)' }}>
                <Zap size={24} />
                معدل الفحص الدوري (Check Interval)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
                <label style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                  معدل قراءة الأداة لنشاط الجهاز بالثواني
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="1"
                    value={checkIntervalSecs}
                    onChange={(e) => setCheckIntervalSecs(e.target.value)}
                    style={{
                      padding: '0.8rem 1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--glass-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '1.1rem',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                      width: '100%',
                      paddingLeft: '60px'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                  <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>ثانية</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  يُنصح بوضع ثانية واحدة للحصول على أدق قراءة ممكنة. زيادة الرقم توفر استهلاك طفيف في الذاكرة ولكن قد تقلل من دقة التتبع.
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

export default TrackerSettings;
