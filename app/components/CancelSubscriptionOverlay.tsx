"use client";

import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import BottomSheet from '../ui/BottomSheet';

type CancelOption = { id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  cancelOptions: CancelOption[];
  defaultSubId?: string | null;
  cancelScheduled?: boolean;
  cancelLoading?: boolean;
  allAccountsCanceled?: boolean;
  onCancelOne: (subId?: string | null) => Promise<void> | void;
  onCancelAll: (ids: string[]) => Promise<void> | void;
};

export default function CancelSubscriptionOverlay({
  open,
  onClose,
  cancelOptions,
  defaultSubId,
  cancelScheduled,
  cancelLoading = false,
  allAccountsCanceled = false,
  onCancelOne,
  onCancelAll,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [cancelAllChecked, setCancelAllChecked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    try {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const first = defaultSubId || cancelOptions[0]?.id || '';
    setSelectedId(first);
    setCancelAllChecked(false);
  }, [open, defaultSubId, cancelOptions]);

  const hasMultiple = cancelOptions.length > 1;
  const Overlay = (hasMultiple && isMobile) ? BottomSheet : Modal;

  const renderMulti = () => (
    <>
      {cancelScheduled ? (
        <div className="mb-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
          Cancellation complete.
        </div>
      ) : null}
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Cancel immediately. Access ends right away.
      </p>
      {allAccountsCanceled ? (
        <p className="mt-3 text-sm text-gray-500">All accounts are already canceled.</p>
      ) : (
        <>
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">Account</label>
            <select
              className="w-full h-10 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 px-3 text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={cancelLoading || cancelAllChecked}
            >
              {cancelOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={cancelAllChecked}
                onChange={(e) => setCancelAllChecked(e.target.checked)}
                disabled={cancelLoading}
              />
              Unsubscribe all accounts
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="h-9 px-4 rounded-md border border-gray-300 dark:border-gray-700 text-sm"
              onClick={onClose}
              disabled={cancelLoading}
            >
              Keep
            </button>
            <button
              className="h-9 px-4 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-sm disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100"
              onClick={async () => {
                if (cancelAllChecked) {
                  await onCancelAll(cancelOptions.map((o) => o.id));
                } else {
                  await onCancelOne(selectedId || defaultSubId || cancelOptions[0]?.id || null);
                }
                onClose();
              }}
              disabled={cancelLoading || allAccountsCanceled}
            >
              {cancelLoading ? 'Cancelling…' : 'Unsubscribe'}
            </button>
          </div>
        </>
      )}
    </>
  );

  const renderSingle = () => (
    <>
      <p className="text-sm text-gray-700 dark:text-gray-200">
        Cancel immediately? Access ends right away.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          className="h-9 px-4 rounded-md border border-gray-300 dark:border-gray-700 text-sm"
          onClick={onClose}
          disabled={cancelLoading}
        >
          Keep
        </button>
        <button
          className="h-9 px-4 rounded-md bg-red-600 text-white text-sm disabled:opacity-60"
          onClick={async () => {
            await onCancelOne(selectedId || defaultSubId || cancelOptions[0]?.id || null);
            onClose();
          }}
          disabled={cancelLoading || allAccountsCanceled}
        >
          {cancelLoading ? 'Cancelling…' : 'Confirm'}
        </button>
      </div>
    </>
  );

  return (
    <Overlay open={open} title="Cancel subscription" onClose={onClose}>
      {hasMultiple ? renderMulti() : renderSingle()}
    </Overlay>
  );
}
