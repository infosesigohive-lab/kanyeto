import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export const Button: React.FC<Props> = ({ variant = 'primary', children, ...rest }) => {
  const base = "px-4 py-2 rounded font-medium";
  const cls = variant === 'primary' ? `${base} bg-blue-600 text-white` : `${base} bg-transparent`;
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
};