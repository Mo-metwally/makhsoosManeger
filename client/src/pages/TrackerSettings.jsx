import './TrackerSettings.scss';
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
        <div className="glass-panel trackersettings-style-1" >
          <h2 className="trackersettings-style-2">غير مصرح لك بالدخول لهذه الصفحة. (صلاحية مدير تنفيذي فقط)</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="general-settings-container">
      <div className="page-title-wrapper">
        <Activity size={32} className="title-icon trackersettings-style-3"  />
        <div>
          <h1 className="gradient-title">إعدادات متتبع النشاط (Tracker)</h1>
          <p className="trackersettings-style-4">
            التحكم الشامل في أداة تتبع الأجهزة، معدلات الفحص، وحدود الخمول.
          </p>
        </div>
      </div>

      <div className="glass-panel fade-in trackersettings-style-5" >
        {loading ? (
          <div className="trackersettings-style-6">
            <Loader2 className="spin" size={32} color="var(--theme-color)" />
          </div>
        ) : (
          <form onSubmit={handleSave}>
            
            {/* Enable/Disable Tracker */}
            <div className="form-section trackersettings-style-7" >
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: enableTracking ? '#22c55e' : '#ef4444' }}>
                <Monitor size={24} />
                حالة نظام التتبع
              </h3>
              
              <div className="trackersettings-style-8">
                <label className="switch trackersettings-style-9" >
                  <input 
                    type="checkbox" 
                    checked={enableTracking} 
                    onChange={(e) => setEnableTracking(e.target.checked)} 
                    className="trackersettings-style-10"
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
                  <span className="trackersettings-style-11">
                    {enableTracking ? 'التتبع مفعل (قيد التشغيل)' : 'التتبع متوقف (معطل عالمياً)'}
                  </span>
                  <p className="trackersettings-style-12">
                    عند الإيقاف، ستتوقف جميع تطبيقات التتبع لدى الموظفين عن إرسال أي بيانات للسيرفر.
                  </p>
                </div>
              </div>
            </div>

            {/* Idle Threshold */}
            <div className="form-section trackersettings-style-13" >
              <h3 className="trackersettings-style-14">
                <Clock size={24} />
                الحد الأقصى للخمول (Idle Threshold)
              </h3>
              
              <div className="trackersettings-style-15">
                <label className="trackersettings-style-16">
                  مدة التوقف بالدقائق لاحتساب خمول
                </label>
                <div className="trackersettings-style-17">
                  <input
                    type="number"
                    min="1"
                    value={idleThresholdMins}
                    onChange={(e) => setIdleThresholdMins(e.target.value)}
                    className="trackersettings-style-18"
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                  <span className="trackersettings-style-19">دقيقة</span>
                </div>
                <span className="trackersettings-style-20">
                  يبدأ البرنامج في اعتبار الموظف (خامل) بعد هذه المدة من عدم تحريك الماوس.
                </span>
              </div>
            </div>

            {/* Allowed Idle Threshold */}
            <div className="form-section trackersettings-style-21" >
              <h3 className="trackersettings-style-22">
                <Clock size={24} />
                الحد الأقصى للخمول المسموح به
              </h3>
              
              <div className="trackersettings-style-23">
                <label className="trackersettings-style-24">
                  المدة الإضافية المسموحة قبل تسجيل الخمول بالدقائق
                </label>
                <div className="trackersettings-style-25">
                  <input
                    type="number"
                    min="0"
                    value={allowedIdleThresholdMins}
                    onChange={(e) => setAllowedIdleThresholdMins(e.target.value)}
                    className="trackersettings-style-26"
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                  <span className="trackersettings-style-27">دقيقة</span>
                </div>
                <span className="trackersettings-style-28">
                  إذا توقف الموظف لمدة (الحد الأقصى للخمول + المسموح به)، سيتم تسجيل الخمول. مثلاً: 5 + 5 = 10 دقائق لتسجيل الخمول.
                </span>
              </div>
            </div>

            {/* Check Interval */}
            <div className="form-section trackersettings-style-29" >
              <h3 className="trackersettings-style-30">
                <Zap size={24} />
                معدل الفحص الدوري (Check Interval)
              </h3>
              
              <div className="trackersettings-style-31">
                <label className="trackersettings-style-32">
                  معدل قراءة الأداة لنشاط الجهاز بالثواني
                </label>
                <div className="trackersettings-style-33">
                  <input
                    type="number"
                    min="1"
                    value={checkIntervalSecs}
                    onChange={(e) => setCheckIntervalSecs(e.target.value)}
                    className="trackersettings-style-34"
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                  <span className="trackersettings-style-35">ثانية</span>
                </div>
                <span className="trackersettings-style-36">
                  يُنصح بوضع ثانية واحدة للحصول على أدق قراءة ممكنة. زيادة الرقم توفر استهلاك طفيف في الذاكرة ولكن قد تقلل من دقة التتبع.
                </span>
              </div>
            </div>

            <div className="trackersettings-style-37">
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
