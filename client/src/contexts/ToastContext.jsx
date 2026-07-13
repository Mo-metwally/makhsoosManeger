import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible && (
        <div 
          className={`toast-message ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`} 
          style={{ 
            position: 'fixed', 
            bottom: '2rem', 
            left: '2rem', 
            padding: '1rem 2rem', 
            background: 'var(--bg-main)', 
            border: `1px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`, 
            borderRadius: '12px', 
            color: 'var(--text-primary)', 
            zIndex: 99999, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.8rem', 
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)', 
            animation: 'slideUp 0.3s ease-out',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          {toast.type === 'success' ? <CheckCircle size={24} color="#22c55e" /> : <XCircle size={24} color="#ef4444" />}
          <span>{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  return useContext(ToastContext);
};
