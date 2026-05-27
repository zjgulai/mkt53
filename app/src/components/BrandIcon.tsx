import React from 'react';
import type { LucideProps } from 'lucide-react';

interface BrandIconProps {
  icon: React.ComponentType<LucideProps>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'filled' | 'light' | 'outline';
  color?: string;
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-14 h-14',
};

export default function BrandIcon({
  icon: Icon,
  size = 'md',
  variant = 'filled',
  color = '#C25B6E',
  className = '',
}: BrandIconProps) {
  const container = sizeMap[size];

  if (variant === 'outline') {
    return (
      <div
        className={`${container} rounded-2xl flex items-center justify-center border-2 ${className}`}
        style={{ borderColor: color, color }}
      >
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div
      className={`${container} rounded-2xl flex items-center justify-center text-white ${className}`}
      style={{
        backgroundColor: color,
        boxShadow: `0 2px 8px ${color}30`,
      }}
    >
      <Icon className="w-5 h-5" strokeWidth={2} />
    </div>
  );
}
