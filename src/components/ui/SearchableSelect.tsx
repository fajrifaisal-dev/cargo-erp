'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyOptionLabel?: string;
  allowCustom?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Ketik untuk mencari...',
  emptyOptionLabel,
  allowCustom = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      const id = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(id);
    }
  }, [open]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [options, query]);

  const trimmedQuery = query.trim();
  const hasExactMatch = useMemo(
    () =>
      options.some(
        (opt) =>
          opt.label.toLowerCase() === trimmedQuery.toLowerCase() ||
          opt.value.toLowerCase() === trimmedQuery.toLowerCase()
      ),
    [options, trimmedQuery]
  );

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const displayLabel = selectedOption?.label || value || '';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-left flex items-center justify-between gap-2 transition-colors focus:outline-none focus:bg-white focus:border-brand',
          open && 'bg-white border-brand',
          className
        )}
      >
        <span
          className={cn(
            'truncate text-xs',
            displayLabel ? 'text-gray-900' : 'text-slate-400'
          )}
        >
          {displayLabel || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform',
            open && 'rotate-180 text-brand'
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-7 bg-white border border-slate-300 rounded-xl text-xs text-gray-900 placeholder-slate-400 focus:outline-none focus:border-brand"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-gray-700"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
            {emptyOptionLabel && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={cn(
                  'w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-100 transition-colors',
                  value === '' ? 'bg-brand-soft text-brand font-bold' : 'text-slate-600'
                )}
              >
                <span className="truncate">{emptyOptionLabel}</span>
                {value === '' && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            )}

            {filtered.slice(0, 120).map((opt, idx) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={`${opt.value}-${opt.subLabel || idx}`}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 hover:bg-slate-100 transition-colors',
                    isSelected ? 'bg-brand-soft text-brand font-bold' : 'text-gray-800'
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate">{opt.label}</div>
                    {opt.subLabel && (
                      <div className="text-[10px] text-slate-400 truncate">
                        {opt.subLabel}
                      </div>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              );
            })}

            {allowCustom && trimmedQuery && !hasExactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(trimmedQuery)}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-brand bg-brand-soft/60 hover:bg-brand-soft transition-colors"
              >
                Gunakan kota: &ldquo;{trimmedQuery}&rdquo;
              </button>
            )}

            {filtered.length === 0 && !(allowCustom && trimmedQuery) && (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                Tidak ada data cocok
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
