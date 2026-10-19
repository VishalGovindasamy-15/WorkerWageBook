/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary (Brand)
        'primary-50': '#EFF6FF',
        'primary-100': '#DBEAFE',
        'primary-500': '#3B82F6',
        'primary-600': '#2563EB',
        'primary-700': '#1D4ED8',
        'primary-900': '#1E3A8A',

        // Neutral (Text and Surfaces)
        'neutral-50': '#F9FAFB',
        'neutral-100': '#F3F4F6',
        'neutral-200': '#E5E7EB',
        'neutral-300': '#D1D5DB',
        'neutral-400': '#9CA3AF',
        'neutral-500': '#6B7280',
        'neutral-600': '#4B5563',
        'neutral-700': '#374151',
        'neutral-800': '#1F2937',
        'neutral-900': '#111827',

        // Semantic
        'success-50': '#F0FDF4',
        'success-500': '#10B981',
        'success-600': '#059669',
        'success-700': '#047857',

        'warning-50': '#FFFBEB',
        'warning-500': '#F59E0B',
        'warning-600': '#D97706',
        'warning-700': '#B45309',

        'danger-50': '#FEF2F2',
        'danger-500': '#EF4444',
        'danger-600': '#DC2626',
        'danger-700': '#B91C1C',

        'info-50': '#EFF6FF',
        'info-500': '#3B82F6',
        'info-700': '#1D4ED8',

        // Money
        'money-positive': '#10B981',
        'money-negative': '#EF4444',
        'money-neutral': '#6B7280',
      },
      borderRadius: {
        'radius-sm': '4px',
        'radius': '8px',
        'radius-md': '12px',
        'radius-lg': '16px',
        'radius-xl': '24px',
      },
    },
  },
  plugins: [],
};
