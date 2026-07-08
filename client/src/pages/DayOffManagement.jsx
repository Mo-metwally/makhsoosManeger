import React, { useState, useEffect } from 'react';
import { CalendarDays, CheckCircle, XCircle, Clock, ShieldAlert, Users, ChevronDown, ChevronLeft, Calendar } from 'lucide-react';
import api from '../services/api';
import './DayOffManagement.css';

const DayOffManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [expandedUserIds, setExpandedUserIds] = useState(new Set());

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dayoff/all');
      setRequests(res.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      alert('حدث خطأ أثناء جلب بيانات الإجازات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "إدارة الإجازات | مخصوص";
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    if (!window.confirm(`هل أنت متأكد من ${status === 'Approved' ? 'الموافقة على' : 'رفض'} هذا الطلب؟`)) return;
    
    try {
      await api.put(`/dayoff/${id}/status`, { status });
      fetchRequests();
    } catch (error) {
      alert('حدث خطأ أثناء تحديث حالة الطلب');
    }
  };

  const filteredRequests = statusFilter === 'All' 
    ? requests 
    : requests.filter(r => r.status === statusFilter);

  const groupedRequests = Object.values(
    filteredRequests.reduce((acc, req) => {
      if (!acc[req.userId]) {
        acc[req.userId] = {
          user: req.User,
          userId: req.userId,
          requests: []
        };
      }
      acc[req.userId].requests.push(req);
      return acc;
    }, {})
  ).sort((a, b) => {
    // Sort groups by the most recent request in that group
    const latestA = new Date(a.requests[0].createdAt).getTime();
    const latestB = new Date(b.requests[0].createdAt).getTime();
    return latestB - latestA;
  });

  const toggleExpand = (userId) => {
    setExpandedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <div className="dom-container fade-in">
      <div className="dom-header">
        <div>
          <h1 className="dom-title">
            <Calendar size={32} className="dom-title-icon" />
            طلبات الإجازات
          </h1>
          <p className="dom-subtitle">مراجعة واعتماد أو رفض طلبات الإجازة للموظفين</p>
        </div>
        <div className="dom-filters-group">
          <button 
            className={`dom-filter-btn ${statusFilter === 'All' ? 'active-all' : ''}`} 
            onClick={() => setStatusFilter('All')}
          >
            جميع الطلبات
          </button>
          <button 
            className={`dom-filter-btn ${statusFilter === 'Pending' ? 'active-pending' : ''}`} 
            onClick={() => setStatusFilter('Pending')}
          >
            طلبات معلقة
          </button>
          <button 
            className={`dom-filter-btn ${statusFilter === 'Approved' ? 'active-approved' : ''}`} 
            onClick={() => setStatusFilter('Approved')}
          >
            طلبات مقبولة
          </button>
          <button 
            className={`dom-filter-btn ${statusFilter === 'Rejected' ? 'active-rejected' : ''}`} 
            onClick={() => setStatusFilter('Rejected')}
          >
            طلبات مرفوضة
          </button>
        </div>
      </div>

      <div className="dom-section">
        <h2 className="dom-section-title">
          {statusFilter === 'Pending' ? <ShieldAlert className="text-orange-500" /> : <Users className="text-blue-500" />}
          قائمة الطلبات ({filteredRequests.length})
        </h2>

        {loading ? (
          <p>جاري التحميل...</p>
        ) : filteredRequests.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>لا توجد طلبات تطابق الفلتر الحالي.</p>
        ) : (
          <div className="dom-table-wrapper">
            <table className="dom-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>الموظف</th>
                  <th>نظام الوردية والإجازات</th>
                  <th>إجمالي الطلبات</th>
                  <th className="text-orange-500">معلق</th>
                  <th className="text-green-500">مقبول</th>
                  <th className="text-red-500">مرفوض</th>
                </tr>
              </thead>
              <tbody>
                {groupedRequests.map(group => {
                  const pendingCount = group.requests.filter(r => r.status === 'Pending').length;
                  const approvedCount = group.requests.filter(r => r.status === 'Approved').length;
                  const rejectedCount = group.requests.filter(r => r.status === 'Rejected').length;
                  const isExpanded = expandedUserIds.has(group.userId);

                  return (
                    <React.Fragment key={group.userId}>
                      <tr className="dom-group-row" onClick={() => toggleExpand(group.userId)}>
                        <td>
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronLeft size={20} />}
                        </td>
                        <td>
                          <div><strong>{group.user?.fullName}</strong></div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{group.user?.username}</div>
                        </td>
                        <td>
                          {group.user?.Shifts && group.user.Shifts.length > 0 ? (
                            group.user.Shifts.map(s => (
                              <div key={s.id} style={{ marginBottom: '0.3rem', background: 'var(--glass-bg)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'inline-block', minWidth: '160px', textAlign: 'right' }}>
                                <div style={{ color: 'var(--theme-color)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{s.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  نظام: {s.dayOffType === 'Fixed' ? 'أيام ثابتة' : 'متغير'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {s.dayOffType === 'Fixed' 
                                    ? 'حسب إعدادات الوردية' 
                                    : `المسموح: ${s.variableDaysOffCount || 0} أيام شهرياً`}
                                </div>
                              </div>
                            ))
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>غير معين بوردية</span>
                          )}
                        </td>
                        <td style={{fontWeight: 'bold'}}>{group.requests.length}</td>
                        <td className="text-orange-500">{pendingCount}</td>
                        <td className="text-green-500">{approvedCount}</td>
                        <td className="text-red-500">{rejectedCount}</td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0, border: 'none' }}>
                            <div className="dom-expanded-content fade-in">
                              <table className="dom-inner-table">
                                <thead>
                                  <tr>
                                    <th>تاريخ الإجازة</th>
                                    <th>اليوم</th>
                                    <th>السبب</th>
                                    <th>تاريخ التقديم</th>
                                    <th>الحالة</th>
                                    <th>إجراء</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.requests.map(r => (
                                    <tr key={r.id}>
                                      <td>{r.date}</td>
                                      <td>{r.dayName}</td>
                                      <td>{r.reason || <span style={{color:'var(--text-secondary)'}}>لا يوجد</span>}</td>
                                      <td dir="ltr" style={{textAlign: 'right'}}>{new Date(r.createdAt).toLocaleString('ar-EG')}</td>
                                      <td>
                                        <span className={`dom-badge ${r.status.toLowerCase()}`}>
                                          {r.status === 'Pending' ? 'معلق' : r.status === 'Approved' ? 'مقبول' : 'مرفوض'}
                                        </span>
                                      </td>
                                      <td className="dom-actions">
                                        {r.status === 'Pending' && (
                                          <>
                                            <button 
                                              className="dom-btn dom-btn-approve" 
                                              title="موافقة"
                                              onClick={() => handleStatusUpdate(r.id, 'Approved')}
                                            >
                                              <CheckCircle size={20} />
                                            </button>
                                            <button 
                                              className="dom-btn dom-btn-reject" 
                                              title="رفض"
                                              onClick={() => handleStatusUpdate(r.id, 'Rejected')}
                                            >
                                              <XCircle size={20} />
                                            </button>
                                          </>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayOffManagement;
