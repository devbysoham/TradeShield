'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useForexData, 
  useWorkspaceSummary, 
  useShipments, 
  useDocuments 
} from '../../lib/api';
import { useRole } from '../../lib/RoleContext';
import { TradeDocument } from '../../types';
import OverviewHero from './OverviewHero';
import Ledger from '../primitives/Ledger';
import OverviewForecastChart from '../forex/OverviewForecastChart';
import OverviewShipmentJourney from '../shipments/OverviewShipmentJourney';
import OverviewDocumentsList from '../contracts/OverviewDocumentsList';
import Sheet from '../primitives/Sheet';
import ActionButton from '../primitives/ActionButton';
import { CUBIC_EASE } from '../primitives/Reveal';
import { Check, ShieldCheck, ArrowRight } from 'lucide-react';

export default function DashboardClient() {
  const { role } = useRole();

  // Live SWR data hooks
  const { rates, timeSeries, metrics } = useForexData();
  const { workspace } = useWorkspaceSummary(role);
  const { shipments } = useShipments(role);
  const { documents } = useDocuments();

  // Spatial Sheet states
  const [quoteSheetOpen, setQuoteSheetOpen] = useState(false);
  const [quoteLocked, setQuoteLocked] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<TradeDocument | null>(null);

  const activeShipment = shipments[0];
  const usdInrRate = rates['USD/INR'];

  const handleConfirmQuote = () => {
    setQuoteLocked(true);
    setTimeout(() => {
      setQuoteLocked(false);
      setQuoteSheetOpen(false);
    }, 2000);
  };

  const isSheetOpen = quoteSheetOpen || !!selectedDoc;

  return (
    <>
      {/* Underlying Page: recedes with scale 0.98 and slight blur when spatial sheet is open */}
      <motion.div
        animate={{
          scale: isSheetOpen ? 0.985 : 1,
          opacity: isSheetOpen ? 0.6 : 1,
          filter: isSheetOpen ? 'blur(1.5px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.3, ease: CUBIC_EASE }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24"
      >
        {/* Animated role crossfade container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: CUBIC_EASE }}
          >
            {/* 1. Hero Section with Live Rate Header */}
            <OverviewHero
              workspace={workspace}
              forexRate={usdInrRate}
              onReviewQuote={() => setQuoteSheetOpen(true)}
            />

            {/* 2. The 4-item Horizontal Ledger Strip */}
            <Ledger
              workspace={workspace}
              onOpenShipments={() => {}}
              onOpenDocuments={() => setSelectedDoc(documents[0])}
            />

            {/* 3. Full-width Forecast Chart */}
            <OverviewForecastChart
              data={timeSeries}
              metrics={metrics}
            />

            {/* 4. Asymmetric Two-Column Section: Shipments (wider) + Documents (narrower) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-12 sm:my-16 items-start">
              {/* Shipment Journey: ~65% width (7/12 on large screens) */}
              <div className="lg:col-span-7">
                {activeShipment && (
                  <OverviewShipmentJourney shipment={activeShipment} />
                )}
              </div>

              {/* Trade Documents: ~35% width (5/12 on large screens) */}
              <div className="lg:col-span-5">
                <OverviewDocumentsList
                  documents={documents}
                  onSelectDocument={(doc) => setSelectedDoc(doc)}
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Spatial Sheet 1: Forward Quote Execution */}
      <Sheet
        isOpen={quoteSheetOpen}
        onClose={() => setQuoteSheetOpen(false)}
        title="Forward Quote Execution"
        subtitle={
          role === 'exporter'
            ? 'Lock Nov 12 export receivable against adverse Rupee movement.'
            : 'Cap Nov 08 import payable against Dollar appreciation.'
        }
      >
        {quoteLocked ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gain/20 text-gain flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" strokeWidth={2} />
            </div>
            <h4 className="font-serif text-2xl text-text font-normal">
              Forward Contract Confirmed
            </h4>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Reference #FWD-2026-0219 issued. HDFC Bank Treasury Desk will settle at 86.6850 on maturity date.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-surface-raised rounded-lg border border-hairline space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-text-muted font-sans">Underlying Exposure:</span>
                <span className="font-serif text-lg text-text">
                  {role === 'exporter' ? '$95,000 USD (Dutch Auto B.V.)' : '$100,000 USD (Shenzhen Silicon)'}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-text-muted font-sans">Bank Forward Rate:</span>
                <span className="font-serif text-xl text-accent tabular-nums font-medium">
                  ₹{workspace.advisorRecommendation?.bankForwardQuote.toFixed(4) || '86.6850'}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-text-muted font-sans">Guaranteed Realization:</span>
                <span className="font-serif text-lg text-text tabular-nums">
                  {role === 'exporter' ? '₹82,35,075' : '₹86,66,000'}
                </span>
              </div>
            </div>

            <p className="text-xs text-text-muted font-sans leading-relaxed">
              Locking 80% guarantees your targeted export margin. The forward premium pays +0.26 above current spot rate (86.425), with zero downside exposure to Rupee appreciation.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline">
              <button
                onClick={() => setQuoteSheetOpen(false)}
                className="px-4 py-2 text-xs font-sans text-text-muted hover:text-text transition-colors"
              >
                Close
              </button>
              <ActionButton
                idleLabel="Confirm & Lock Forward"
                loadingLabel="Locking..."
                successLabel="Locked & Verified"
                onAction={async () => {
                  await new Promise((r) => setTimeout(r, 1100));
                  handleConfirmQuote();
                }}
                className="text-xs py-2 px-4"
              />
            </div>
          </div>
        )}
      </Sheet>

      {/* Spatial Sheet 2: Trade Document Verification Detail */}
      <Sheet
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={selectedDoc?.title || 'Document Verification'}
        subtitle={selectedDoc ? `${selectedDoc.counterparty} · ${selectedDoc.type}` : ''}
      >
        {selectedDoc && (
          <div className="space-y-5">
            <div className="p-4 bg-surface-raised rounded-lg border border-hairline space-y-2.5 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-text-muted">Document ID:</span>
                <span className="font-mono text-text">{selectedDoc.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Status:</span>
                <span
                  className={
                    selectedDoc.integrityStatus === 'Attention Needed'
                      ? 'text-accent font-medium'
                      : 'text-gain font-medium'
                  }
                >
                  {selectedDoc.integrityStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Associated Shipment:</span>
                <span className="font-mono text-text">{selectedDoc.shipmentRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Upload Timestamp:</span>
                <span className="text-text">{selectedDoc.uploadDate}</span>
              </div>
              <div className="pt-2 border-t border-hairline flex flex-col gap-1">
                <span className="text-text-muted">SHA-256 Digest:</span>
                <span className="font-mono text-[10px] text-text-muted break-all bg-bg p-2 rounded border border-hairline">
                  {selectedDoc.sha256Hash}
                </span>
              </div>
            </div>

            <div className="text-xs text-text-muted font-sans leading-relaxed">
              {selectedDoc.verificationDetails?.verifiedAt}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-hairline text-xs font-sans">
              <span className="text-text-faint flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-gain" strokeWidth={1.5} />
                DGFT ICEGATE linked notary
              </span>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-surface-raised hover:bg-hairline text-text rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
