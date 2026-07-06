import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ShieldAlert, CheckCircle, PlusCircle } from 'lucide-react';
import './ReportEditor.css';

const ReportEditor = () => {
  const cards = [
    { id: 1, title: 'تقرير الخصومات', icon: <ShieldAlert size={40} />, link: '/report-editor/discounts', color: 'red' },
    { id: 2, title: 'تقرير الجودة اليومي', icon: <CheckCircle size={40} />, link: '/report-editor/quality', color: 'green' },
    { id: 3, title: 'تقرير الصلاحيات', icon: <FileText size={40} />, link: '/report-editor/permissions', color: 'blue' },
    { id: 4, title: 'تقرير إضافي', icon: <PlusCircle size={40} />, link: '#', color: 'gray' },
  ];
useEffect(() => {
    document.title = "محرر التقارير | مخصوص";
  }, []);

  return (
    <div className="report-editor-container fade-in">
      <div className="page-header">
        <h1>محرر التقارير</h1>
        <p>اختر التقرير الذي تود تعديله أو إدارته</p>
      </div>

      <div className="reports-grid">
        {cards.map((card) => (
          <Link to={card.link} key={card.id} className={`report-card ${card.color}`}>
            <div className="report-icon">{card.icon}</div>
            <h2>{card.title}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ReportEditor;
