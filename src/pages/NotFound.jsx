import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ghost, Home } from 'lucide-react';

const NotFound = () => {
  useEffect(() => {
    document.title = "صفحة غير موجودة | مخصوص";
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      width: '100%',
      textAlign: 'center'
    }}>
      <div style={{
        animation: 'float 3s ease-in-out infinite',
        color: 'var(--theme-color)',
        marginBottom: '2rem'
      }}>
        <Ghost size={120} strokeWidth={1} />
      </div>
      
      <h1 style={{
        fontSize: '4rem',
        fontWeight: '900',
        background: 'linear-gradient(to right, var(--theme-color), var(--theme-glow))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '1rem',
        lineHeight: '1'
      }}>
        404
      </h1>
      
      <h2 style={{
        color: 'var(--text-primary)',
        fontSize: '1.8rem',
        marginBottom: '1rem'
      }}>
        أوبس! الصفحة التي تبحث عنها غير موجودة
      </h2>
      
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '1.1rem',
        marginBottom: '2.5rem',
        maxWidth: '500px',
        lineHeight: '1.6'
      }}>
        يبدو أنك دخلت في رابط خاطئ أو أن الصفحة تم نقلها. لا تقلق، يمكنك العودة دائماً إلى الصفحة الرئيسية.
      </p>

      <Link to="/" className="btn-save" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '1rem 2rem',
        fontSize: '1.2rem',
        textDecoration: 'none'
      }}>
        <Home size={22} />
        <span>العودة للرئيسية</span>
      </Link>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
