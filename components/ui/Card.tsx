import React, { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'medium' 
}) => {
  const paddingClasses = {
    none: '',
    small: 'p-3',
    medium: 'p-4 sm:p-6',
    large: 'p-6 sm:p-8',
  };

  return (
    <div className={clsx(
      'bg-white shadow rounded-lg overflow-hidden',
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
};

export default Card; 