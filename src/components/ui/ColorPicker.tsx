/**
 * 颜色选择器组件
 * 支持预设颜色和自定义颜色
 */

import { useState } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  type?: 'tag' | 'gradient'; // 标签颜色或渐变颜色
}

// 预设的标签颜色
const PRESET_TAG_COLORS = [
  'bg-gray-100 text-gray-700',
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-yellow-100 text-yellow-700',
  'bg-green-100 text-green-700',
  'bg-teal-100 text-teal-700',
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
];

// 预设的渐变颜色
const PRESET_GRADIENT_COLORS = [
  'from-gray-50 to-gray-100',
  'from-red-50 to-red-100',
  'from-orange-50 to-orange-100',
  'from-yellow-50 to-yellow-100',
  'from-green-50 to-green-100',
  'from-teal-50 to-teal-100',
  'from-blue-50 to-blue-100',
  'from-indigo-50 to-indigo-100',
  'from-purple-50 to-purple-100',
  'from-pink-50 to-pink-100',
];

export default function ColorPicker({ label, value, onChange, type = 'tag' }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState('');

  const presetColors = type === 'tag' ? PRESET_TAG_COLORS : PRESET_GRADIENT_COLORS;

  const handlePresetSelect = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    if (customColor.trim()) {
      onChange(customColor.trim());
      setCustomColor('');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      
      {/* 当前颜色预览 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 border border-gray-300 rounded-md text-left flex items-center justify-between ${
          type === 'tag' ? value : `bg-gradient-to-r ${value}`
        }`}
      >
        <span className={type === 'tag' ? '' : 'font-medium text-gray-700'}>
          {type === 'tag' ? '示例文本' : '渐变预览'}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 颜色选择面板 */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">预设颜色</h4>
            <div className="grid grid-cols-2 gap-2">
              {presetColors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetSelect(color)}
                  className={`p-2 rounded border text-sm transition-all hover:ring-2 hover:ring-blue-500 ${
                    color === value ? 'ring-2 ring-blue-500' : ''
                  } ${
                    type === 'tag' ? color : `bg-gradient-to-r ${color}`
                  }`}
                >
                  {type === 'tag' ? '示例' : '渐变'}
                </button>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">自定义颜色</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder={type === 'tag' ? 'bg-red-100 text-red-700' : 'from-red-50 to-red-100'}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={handleCustomSubmit}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  应用
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 当前值显示 */}
      <div className="mt-1 text-xs text-gray-500">
        当前值: {value}
      </div>
    </div>
  );
}
