'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CUBIC_EASE } from '../primitives/Reveal';

interface IntroLoaderProps {
  children: React.ReactNode;
  dataReady?: boolean;
}

export default function IntroLoader({ children, dataReady = true }: IntroLoaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [stage, setStage] = useState<'initial' | 'drawing' | 'wordmark' | 'status' | 'exiting' | 'done'>('initial');
  const [statusCopy, setStatusCopy] = useState("Checking today's rate.");
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    // Check session storage
    try {
      const alreadySeen = sessionStorage.getItem('tradeshield_intro_seen');
      if (!alreadySeen) {
        setShouldShow(true);
      }
    } catch {
      // Fallback if sessionStorage is disabled
      setShouldShow(false);
    }
    setHasCheckedSession(true);
  }, []);

  useEffect(() => {
    if (!shouldShow) return;

    if (prefersReducedMotion) {
      // Reduced motion: short simple fade
      const timer = setTimeout(() => {
        sessionStorage.setItem('tradeshield_intro_seen', 'true');
        setStage('done');
      }, 400);
      return () => clearTimeout(timer);
    }

    // Show skip button after 600ms
    const skipTimer = setTimeout(() => {
      setShowSkip(true);
    }, 600);

    // Sequence stages
    const tDraw = setTimeout(() => setStage('drawing'), 200);
    const tWord = setTimeout(() => setStage('wordmark'), 1000);
    const tStatus = setTimeout(() => setStage('status'), 1500);

    // Swap status line if data is ready
    const tSwap = setTimeout(() => {
      if (dataReady) {
        setStatusCopy('Your shipments are in order.');
      }
    }, 1850);

    // Exit transition starts at 2.1s
    const tExit = setTimeout(() => {
      setStage('exiting');
    }, 2150);

    // Complete exit and unmount overlay at 2.65s
    const tDone = setTimeout(() => {
      try {
        sessionStorage.setItem('tradeshield_intro_seen', 'true');
      } catch {}
      setStage('done');
    }, 2650);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(tDraw);
      clearTimeout(tWord);
      clearTimeout(tStatus);
      clearTimeout(tSwap);
      clearTimeout(tExit);
      clearTimeout(tDone);
    };
  }, [shouldShow, dataReady, prefersReducedMotion]);

  const handleSkip = () => {
    try {
      sessionStorage.setItem('tradeshield_intro_seen', 'true');
    } catch {}
    setStage('done');
  };

  // If session already seen or stage done, render plain children with no overlay
  if (!hasCheckedSession) {
    return <div className="min-h-screen bg-bg" />;
  }

  if (!shouldShow || stage === 'done') {
    return <>{children}</>;
  }

  return (
    <>
      {/* Background content */}
      <div className={stage === 'exiting' ? 'opacity-100' : 'opacity-0'}>
        {children}
      </div>

      {/* Intro Overlay */}
      <div className="fixed inset-0 z-[9999] pointer-events-auto flex items-center justify-center overflow-hidden">
        {/* Split Top Panel */}
        <motion.div
          initial={{ y: '0%' }}
          animate={stage === 'exiting' ? { y: '-100%' } : { y: '0%' }}
          transition={{ duration: 0.65, ease: CUBIC_EASE }}
          className="absolute top-0 left-0 right-0 h-1/2 bg-bg border-b border-hairline/40 origin-top"
        />

        {/* Split Bottom Panel */}
        <motion.div
          initial={{ y: '0%' }}
          animate={stage === 'exiting' ? { y: '100%' } : { y: '0%' }}
          transition={{ duration: 0.65, ease: CUBIC_EASE }}
          className="absolute bottom-0 left-0 right-0 h-1/2 bg-bg border-t border-hairline/40 origin-bottom"
        />

        {/* Central Brand Composition */}
        <div className="relative z-10 flex flex-col items-center justify-center select-none">
          <motion.div
            layoutId={stage === 'exiting' ? 'brand-container' : undefined}
            className="flex items-center gap-3.5"
          >
            {/* Continuous looping shield mark drawn via pathLength */}
            <motion.div
              layoutId="brand-logo"
              className="text-accent"
            >
              <svg
                width={48}
                height={48}
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Outer shield perimeter */}
                <motion.path
                  d="M14 3.5C8.8 3.5 5 5.2 5 10V16C5 20.8 9 23.8 14 24.8C19 23.8 23 20.8 23 16V10C23 5.2 19.2 3.5 14 3.5Z"
                  stroke="#F0445A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={
                    stage !== 'initial'
                      ? { pathLength: 1, opacity: 1 }
                      : { pathLength: 0, opacity: 0 }
                  }
                  transition={{ duration: 1.0, ease: CUBIC_EASE }}
                />
                {/* Inner folding looping ribbon */}
                <motion.path
                  d="M10.5 11.2C10.5 9 12 7.5 14 7.5C16.2 7.5 17.5 9.2 17.5 11.5C17.5 14.5 14 17 14 17L10.5 13.5"
                  stroke="#F0445A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={
                    stage !== 'initial'
                      ? { pathLength: 1, opacity: 1 }
                      : { pathLength: 0, opacity: 0 }
                  }
                  transition={{ duration: 0.9, delay: 0.25, ease: CUBIC_EASE }}
                />
              </svg>
            </motion.div>

            {/* Wordmark rising from a mask */}
            <div className="overflow-hidden">
              <motion.h1
                layoutId="brand-wordmark"
                initial={{ y: '110%', opacity: 0 }}
                animate={
                  stage === 'wordmark' || stage === 'status' || stage === 'exiting'
                    ? { y: '0%', opacity: 1 }
                    : { y: '110%', opacity: 0 }
                }
                transition={{ duration: 0.65, ease: CUBIC_EASE }}
                className="font-serif text-3xl sm:text-4xl text-text font-normal tracking-tight"
              >
                TradeShield
              </motion.h1>
            </div>
          </motion.div>

          {/* Status microcopy fading in beneath */}
          <div
            className="mt-4 h-6 flex items-center justify-center overflow-hidden"
            aria-live="polite"
          >
            <AnimatePresence mode="wait">
              {(stage === 'status' || stage === 'exiting') && (
                <motion.p
                  key={statusCopy}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.35, ease: CUBIC_EASE }}
                  className="text-xs text-text-muted font-sans"
                >
                  {statusCopy}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Skippable link bottom right after 600ms */}
        {showSkip && stage !== 'exiting' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleSkip}
            className="absolute bottom-8 right-8 text-xs text-text-faint hover:text-text-muted font-sans transition-colors z-20"
          >
            Skip intro
          </motion.button>
        )}
      </div>
    </>
  );
}

