'use client';

import { useEffect, useState } from 'react';

interface Props {
  in: boolean;
  children: React.ReactNode;
}

export function AnimatedAppear({ in: isIn, children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Ensure we animate on first mount when isIn=true
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  const visible = isIn && mounted;

  return (
    <div
      className={
        `transition-all duration-300 ease-out ` +
        (visible
          ? 'opacity-100 translate-y-0 max-h-[1000px]'
          : 'opacity-0 -translate-y-2 max-h-0 overflow-hidden')
      }
    >
      {children}
    </div>
  );
}


