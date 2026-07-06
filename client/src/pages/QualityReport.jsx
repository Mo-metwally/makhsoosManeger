import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { Download, Upload, EyeOff, Eye, Search, Table, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import './QualityReport.css';

const defaultIds = [''];

const QualityReport = () => {
  const [ids, setIds] = useState(defaultIds);
  const [idColumnName, setIdColumnName] = useState('');
  
  // Data states
  const [rawData, setRawData] = useState([]); // Array of objects
  const [columns, setColumns] = useState([]); // Array of headers
  const [visibleColumns, setVisibleColumns] = useState(new Set()); // Set of headers
  const [filteredData, setFilteredData] = useState([]); // Processed rows
  const [fileName, setFileName] = useState('');
  const [rowColors, setRowColors] = useState({}); // { rowIndex: colorHex }
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const availableColors = [
    { label: 'أخضر', value: '#22c55e', btnClass: 'qr-color-btn green' },
    { label: 'أحمر', value: '#ef4444', btnClass: 'qr-color-btn red' },
    { label: 'أصفر', value: '#eab308', btnClass: 'qr-color-btn yellow' },
    { label: 'إزالة اللون', value: 'transparent', btnClass: 'qr-color-btn clear' }
  ];

  const handleIdChange = (index, value) => {
    const newIds = [...ids];
    newIds[index] = value;
    // Add a new empty row if the last row is filled, just to make manual typing easier
    if (index === newIds.length - 1 && value.trim() !== '') {
      newIds.push('');
    }
    setIds(newIds);
  };

  const handlePaste = (e, index) => {
    const pasteData = e.clipboardData.getData('text');
    if (pasteData) {
      // Split by newline or tab
      const pastedIds = pasteData.split(/\r?\n|\t/).map(id => id.trim()).filter(id => id !== '');
      if (pastedIds.length > 1) {
        e.preventDefault(); // Prevent default paste behavior
        const newIds = [...ids];
        // Replace from the current index with pasted data
        newIds.splice(index, 1, ...pastedIds);
        // Ensure there's one empty at the end for manual entry
        if (newIds[newIds.length - 1] !== '') {
          newIds.push('');
        }
        setIds(newIds);
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      if (ws) {
        // Fix for third-party generated Excel files that have an incorrect !ref
        let minR = 10000000, minC = 10000000, maxR = -1, maxC = -1;
        let hasCells = false;
        Object.keys(ws).forEach(key => {
          if (key.startsWith('!')) return;
          const cell = XLSX.utils.decode_cell(key);
          if (cell.r < minR) minR = cell.r;
          if (cell.c < minC) minC = cell.c;
          if (cell.r > maxR) maxR = cell.r;
          if (cell.c > maxC) maxC = cell.c;
          hasCells = true;
        });
        
        if (hasCells) {
          ws['!ref'] = XLSX.utils.encode_range({ s: { c: minC, r: minR }, e: { c: maxC, r: maxR } });
        }

        // Convert to array of objects directly
        const objectData = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        if (objectData.length > 0) {
          // Extract all unique keys from the parsed objects
          // This perfectly handles duplicate headers (which xlsx names as _1, _2) and avoids missing headers
          const headerSet = new Set();
          objectData.forEach(row => {
            Object.keys(row).forEach(key => headerSet.add(key));
          });
          
          const headers = Array.from(headerSet);
          
          setColumns(headers);
          setVisibleColumns(new Set(headers)); // All visible by default
          setRawData(objectData);
          setFilteredData([]);
          setRowColors({});
          setSelectedRows(new Set());
        } else {
          setColumns([]);
          setVisibleColumns(new Set());
          setRawData([]);
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const toggleColumn = (col) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(col)) {
      newVisible.delete(col);
    } else {
      newVisible.add(col);
    }
    setVisibleColumns(newVisible);
  };

  const syncData = () => {
    if (rawData.length === 0 || columns.length === 0) return;

    let targetCol = idColumnName.trim();
    if (!targetCol) {
      // Default to the second column if available, else first
      targetCol = columns.length > 1 ? columns[1] : columns[0];
    }

    const newFilteredData = [];
    
    // Sort and filter based on the order of IDs
    ids.forEach(id => {
      const cleanId = String(id).trim();
      if (!cleanId) return; // Skip empty
      
      // Find row where the target column matches the ID
      const row = rawData.find(r => {
        let cellVal = String(r[targetCol] || '').trim();
        if (cellVal.startsWith("'")) cellVal = cellVal.substring(1);
        return cellVal === cleanId;
      });
      if (row) {
        newFilteredData.push(row);
      } else {
        // VLOOKUP behavior: keep the row but mark data as not found
        const emptyRow = {};
        columns.forEach(col => {
          emptyRow[col] = (col === targetCol) ? cleanId : '---';
        });
        newFilteredData.push(emptyRow);
      }
    });

    setFilteredData(newFilteredData);
  };

  // Auto-sync on initial file load
  useEffect(() => {
    syncData();
  }, [rawData, columns]);

  const exportExcel = () => {
    if (filteredData.length === 0) return;

    // Filter the objects to only include visible columns
    const exportData = filteredData.map(row => {
      const newRow = {};
      columns.forEach(col => {
        if (visibleColumns.has(col)) {
          newRow[col] = row[col];
        }
      });
      return newRow;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Style the header row and apply row colors
    const range = XLSX.utils.decode_range(ws['!ref']);
    for(let R = range.s.r; R <= range.e.r; ++R) {
      for(let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ c: C, r: R });
        if(!ws[address]) continue;
        
        if (R === 0) {
          // Header styles
          ws[address].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F46E5" } }, // Indigo-600
            alignment: { horizontal: "center" }
          };
        } else {
          // Data row styles (R is 1-indexed for data, corresponding to filteredData[R-1])
          const rowIndex = R - 1;
          const color = rowColors[rowIndex];
          if (color && color !== 'transparent') {
            // Remove the '#' from hex color for xlsx
            const hexColor = color.replace('#', '');
            ws[address].s = {
              fill: { fgColor: { rgb: hexColor } }
            };
          }
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الجودة");
    
    // Generate file name with current date
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const outputFileName = `تقرير_الجودة_المفلتر_${dateStr}.xlsx`;
    
    XLSX.writeFile(wb, outputFileName);
  };

  const handleSelectRow = (index) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAllRows = () => {
    if (selectedRows.size === filteredData.length) {
      setSelectedRows(new Set());
    } else {
      const allIndices = filteredData.map((_, i) => i);
      setSelectedRows(new Set(allIndices));
    }
  };

  const applyColorToSelected = (color) => {
    if (selectedRows.size === 0) return;
    const newColors = { ...rowColors };
    selectedRows.forEach(index => {
      newColors[index] = color;
    });
    setRowColors(newColors);
    setSelectedRows(new Set()); // Deselect after coloring
  };

  return (
    <div className="quality-report-container fade-in">
      <div className="qr-header">
        <div>
          <h1 className="qr-title">
            <Table size={32} />
            <span>محرر تقارير الجودة المتقدم</span>
          </h1>
          <p className="qr-subtitle mt-2 text-slate-400">قم بتحديد المعرفات وترتيبها، وارفع الملف لسحب وتصفية البيانات بدقة.</p>
        </div>
        <div className="qr-header-actions">
          <button className="qr-export-btn" onClick={exportExcel} disabled={filteredData.length === 0}>
            <Download size={20} />
            <span>تحميل التقرير النهائي</span>
          </button>
        </div>
      </div>

      <div className="qr-top-toolbar">
        <button 
          className="qr-toggle-sidebar-btn" 
          onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        >
          {isSidebarVisible ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          <span>{" "}{isSidebarVisible ? ' إخفاء شريط الأدوات ' : ' إظهار شريط الأدوات '}</span>
        </button>
      </div>
      <br />

      <div className={`qr-main-grid ${!isSidebarVisible ? 'sidebar-hidden' : ''}`}>
        {/* Left Sidebar: Configurations */}
        {isSidebarVisible && (
          <div className="qr-sidebar">
          
          <div className="qr-section">
            <h3 className="qr-section-title"><Upload size={18}/> رفع ملف الإكسيل</h3>
              <label className="qr-file-upload">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleFileUpload} 
                  id="excel-upload"
                  className="hidden"
                  hidden
                />
                <Upload size={48} className="qr-upload-icon mb-2" />
                <div className="qr-upload-text">
                  {fileName ? fileName : 'اسحب أو اضغط لرفع ملف الإكسيل'}
                </div>
                {!fileName && <span className="text-xs text-indigo-300 mt-2">يدعم صيغ .xlsx و .xls</span>}
              </label>
          </div>

          <div className="qr-section">
            <h3 className="qr-section-title"><Search size={20}/> إعدادات عمود المعرفات</h3>
            <div className="qr-input-group">
              <label className="text-sm font-semibold text-slate-300 mb-2 block">اسم عمود المعرفات في الإكسيل (اختياري):</label>
              <input 
                type="text" 
                placeholder="مثال: رقم الهوية، ID، المعرف..." 
                value={idColumnName}
                onChange={(e) => setIdColumnName(e.target.value)}
                className="qr-field"
              />
            </div>
            <p className="qr-hint mt-2">
              💡 <strong>ملاحظة:</strong> اتركه فارغاً لاعتماد <strong>العمود الثاني</strong> كافتراضي.
            </p>
          </div>

          <div class="qr-section">
            <h3 className="qr-section-title"><Settings size={20}/> المعرفات (بالترتيب المطلوب)</h3>
            <p className="qr-hint mb-3">يمكنك نسخ عمود المعرفات من الإكسيل ولصقه في الحقل أدناه ليتم استخراجها وترتيبها تلقائياً.</p>
            <div className="qr-ids-grid">
              {ids.map((id, index) => (
                <div key={index} className="qr-id-item">
                  <span className="qr-id-number">{index + 1}</span>
                  <input 
                    type="text" 
                    value={id} 
                    onChange={(e) => handleIdChange(index, e.target.value)}
                    onPaste={(e) => handlePaste(e, index)}
                    className="qr-input"
                    placeholder={`معرف ${index + 1}`}
                  />
                  {ids.length > 1 && (
                    <button 
                      className="text-red-400 hover:text-red-500 transition-colors p-1"
                      onClick={() => {
                        const newIds = ids.filter((_, i) => i !== index);
                        if(newIds.length === 0) newIds.push('');
                        setIds(newIds);
                      }}
                      title="حذف المعرف"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
            {ids.length > 1 && (
              <button 
                className="mt-4 text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors"
                onClick={() => setIds([''])}
              >
                مسح كافة المعرفات
              </button>
            )}
          </div>
          </div>
        )}

        {/* Right Area: Columns and Preview */}
        <div className="qr-content">
          
          {columns.length > 0 && (
            <div className="qr-panel">
              <div className="qr-panel-header">
                <h3 className="qr-section-title !mb-0 !border-0 !pb-0"><Eye size={18}/> التحكم في الأعمدة</h3>
                <div className="qr-btn-group">
                  <button 
                    onClick={() => setVisibleColumns(new Set(columns))}
                    className="qr-select-btn"
                  >
                    تحديد الكل
                  </button>
                  <button 
                    onClick={() => setVisibleColumns(new Set())}
                    className="qr-deselect-btn"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>  <br />
              <div className="qr-columns-list">
                {columns.map((col, index) => (
                  <label key={col} className={`qr-column-checkbox ${visibleColumns.has(col) ? 'active' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.has(col)} 
                      onChange={() => toggleColumn(col)} 
                    />
                    <span className="qr-col-index">{index + 1}</span>
                    <span className="qr-col-name">{col}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="qr-panel qr-panel-flex">
            <div className="qr-panel-header mb-6">
              <h3 className="qr-section-title !mb-0 !border-0 !pb-0"><Table size={18}/> معاينة البيانات ({filteredData.length} صف متطابق)</h3>
              
              {/* Color Controls Toolbar */}
              {filteredData.length > 0 && (
                <div className="qr-color-toolbar">
                  <span className="qr-color-toolbar-label">
                    {selectedRows.size > 0 ? `تم تحديد (${selectedRows.size})` : 'لون الصفوف المحددة:'}
                  </span>
                  <div className="qr-btn-group">
                    {availableColors.map(color => (
                      <button
                        key={color.value}
                        onClick={() => applyColorToSelected(color.value)}
                        disabled={selectedRows.size === 0}
                        className={color.btnClass}
                        title={color.label}
                      >
                        {color.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={syncData}
                className="qr-sync-btn"
                disabled={rawData.length === 0}
              >
                <Settings size={18} />
                مزامنة البيانات
              </button>
            </div>

            {filteredData.length > 0 || ids.filter(id => id.trim() !== '').length > 0 ? (
              <div className="qr-table-container">
                <table className="qr-table">
                  <thead>
                    <tr>
                      <th className="qr-table-checkbox-col">
                        <input 
                          type="checkbox" 
                          className="qr-row-checkbox"
                          checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                          onChange={handleSelectAllRows}
                        />
                      </th>
                      <th className="qr-table-index">#</th>
                      {columns.filter(col => visibleColumns.has(col)).map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, index) => {
                      const rowColor = rowColors[index] || 'transparent';
                      const isColored = rowColor !== 'transparent';
                      const isSelected = selectedRows.has(index);
                      
                      return (
                        <tr 
                          key={index} 
                          onClick={() => handleSelectRow(index)}
                          style={{ 
                            backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.1)' : (isColored ? `${rowColor}15` : 'transparent'),
                            borderLeft: isColored ? `4px solid ${rowColor}` : '4px solid transparent'
                          }}
                          className={`transition-all duration-200 cursor-pointer ${isSelected ? 'border-indigo-500' : ''}`}
                        >
                          <td className="qr-table-checkbox-col" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="qr-row-checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(index)}
                            />
                          </td>
                          <td className="qr-table-index font-bold text-indigo-500">{index + 1}</td>
                          {columns.filter(col => visibleColumns.has(col)).map(col => (
                            <td key={col}>{row[col]}</td>
                          ))}
                        </tr>
                      );
                    })}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={columns.length + 2} className="qr-table-empty">
                          <div className="qr-empty-content">
                            <Table size={48} className="qr-empty-icon" />
                            <span>يرجى رفع ملف الإكسيل والضغط على مزامنة البيانات للحصول على المعاينة.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="qr-empty-state">
                <Table size={64} className="qr-empty-icon mb-6" />
                <p className="qr-empty-text">يرجى رفع ملف الإكسيل للحصول على المعاينة.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default QualityReport;
