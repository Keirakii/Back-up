import React from 'react';

interface ChurchLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  customLogoUrl?: string | null;
  alt?: string;
}

export const ChurchLogo: React.FC<ChurchLogoProps> = ({
  className = '',
  size = 'md',
  customLogoUrl = null,
  alt = 'โลโก้คริสตจักร',
}) => {
  const sizeClasses = {
    sm: 'h-7 w-7 rounded-xl text-xs',
    md: 'h-9 w-9 rounded-2xl text-sm',
    lg: 'h-12 w-12 rounded-[18px] text-base',
  };

  if (customLogoUrl) {
    return (
      <div
        className={`relative flex items-center justify-center bg-white shadow-xs overflow-hidden shrink-0 border border-slate-200/80 ${sizeClasses[size]} ${className}`}
        title={alt}
      >
        <img
          src={customLogoUrl}
          alt={alt}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center bg-gradient-to-tr from-[#2563EB] via-[#3A86FF] to-[#7EC8E3] text-white shadow-xs overflow-hidden shrink-0 ${sizeClasses[size]} ${className}`}
      title={alt}
    >
      {/* Subtle background glow arc */}
      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white/20 blur-xs" />
      <div className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-white/25 blur-xs" />

      {/* Modern Church Cross & Sanctuary Emblem SVG */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-white drop-shadow-xs"
      >
        {/* Church Sanctuary Arch */}
        <path
          d="M6 24V14C6 8.47715 10.4772 4 16 4C21.5228 4 26 8.47715 26 14V24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        {/* Foundation line */}
        <path
          d="M4 27H28"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Elegant Latin Cross */}
        <path
          d="M16 8V22"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M11 12H21"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Radiant Star / Dove Dot at the cross intersection */}
        <circle cx="16" cy="12" r="1.2" fill="#FEEA9A" />
      </svg>
    </div>
  );
};
