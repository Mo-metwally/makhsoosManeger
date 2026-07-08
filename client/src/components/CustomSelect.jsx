import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './CustomSelect.css';

const CustomSelect = ({ options, value, onChange, placeholder = 'اختر...', icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-select-container" ref={selectRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="custom-select-value" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {icon && <span className="custom-select-left-icon" style={{ color: 'var(--theme-color)', display: 'flex' }}>{icon}</span>}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown 
          size={18} 
          className="custom-select-icon" 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} 
        />
      </div>

      <div className={`custom-select-dropdown ${isOpen ? 'show' : ''}`}>
        <ul className="custom-select-options">
          {options.map((option) => (
            <li 
              key={option.value}
              className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span className="option-label">{option.label}</span>
              {value === option.value && <Check size={16} className="option-check" />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CustomSelect;
