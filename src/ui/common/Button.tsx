import React from 'react';

type BtnVariant = 'default'|'primary'|'icon'|'ghost'|'danger';
type BtnSize = 'sm'|'md'|'lg';

interface ButtonProps{
  variant?:BtnVariant; size?:BtnSize;
  label?:string; icon?:React.ReactNode;
  disabled?:boolean; active?:boolean; title?:string;
  className?:string;
  onClick?:(e:React.MouseEvent)=>void;
  onContextMenu?:(e:React.MouseEvent)=>void;
  children?:React.ReactNode;
}

const VARIANTS: Record<BtnVariant,string> = {
  default:  'bg-panel text-text-primary border border-border hover:bg-panel-hover',
  primary:  'bg-accent text-white border border-accent hover:bg-accent-hover',
  icon:     'bg-transparent text-text-secondary hover:bg-panel-hover border-0',
  ghost:    'bg-transparent text-text-secondary hover:bg-panel-hover border-0',
  danger:   'bg-transparent text-text-primary border border-border hover:bg-danger',
};

const SIZES: Record<BtnSize,string> = {
  sm: 'text-ui-xs h-row px-1',
  md: 'text-ui-sm h-row px-2',
  lg: 'text-ui-md h-8 px-3',
};

export const Button: React.FC<ButtonProps> = React.memo(({
  variant='default', size='sm', label, icon,
  disabled=false, active=false, title, className='',
  onClick, onContextMenu, children,
}) => (
  <button
    className={[
      'inline-flex items-center justify-center gap-1 rounded-sm',
      'transition-colors duration-fast',
      'focus-visible:outline focus-visible:outline-1 focus-visible:outline-border-focus',
      VARIANTS[variant],
      SIZES[size],
      active && 'bg-panel-active text-white',
      disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
      !disabled && 'cursor-pointer',
      className,
    ].filter(Boolean).join(' ')}
    disabled={disabled}
    title={title}
    onClick={onClick}
    onContextMenu={onContextMenu}
  >
    {icon && <span className="flex items-center">{icon}</span>}
    {label && <span>{label}</span>}
    {children}
  </button>
));
Button.displayName='Button';
