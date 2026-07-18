import React, { useState, useEffect } from 'react';
import { Settings, Target, Save, Loader2, CheckCircle2, Moon, Sun, Sunrise, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './GeneralSettings.css';

const GeneralSettings = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [targetCalls, setTargetCalls] = useState('');
  const [logicalDayCutoff, setLogicalDayCutoff] = useState('5');
  const [autoCheckoutHours, setAutoCheckoutHours] = useState(localStorage.getItem('autoCheckoutHours') || '14');
  const [allowedDelayMinutes, setAllowedDelayMinutes] = useState('15');
  const [dayOffWorkMultiplier, setDayOffWorkMultiplier] = useState(localStorage.getItem('dayOffWorkMultiplier') || '1.5');
  const [absencePenaltyMultiplier, setAbsencePenaltyMultiplier] = useState(localStorage.getItem('absencePenaltyMultiplier') || '2');
  const [enableLatePenalty, setEnableLatePenalty] = useState(localStorage.getItem('enableLatePenalty') !== 'false');
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
        setDayOffWorkMultiplier(res.data.dayOffWorkMultiplier || '1.5');
        setAbsencePenaltyMultiplier(res.data.absencePenaltyMultiplier || '2');
        setEnableLatePenalty(res.data.enableLatePenalty !== 'false');
        localStorage.setItem('logicalDayCutoff', res.data.logicalDayCutoff || '5');
        localStorage.setItem('allowedDelayMinutes', res.data.allowedDelayMinutes || '15');
        localStorage.setItem('dayOffWorkMultiplier', res.data.dayOffWorkMultiplier || '1.5');
        localStorage.setItem('absencePenaltyMultiplier', res.data.absencePenaltyMultiplier || '2');
        localStorage.setItem('enableLatePenalty', res.data.enableLatePenalty || 'true');
      } else {
        setTargetCalls('30');
        setLogicalDayCutoff('5');
        setAutoCheckoutHours('1');
        setAllowedDelayMinutes('15');
        setDayOffWorkMultiplier('1.5');
        setAbsencePenaltyMultiplier('2');
        setEnableLatePenalty(true);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showToast('فشل في جلب الإعدادات الحالية', 'error');
      setTargetCalls('30');
      setLogicalDayCutoff('5');
      setAutoCheckoutHours('1');
      setAllowedDelayMinutes('15');
      setDayOffWorkMultiplier('1.5');
      setAbsencePenaltyMultiplier('2');
      setEnableLatePenalty(true);
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

      await api.put('/settings', {
        key: 'dayOffWorkMultiplier',
        value: dayOffWorkMultiplier.toString()
      });

      await api.put('/settings', {
        key: 'absencePenaltyMultiplier',
        value: absencePenaltyMultiplier.toString()
      });

      await api.put('/settings', {
        key: 'enableLatePenalty',
        value: enableLatePenalty.toString()
      });

      localStorage.setItem('logicalDayCutoff', logicalDayCutoff.toString());
      localStorage.setItem('autoCheckoutHours', autoCheckoutHours);
      localStorage.setItem('dayOffWorkMultiplier', dayOffWorkMultiplier);
      localStorage.setItem('absencePenaltyMultiplier', absencePenaltyMultiplier);
      localStorage.setItem('enableLatePenalty', enableLatePenalty);
      
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
    <div className="gs-container">
      <div className="gs-header">
        <div className="gs-header-content">
          <div className="gs-icon-wrapper">
            <Settings size={36} />
          </div>
          <div>
            <h1 className="gs-title">الإعدادات العامة</h1>
            <p className="gs-subtitle">
              إدارة الإعدادات الأساسية للنظام وتحديد الأهداف المطلوبة
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
          <Loader2 className="spin" size={40} color="#3b82f6" />
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="gs-grid">
            
            {/* Target Calls Card */}
            <div className="gs-card">
              <div className="gs-card-header">
                <div className="gs-card-icon"><Target size={24} /></div>
                <h3 className="gs-card-title">تارجت المكالمات اليومي</h3>
              </div>
              <div className="gs-input-group">
                <label className="gs-label">عدد المكالمات المستهدف يومياً للموظفين</label>
                <div className="gs-input-wrapper">
                  <input
                    type="number"
                    min="1"
                    className="gs-input"
                    value={targetCalls}
                    onChange={(e) => setTargetCalls(e.target.value)}
                  />
                </div>
                <div className="gs-hint">
                  يُستخدم هذا الهدف لتقييم أداء الموظفين في الصفحة الرئيسية.
                </div>
              </div>
            </div>

            {/* Auto Checkout Card */}
            <div className="gs-card">
              <div className="gs-card-header">
                <div className="gs-card-icon"><Clock size={24} /></div>
                <h3 className="gs-card-title">الإغلاق التلقائي للوردية</h3>
              </div>
              <div className="gs-input-group">
                <label className="gs-label">الساعات المسموحة بعد انتهاء الوردية (Auto Checkout)</label>
                <div className="gs-input-wrapper">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="gs-input"
                    value={autoCheckoutHours}
                    onChange={(e) => setAutoCheckoutHours(e.target.value)}
                  />
                </div>
                <div className="gs-hint">
                  إذا لم يُسجل الموظف انصراف، سيتم تسجيله تلقائياً بنهاية الوردية بعد هذه الساعات الإضافية (مثال: 1 يعني ساعة).
                </div>
              </div>
            </div>

            {/* Allowed Delay Minutes */}
            <div className="gs-card">
              <div className="gs-card-header">
                <div className="gs-card-icon"><AlertCircle size={24} /></div>
                <h3 className="gs-card-title">سماحية التأخير</h3>
              </div>
              <div className="gs-input-group">
                <label className="gs-label">دقائق السماح قبل احتساب التأخير</label>
                <div className="gs-input-wrapper">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="gs-input"
                    value={allowedDelayMinutes}
                    onChange={(e) => setAllowedDelayMinutes(e.target.value)}
                  />
                </div>
                
                <div className="gs-toggle-container" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>تفعيل خصم التأخير</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>في حال إيقافه، لن يتم خصم أموال بسبب التأخيرات.</span>
                  </div>
                  <label className="theme-switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
                    <input 
                      type="checkbox" 
                      checked={enableLatePenalty}
                      onChange={(e) => setEnableLatePenalty(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span className="slider round" style={{ 
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: enableLatePenalty ? 'var(--theme-color)' : 'rgba(255,255,255,0.1)', 
                      transition: '.4s', borderRadius: '34px' 
                    }}>
                      <span style={{
                        position: 'absolute', content: '""', height: '20px', width: '20px', left: enableLatePenalty ? '26px' : '4px', bottom: '4px',
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                      }}></span>
                    </span>
                  </label>
                </div>

                <div className="gs-hint" style={{ marginTop: '1rem' }}>
                  الوقت المسموح به بعد بداية الوردية. الحضور بعد هذا الوقت يُسجل تأخير (مثال: 15 دقيقة).
                </div>
              </div>
            </div>

            {/* Day Off Work Multiplier */}
            <div className="gs-card">
              <div className="gs-card-header">
                <div className="gs-card-icon"><Sun size={24} /></div>
                <h3 className="gs-card-title">مضاعف العمل بالإجازة</h3>
              </div>
              <div className="gs-input-group">
                <label className="gs-label">حساب أيام الحضور للموظف يوم إجازته</label>
                <div className="gs-input-wrapper">
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    className="gs-input"
                    value={dayOffWorkMultiplier}
                    onChange={(e) => setDayOffWorkMultiplier(e.target.value)}
                  />
                </div>
                <div className="gs-hint">
                  بكم يوم يُحسب الحضور يوم الإجازة في التصدير للإكسيل (مثال: 1.5 أو 2).
                </div>
              </div>
            </div>

            {/* Absence Penalty Multiplier */}
            <div className="gs-card">
              <div className="gs-card-header">
                <div className="gs-card-icon"><Moon size={24} /></div>
                <h3 className="gs-card-title">مضاعف خصم الغياب</h3>
              </div>
              <div className="gs-input-group">
                <label className="gs-label">بكم يوم يُخصم غياب الموظف</label>
                <div className="gs-input-wrapper">
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    className="gs-input"
                    value={absencePenaltyMultiplier}
                    onChange={(e) => setAbsencePenaltyMultiplier(e.target.value)}
                  />
                </div>
                <div className="gs-hint">
                  العقوبة المطبقة على يوم الغياب في حساب التصدير للإكسيل (مثال: 2).
                </div>
              </div>
            </div>

            {/* Logical Day Cutoff - Full Width */}
            <div className="gs-card full-width">
              <div className="gs-card-header">
                <div className="gs-card-icon"><Sunrise size={24} /></div>
                <h3 className="gs-card-title">بداية اليوم التقني (Logical Day Cutoff)</h3>
              </div>
              <div className="gs-input-group">
                <label className="gs-label">في أي ساعة نعتبر أن يوماً جديداً قد بدأ للإحصائيات؟</label>
                <div className="gs-time-grid">
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
                      className={`gs-time-option ${logicalDayCutoff === opt.value ? 'active' : ''}`}
                    >
                      {logicalDayCutoff === opt.value && (
                        <div style={{ position: 'absolute', top: '5px', right: '5px' }}>
                          <CheckCircle2 size={14} />
                        </div>
                      )}
                      {opt.icon}
                      <span className="gs-time-val">{opt.label}</span>
                      <span className="gs-time-period">{opt.period}</span>
                    </div>
                  ))}
                </div>
                <div className="gs-hint" style={{ marginTop: '1.5rem' }}>
                  أي تقرير أداء يتم تسجيله قبل هذه الساعة يُحسب لليوم الذي قبله. 
                  هذا الخيار يُستخدم لتقفيل يوم المكالمات للموظفين الذين يعملون ليلاً بعد منتصف الليل.
                </div>
              </div>
            </div>

          </div>

          <div className="gs-save-wrapper" style={{ 
            position: 'fixed', 
            bottom: '2rem', 
            left: '2rem', 
            zIndex: 1000 
          }}>
            <button
              type="submit"
              disabled={saving}
              className="gs-save-btn"
              style={{
                boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                padding: '1rem 2rem',
                borderRadius: '50px',
                fontSize: '1.1rem'
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
                  حفظ إعدادات النظام
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default GeneralSettings;
