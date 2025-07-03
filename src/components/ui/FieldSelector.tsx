"use client";
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { FieldConfig } from '@/config/system';

interface FieldSelectorProps {
  selectedFields: string[];
  onChange: (fields: string[]) => void;
  allFields: FieldConfig[];
  fieldCategories?: { [cat: string]: { label: string; fields: string[] } };
  className?: string;
  renderFieldAction?: (field: FieldConfig) => ReactNode;
}

export default function FieldSelector({ 
  selectedFields, 
  onChange, 
  allFields,
  fieldCategories,
  className = '',
  renderFieldAction
}: FieldSelectorProps) {
  const [expandedCategory, setExpandedCategory] = useState<string>('all');

  const handleFieldChange = (field: string, checked: boolean) => {
    let newFields = [...selectedFields];
    if (checked) {
      if (!newFields.includes(field)) {
        newFields.push(field);
      }
    } else {
      newFields = newFields.filter(f => f !== field);
    }
    onChange(newFields);
  };

  const isFieldSelected = (field: string) => selectedFields.includes(field);

  // 分组逻辑
  let categories: { [cat: string]: { label: string; fields: string[] } } = {};
  if (fieldCategories) {
    categories = fieldCategories;
  } else {
    // 默认全部分到all
    categories = {
      all: {
        label: '全部字段',
        fields: allFields.map(f => f.key)
      }
    };
  }

  return (
    <div className={`border border-gray-200 rounded-lg p-4 bg-gray-50 ${className}`}>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">表单字段配置</h4>
        <p className="text-xs text-gray-500 mb-3">
          选择该学分类型申请时需要填写的字段。可以根据不同类型的特点选择合适的字段。
        </p>
        {/* 分类字段 */}
        {Object.entries(categories).map(([categoryKey, category]) => {
          const isExpanded = expandedCategory === categoryKey;
          return (
            <div key={categoryKey} className="mb-3 bg-white rounded border">
              {/* 分类标题 */}
              <button
                type="button"
                onClick={() => setExpandedCategory(isExpanded ? '' : categoryKey)}
                className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-700">
                  {category.label}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {/* 字段列表 */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {category.fields.map((fieldKey) => {
                    const field = allFields.find(f => f.key === fieldKey);
                    if (!field) return null;
                    return (
                      <label
                        key={field.key}
                        className="flex items-start space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={isFieldSelected(field.key)}
                          onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-sm">
                            {field.label}
                            {renderFieldAction && renderFieldAction(field)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {field.description}
                          </div>
                          <div className="text-xs text-gray-400 font-mono whitespace-nowrap">{field.key}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* 已选字段摘要 */}
      <div className="mt-4 p-3 bg-blue-50 rounded">
        <h5 className="text-xs font-medium text-blue-800 mb-1">已选字段摘要</h5>
        <div className="text-xs text-blue-600">
          {selectedFields.length > 0 ? (
            <div className="space-y-1">
              {selectedFields.map(fieldKey => {
                const field = allFields.find(f => f.key === fieldKey);
                return (
                  <div key={fieldKey} className="flex justify-between">
                    <span>{field?.label || fieldKey}</span>
                    <span className="font-mono text-blue-400">{fieldKey}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-gray-500">未选择任何字段</span>
          )}
        </div>
      </div>
    </div>
  );
}
