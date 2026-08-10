/**
 * @license
 * Official NovarisPay Brand Logo Component
 * HR & Payroll Management System
 */

import React from 'react';

interface NovarisLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  theme?: 'light' | 'dark' | 'white';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  customHeight?: number;
}

export const NovarisLogo: React.FC<NovarisLogoProps> = ({
  variant = 'full',
  theme = 'light',
  className = '',
  size = 'md',
  customHeight,
}) => {
  // Define dimensions based on size
  let logoHeight = customHeight || 38;
  if (!customHeight) {
    switch (size) {
      case 'sm':
        logoHeight = variant === 'icon' ? 24 : 28;
        break;
      case 'md':
        logoHeight = variant === 'icon' ? 32 : 38;
        break;
      case 'lg':
        logoHeight = variant === 'icon' ? 44 : 52;
        break;
      case 'xl':
        logoHeight = variant === 'icon' ? 60 : 72;
        break;
    }
  }

  // Select appropriate SVG asset
  let src = '/logo.svg';
  if (variant === 'icon') {
    src = '/logo-icon.svg';
  } else if (theme === 'dark' || theme === 'white') {
    src = '/logo-white.svg';
  }

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={src}
        alt="NovarisPay Logo"
        style={{ height: `${logoHeight}px`, width: 'auto' }}
        className="object-contain transition-all duration-200"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
