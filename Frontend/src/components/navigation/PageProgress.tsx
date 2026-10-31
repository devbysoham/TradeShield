'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CUBIC_EASE } from '../primitives/Reveal';

export default function PageProgress() {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => {
      setAnimating(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <AnimatePresence>
      {animating && (
        <motion.div
          key={pathname}
          initial={{ scaleX: 0, opacity: 1, originX: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: CUBIC_EASE }}
          className="fixed top-0 left-0 right-0 h-[2px] bg-accent z-[9998] pointer-events-none"
        />
      )}
    </AnimatePresence>
  );
}

