import React, { useState } from 'react';
import { X } from 'lucide-react';

const TagsInput = ({
  label,
  name,
  value = [],
  onChange,
  onBlur,
  error,
  required = false,
  placeholder = 'Type and press Enter to add',
  className = '',
  ...props
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTags = [...value, inputValue.trim()];
      onChange({
        target: {
          name,
          value: newTags,
        },
      });
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      const newTags = value.slice(0, -1);
      onChange({
        target: {
          name,
          value: newTags,
        },
      });
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    const newTags = value.filter((_, index) => index !== indexToRemove);
    onChange({
      target: {
        name,
        value: newTags,
      },
    });
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div
        className={`min-h-[42px] w-full rounded-xl border ${
          error
            ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500'
            : 'border-slate-200 focus-within:border-slate-400 focus-within:ring-slate-900'
        } bg-white px-3 py-2 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0 ${
          props.disabled ? 'cursor-not-allowed opacity-50' : ''
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-sm text-slate-700"
            >
              {tag}
              {!props.disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(index)}
                  className="rounded-full p-0.5 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          <input
            id={name}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={onBlur}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] border-0 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            disabled={props.disabled}
            {...props}
          />
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default TagsInput;

