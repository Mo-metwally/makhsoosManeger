import React, { useEffect } from 'react';
import { ShieldAlert, Table } from 'lucide-react';
import "./ReportEditorPermissions.scss";

const ReportEditorPermissions = () => {
  useEffect(() => {
    document.title = "تقرير الاستئذانات | مخصوص";
  }, []);

  return (
    <div className="rep-container fade-in">
      <div className="rep-header">
        <div>
          <h1 className="rep-title">
            <ShieldAlert size={32} />
            <span>تقرير الاستئذانات</span>
          </h1>
          <p className="rep-subtitle mt-2 text-slate-400">إدارة ومراجعة الاستئذانات والمخالفات، سيتم إضافة الأدوات هنا.</p>
        </div>
      </div>

      <div className="rep-main-grid">
        <div className="rep-empty-state">
          <Table size={64} className="rep-empty-icon mb-6" />
          <p className="rep-empty-text">صفحة تقرير الاستئذانات قيد الإنشاء.</p>
          <p className="text-slate-500 mt-2">يرجى تحديد المتطلبات والأدوات المراد إضافتها في هذه الصفحة.</p>
        </div>
      </div>
    </div>
  );
};

export default ReportEditorPermissions;
