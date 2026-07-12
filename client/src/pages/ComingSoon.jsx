import React from 'react';
import { Settings, Wrench } from 'lucide-react';

const ComingSoon = ({ title = "قريباً" }) => {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', textAlign: 'center' }}>
      <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem', boxShadow: '0 0 30px rgba(249, 115, 22, 0.2)' }}>
        <Wrench size={64} style={{ color: 'var(--theme-color)' }} />
      </div>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)' }}>{title}</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '500px', lineHeight: '1.6' }}>
        هذه الصفحة قيد التطوير حالياً، وسوف يتم إتاحتها في التحديثات القادمة بإذن الله. 🚀
      </p>
    </div>
  );
};

export default ComingSoon;
