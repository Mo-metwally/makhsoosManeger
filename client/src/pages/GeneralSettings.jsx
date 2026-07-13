import React, { useState, useEffect } from 'react';
import { Settings, Target, Save, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';

const GeneralSettings = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [targetCalls, setTargetCalls] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "الإعدادات العامة | مخصوص";
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings?key=dailyCallsTarget');
      if (res.data && res.data.dailyCallsTarget) {
        setTargetCalls(res.data.dailyCallsTarget);
      } else {
        setTargetCalls('30'); // Default fallback
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showToast('فشل في جلب الإعدادات الحالية', 'error');
      setTargetCalls('30');
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
