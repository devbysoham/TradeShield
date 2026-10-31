'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Scale,
  ScrollText,
  Landmark,
  ExternalLink,
  AlertTriangle,
  Calculator,
  Loader2,
  CheckCircle2,
  CircleDot,
  Database,
  FileCheck2,
  Clock3,
} from 'lucide-react';
import { useComplianceOverview, useComplianceNorms, runComplianceCheck } from '../../lib/api';
import { COMPLIANCE_CHECK_DEMO } from '../../data/mockData';
import { ComplianceCheckResult, ComplianceSeverity, NormsBlock } from '../../types';

const SEVERITY_STYLES: Record<ComplianceSeverity, string> = {
  high: 'bg-rose-950/80 text-rose-300 border-rose-800',
  warning: 'bg-amber-950/80 text-amber-300 border-amber-800',
  medium: 'bg-amber-950/80 text-amber-300 border-amber-800',
  info: 'bg-blue-950/80 text-blue-300 border-blue-800',
};

const FIELD_CLASSES =
  'w-full bg-navy-midnight/70 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-colors';

function NormsBlockView({ block }: { block: NormsBlock }) {
  if (block.type === 'subheading') {
    return (
      <h4 className="text-xs font-semibold text-cyan-400 mt-3 mb-1 pt-1 border-t border-slate-800/60 first:border-0 first:pt-0 tracking-wide uppercase">
        {block.text}
      </h4>
    );
  }

  if (block.type === 'paragraph') {
    return <p className="text-xs text-slate-400 leading-relaxed">{block.text}</p>;
  }

  if (block.type === 'bullets') {
    return (
      <ul className="space-y-1.5">
        {block.items.map((item, i) => (
          <li key={i} className="text-xs text-slate-300 leading-relaxed flex gap-2">
            <CircleDot className="w-3 h-3 mt-0.5 text-cyan-500 shrink-0" />
            <span>
              {item.label && <span className="font-bold text-slate-200">{item.label}: </span>}
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-800/80 rounded-lg">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-800 bg-navy-surface/40 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
            {block.headers.map((h, i) => (
              <th key={i} className="px-3 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
          {block.rows.map((row, i) => (
            <tr key={i} className="hover:bg-navy-surface/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CompliancePageView() {
  const { overview } = useComplianceOverview();
  const { norms } = useComplianceNorms();

  const [tradeType, setTradeType] = useState<'export' | 'import'>('export');
  const [partnerCountry, setPartnerCountry] = useState('United Kingdom');
  const [productCategory, setProductCategory] = useState('Engineering Goods');
  const [hsCode, setHsCode] = useState('');
  const [declaredValue, setDeclaredValue] = useState('250000');
  const [result, setResult] = useState<ComplianceCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    const value = parseFloat(declaredValue);
    if (!partnerCountry.trim() || isNaN(value) || value <= 0) {
      setError('Partner country and a positive declared value are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await runComplianceCheck({
        trade_type: tradeType,
        partner_country: partnerCountry.trim(),
        product_category: productCategory,
        hs_code: hsCode.trim() || undefined,
        declared_value_usd: value,
      });
      setResult(res);
    } catch {
      setError(
        'Compliance engine unreachable — start the FastAPI backend on port 8000 (proxied via /api).'
      );
    } finally {
      setLoading(false);
    }
  };

  const tb = result?.tariff_breakdown;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 text-xs font-mono text-blue-400 mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>SCRAPED NORMS ENGINE • DGFT / ICEGATE CIP / RBI FEMA / FTA</span>
        </div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          Trade Compliance Norms & Duty Intelligence
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Policy status, tariff breakdown, FTA preferential duty, RoDTEP incentives, mandatory
          documents and FEMA repatriation checks — computed from the latest scraped compliance
          norms corpus ({norms.sections.length} source sections, {overview.active_ftas_count} FTA
          partners, {overview.trading_partners_count}+ trading countries).
        </p>
      </div>

      {/* Checker + Notifications */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Compliance Checker */}
        <div className="xl:col-span-2 bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">Consignment Compliance Checker</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">POST /api/compliance/check</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Trade type */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 block">
                Trade Type
              </label>
              <div className="flex gap-2">
                {(['export', 'import'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTradeType(t)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                      tradeType === t
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/50'
                        : 'bg-navy-midnight/70 text-slate-400 border-slate-700/80 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Partner country */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 block">
                Partner Country
              </label>
              <input
                list="fts-partner-list"
                value={partnerCountry}
                onChange={(e) => setPartnerCountry(e.target.value)}
                placeholder="e.g. United Kingdom, UAE, France"
                className={FIELD_CLASSES}
              />
              <datalist id="fts-partner-list">
                {overview.ftas.map((f) => (
                  <option key={f.country} value={f.country} />
                ))}
              </datalist>
            </div>

            {/* Product category */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 block">
                Product Category
              </label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className={FIELD_CLASSES}
              >
                {overview.product_categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* HS Code + value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 block">
                  HS Code (opt.)
                </label>
                <input
                  value={hsCode}
                  onChange={(e) => setHsCode(e.target.value)}
                  placeholder="8483"
                  className={FIELD_CLASSES}
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Value (USD)
                </label>
                <input
                  type="number"
                  min="1"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  className={FIELD_CLASSES}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleCheck}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-accent hover:bg-accent-hover text-[#1C1A17] disabled:opacity-60 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Evaluating Norms…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Run Compliance Check
                </>
              )}
            </button>
            {error && (
              <span className="text-[11px] font-mono text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </span>
            )}
          </div>

          {/* Results */}
          {result && tb && (
            <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-100">
                  {result.product_category} • HS {result.hs_code}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    result.is_restricted
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  }`}
                >
                  Policy: {result.policy_status}
                </span>
                {result.fta_details ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                    FTA Applied: {result.fta_details.fta_name}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800/80 text-slate-400 border border-slate-700">
                    No FTA Schedule Match
                  </span>
                )}
              </div>

              {result.policy_alerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-[11px] text-rose-200 font-mono"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{alert}</span>
                </div>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-navy-surface/40 border border-slate-800/80">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Standard Duty (MFN)
                  </div>
                  <div className="text-lg font-black text-slate-200">{tb.total_standard_duty_pct}%</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    ${tb.standard_duty_usd.toLocaleString()} • BCD {tb.standard_bcd_pct}% + SWS{' '}
                    {tb.social_welfare_surcharge_pct}% + IGST {tb.igst_pct}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-navy-surface/40 border border-slate-800/80">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Preferential Duty (FTA)
                  </div>
                  <div className="text-lg font-black text-cyan-300">{tb.preferential_duty_pct}%</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    ${tb.preferential_duty_usd.toLocaleString()} payable at customs
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/60">
                  <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1">
                    Net Duty Savings
                  </div>
                  <div className="text-lg font-black text-emerald-300">
                    ${tb.net_duty_savings_usd.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-500/80">
                    ≈ ₹{tb.net_duty_savings_inr.toLocaleString()} INR
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-navy-surface/40 border border-slate-800/80">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Export Incentives
                  </div>
                  <div className="space-y-1 text-[11px] font-mono text-slate-300">
                    <div className="flex justify-between">
                      <span>RoDTEP rebate ({result.export_incentives.rodtep_rate_pct}%)</span>
                      <span className="text-emerald-400 font-bold">
                        ${result.export_incentives.rodtep_rebate_usd.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                        Advance Auth: {result.export_incentives.advance_authorisation_eligible ? 'Eligible' : 'N/A'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                        EPCG: {result.export_incentives.epcg_eligible ? 'Eligible' : 'N/A'}
                      </span>
                    </div>
                    <div className="text-slate-500 pt-1">{result.export_incentives.sion_reference}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-navy-surface/40 border border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      FEMA Repatriation Clock
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      {result.fema_compliance.fema_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-lg font-black text-slate-200">
                      {result.fema_compliance.days_remaining} days
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      remaining of 270-day rule
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${Math.max(
                          4,
                          100 - (result.fema_compliance.days_elapsed / 270) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {result.fema_compliance.notice}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Mandatory Documents
                  </div>
                  <ul className="space-y-1">
                    {result.mandatory_documents.map((doc) => (
                      <li key={doc} className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Issuing Authorities
                  </div>
                  <ul className="space-y-1">
                    {result.issuing_authorities.filter(Boolean).map((auth) => (
                      <li key={auth} className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                        <Landmark className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {auth}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
                <Database className="w-3 h-3" />
                Norms corpus scraped {result.norms_metadata.scraped_at ?? 'recently'} —{' '}
                {result.norms_metadata.source}
              </div>
            </div>
          )}
        </div>

        {/* Recent DGFT Notifications */}
        <div className="bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">DGFT Notifications</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Live Feed</span>
          </div>
          <div className="space-y-3">
            {overview.recent_notifications.map((n) => (
              <div key={n.notification_no} className="p-3 rounded-lg bg-navy-surface/40 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-bold text-cyan-300">
                    {n.notification_no}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${SEVERITY_STYLES[n.severity]}`}>
                    {n.severity.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-200 leading-snug">{n.title}</div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">
                  {n.schedule} • {n.date}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">{n.impact}</div>
              </div>
            ))}
          </div>

          {/* FEMA summary */}
          <div className="mt-4 p-3 rounded-lg bg-navy-surface/40 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              <Landmark className="w-3 h-3" /> FEMA Framework
            </div>
            <div className="text-[11px] font-mono text-slate-300">{overview.fema_rules.statutory_framework}</div>
            <div className="text-[10px] font-mono text-slate-500">{overview.fema_rules.authorized_dealers}</div>
            <div className="text-[10px] font-mono text-slate-500">{overview.fema_rules.ebrc}</div>
          </div>
        </div>
      </div>

      {/* FTA Directory */}
      <div className="bg-navy-deep/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">
              FTA Preferential Tariff Directory ({overview.active_ftas_count} Partners)
            </h3>
          </div>
          <a
            href="https://www.trade.gov.in/pages/free-trade-agreements"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Trade Connect Portal <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2">Partner</th>
                <th className="pb-2">Agreement</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Pref. Rate</th>
                <th className="pb-2">Rules of Origin</th>
                <th className="pb-2">Certificate of Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {overview.ftas.map((f) => (
                <tr key={f.country} className="hover:bg-navy-surface/40 transition-colors">
                  <td className="py-3 font-bold text-cyan-300">{f.country}</td>
                  <td className="py-3 text-slate-200 max-w-[260px]">{f.fta_name}</td>
                  <td className="py-3 text-slate-400">{f.status}</td>
                  <td className="py-3 text-emerald-400 font-bold">{f.preferential_rate_pct}%</td>
                  <td className="py-3 text-slate-400 max-w-[220px]">{f.rules_of_origin.join(' / ')}</td>
                  <td className="py-3 text-slate-400 max-w-[220px]">{f.coo_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[10px] font-mono text-slate-500">
          Additional frameworks: {overview.other_fta_partners.join(' • ')}
        </div>
      </div>

      {/* Government Portals */}
      <div>
        <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400 mb-3">
          <FileCheck2 className="w-4 h-4 text-cyan-400" />
          <span>OFFICIAL REGULATORY PORTALS & RESOURCE DIRECTORY</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overview.portals.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-4 bg-navy-deep/90 border border-slate-800/80 rounded-2xl hover:border-cyan-600/60 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                  {p.badge}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="text-xs font-bold text-slate-100 leading-snug mb-1">{p.name}</div>
              <div className="text-[10px] font-mono text-slate-500 mb-2">{p.authority}</div>
              <div className="text-[11px] text-slate-400 leading-relaxed">{p.description}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Scraped Norms Knowledge Base */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400">
            <Database className="w-4 h-4 text-amber-400" />
            <span>SCRAPED NORMS KNOWLEDGE BASE — {norms.document_title.toUpperCase()}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            scraped {norms.scraped_at ?? '—'}
          </span>
        </div>
        <div className="space-y-3">
          {norms.sections.map((section) => (
            <details
              key={`${section.number}-${section.title}`}
              className="group bg-navy-deep/90 border border-slate-800/80 rounded-2xl overflow-hidden"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-navy-surface/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[11px] font-mono font-bold text-cyan-300">
                    {section.number || '•'}
                  </span>
                  <span className="text-sm font-bold text-slate-100">{section.title}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-800/80">
                {section.blocks.map((block, i) => (
                  <NormsBlockView key={i} block={block} />
                ))}
                {section.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {section.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-navy-surface/60 border border-slate-700/80 text-cyan-300 hover:border-cyan-600/60 transition-colors max-w-full"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[240px]">{link.label}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
        <div className="mt-3 text-[10px] font-mono text-slate-500">
          For product-specific HS-code compliance (exact duties, policy status, mandatory
          certificates), query the checker above or visit the ICEGATE CIP portal directly.
        </div>
      </div>

      {/* Demo fallback hint when no live result yet */}
      {!result && (
        <div className="text-[10px] font-mono text-slate-600">
          Sample engine response available offline: HS {COMPLIANCE_CHECK_DEMO.hs_code} •{' '}
          {COMPLIANCE_CHECK_DEMO.product_category} → run the checker to compute live figures.
        </div>
      )}
    </div>
  );
}
