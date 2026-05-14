"use client";

import { useEffect, useState } from 'react';

type Props = {
  value: number | string | Date | null | undefined;
  options?: Intl.DateTimeFormatOptions;
};

const defaultOpts: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
};

export function LocalTime({ value, options }: Props) {
  const [text, setText] = useState<string>(() => {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toISOString();
  });

  useEffect(() => {
    if (!value) {
      setText('—');
      return;
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      setText('—');
      return;
    }
    setText(new Intl.DateTimeFormat(undefined, options || defaultOpts).format(d));
  }, [value, options]);

  return <span suppressHydrationWarning>{text}</span>;
}

