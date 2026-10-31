import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // 'danger' dùng cho thao tác xóa; 'success' cho xác nhận hoàn thành; mặc định là xanh dương
  tone?: 'default' | 'danger' | 'success';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Thay cho window.confirm: hộp thoại nằm giữa màn hình, đúng màu và font của app
export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm phải nằm trong ConfirmProvider');
  return ctx;
};

const TONE_CLASS: Record<NonNullable<ConfirmOptions['tone']>, string> = {
  default: 'bg-blue-600 hover:bg-blue-700',
  success: 'bg-emerald-600 hover:bg-emerald-700',
  danger: 'bg-rose-600 hover:bg-rose-700',
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setOptions(opts);
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    if (!options) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-md p-4"
          onClick={() => close(false)}
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-title" className="text-base font-semibold text-slate-900">
              {options.title}
            </h3>
            {options.message && (
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{options.message}</p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-800 transition"
              >
                {options.cancelLabel || 'Hủy'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={`h-10 rounded-full text-sm font-medium text-white transition ${
                  TONE_CLASS[options.tone || 'default']
                }`}
              >
                {options.confirmLabel || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
