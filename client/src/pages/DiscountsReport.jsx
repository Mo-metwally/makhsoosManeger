import React from 'react';
import { ShieldAlert, Table } from 'lucide-react';
import './DiscountsReport.css';

const DiscountsReport = () => {
  return (
    <div className="discounts-report-container fade-in">
      <div className="dr-header">
        <div>
          <h1 className="dr-title">
            <ShieldAlert size={32} />
            <span>تقرير الخصومات</span>
          </h1>
          <p className="dr-subtitle mt-2 text-slate-400">إدارة ومراجعة الخصومات والمخالفات، سيتم إضافة الأدوات هنا.</p>
        </div>
      </div>

      <div className="dr-main-grid">
        <div className="dr-empty-state">
          <Table size={64} className="dr-empty-icon mb-6" />
          <p className="dr-empty-text">صفحة تقرير الخصومات قيد الإنشاء.</p>
          <p className="text-slate-500 mt-2">يرجى تحديد المتطلبات والأدوات المراد إضافتها في هذه الصفحة.</p>
        </div>
      </div>
    </div>
  );
};

export default DiscountsReport;
