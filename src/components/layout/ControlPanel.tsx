import React from 'react';

interface ControlPanelProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function ControlPanel({
  title,
  subtitle,
  badge,
  actions,
  children,
}: ControlPanelProps) {
  return (
    <div className="no-print bg-white border-b border-slate-200 px-3.5 sm:px-6 py-3 sm:py-3.5">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                {title}
              </h2>
              {badge && (
                <span className="px-2 py-0.5 rounded-xl text-[10px] font-bold bg-brand-soft text-brand border border-brand-soft">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>

        {children && <div className="pt-1">{children}</div>}
      </div>
    </div>
  );
}
