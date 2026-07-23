import './NotFound.scss';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ghost, Home } from 'lucide-react';

const NotFound = () => {
  useEffect(() => {
    document.title = "صفحة غير موجودة | مخصوص";
  }, []);

  return (
    <div className="notfound-style-1">
      <div className="notfound-style-2">
        <Ghost size={120} strokeWidth={1} />
      </div>
      
      <h1 className="notfound-style-3">
        404
      </h1>
      
      <h2 className="notfound-style-4">
        أوبس! الصفحة التي تبحث عنها غير موجودة
      </h2>
      
      <p className="notfound-style-5">
        يبدو أنك دخلت في رابط خاطئ أو أن الصفحة تم نقلها. لا تقلق، يمكنك العودة دائماً إلى الصفحة الرئيسية.
      </p>

      <Link to="/" className="btn-save notfound-style-6" >
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
