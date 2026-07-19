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
  danger:   'bg-transparent text-text-primary border border-border hover:bg-danger hover:border-danger',
};

const SIZES: Record<BtnSize,string> = {
  sm: 'text-ui-sm h-[26px] px-2',
  md: 'text-ui-sm h-[28px] px-3',
  lg: 'text-ui-md h-[32px] px-4',
};

export const Button: React.FC<ButtonProps> = React.memo(({
  variant='default', size='sm', label, icon,
  disabled=false, active=false, title, className='',
  onClick, onContextMenu, children,
}) => (
  <button
    className={[
      'inline-flex items-center justify-center gap-1.5 rounded-sm',
      'transition-colors',
      VARIANTS[variant],
      SIZES[size],
      active && 'bg-accent-muted text-accent',
      disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
      !disabled && 'cursor-pointer',
      className,
    ].filter(Boolean).join(' ')}
    style={{transitionDuration:'var(--dur-fast)',transitionTimingFunction:'var(--ease-out)'}}
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
