'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { GeneratedContentField, GeneratedProductContent, ProductFactInput } from '@tcg-hobby/database';
import {
  applyProductContentAction,
  discardProductContentAction,
  generateProductContentAction,
  restoreProductContentAction,
  saveProductFactsAction,
  setProductReviewLifecycleAction,
} from '../lib/product-content-actions.server';
import {
  assistedContentControlClass,
  formatGeneratedValue,
  generationFields,
  hasSavedVerifiedFact,
  productFactDisplay,
  productFactKeysForAdmin,
  productFactsAreDirty,
  selectLatestReviewGeneration,
} from '../lib/product-content-config';

type Generation = {
  id: string;
  status: string;
  provider: string;
  model: string;
  createdAt: string;
  generatedContent: GeneratedProductContent;
  requestedFields: GeneratedContentField[];
};

export type CurrentProductContent = Record<GeneratedContentField, string | string[]>;

type ActionResult = { ok: boolean; message: string };

export function ProductContentAssistant({
  productId,
  initialFacts,
  generations,
  lifecycleState,
  currentContent,
}: {
  productId: string;
  initialFacts: ProductFactInput[];
  generations: Generation[];
  lifecycleState: string;
  currentContent: CurrentProductContent;
}) {
  const initialFactRecord = () => Object.fromEntries(productFactKeysForAdmin.map((key) => [
    key,
    initialFacts.find((fact) => fact.key === key) ?? { key, value: '', verificationState: 'UNVERIFIED', sourceReference: '' },
  ])) as Record<string, ProductFactInput>;
  const latest = selectLatestReviewGeneration(generations);
  const latestDraft = latest?.status === 'DRAFT' ? latest : undefined;
  const [facts, setFacts] = useState<Record<string, ProductFactInput>>(initialFactRecord);
  const [selectedForGeneration, setSelectedForGeneration] = useState<GeneratedContentField[]>(generationFields.map((item) => item.key));
  const [selectedForApply, setSelectedForApply] = useState<GeneratedContentField[]>(latestDraft?.requestedFields ?? []);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [hideReviewDraft, setHideReviewDraft] = useState(false);
  const [pending, startTransition] = useTransition();
  const resultRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (result && !result.ok) resultRef.current?.focus();
  }, [result]);

  const run = (task: () => Promise<ActionResult>, hideDraftOnError = false) => startTransition(async () => {
    const nextResult = await task();
    setResult(nextResult);
    if (!nextResult.ok && hideDraftOnError) setHideReviewDraft(true);
    if (nextResult.ok) window.location.reload();
  });

  const updateFact = (key: string, changes: Partial<ProductFactInput>) => {
    setFacts((current) => ({ ...current, [key]: { ...current[key]!, ...changes } }));
  };
  const toggleGenerationField = (field: GeneratedContentField) => setSelectedForGeneration((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field]);
  const toggleApplyField = (field: GeneratedContentField) => setSelectedForApply((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field]);

  const generate = () => {
    if (productFactsAreDirty(facts, initialFacts)) {
      setHideReviewDraft(true);
      setResult({ ok: false, message: 'Save your verified product facts before generating content.' });
      return;
    }
    if (!hasSavedVerifiedFact(initialFacts)) {
      setHideReviewDraft(true);
      setResult({ ok: false, message: 'Complete and verify at least one product fact, save the facts, then generate a review draft.' });
      return;
    }
    setHideReviewDraft(false);
    run(() => generateProductContentAction(productId, selectedForGeneration), true);
  };

  return <section aria-labelledby="content-assistant-title" className="space-y-6 rounded-lg bg-neutral-900 p-5">
    <div>
      <p className="text-sm font-semibold uppercase text-accent">Assisted content</p>
      <h2 id="content-assistant-title" className="mt-1 text-xl font-black text-neutral-50">Verified facts and draft copy</h2>
      <p className="mt-1 text-sm text-neutral-400">Enter a fact, mark it as verified, add its source, save the facts, then generate a review draft. Generated copy remains unpublished until explicitly applied.</p>
    </div>

    <div className="space-y-3">
      <h3 className="font-bold text-neutral-50">Structured facts</h3>
      <div className="grid gap-3 lg:grid-cols-2">
        {productFactKeysForAdmin.map((key) => {
          const fact = facts[key]!;
          const display = productFactDisplay[key];
          return <fieldset key={key} className="space-y-2 rounded bg-neutral-950/60 p-3">
            <legend className="px-1 text-sm font-bold text-neutral-200">{display.label}</legend>
            {display.help ? <p className="text-xs text-neutral-500">{display.help}</p> : null}
            <label className="block text-xs text-neutral-400" htmlFor={`fact-${key}-value`}>Value</label>
            <input id={`fact-${key}-value`} value={fact.value} onChange={(event) => updateFact(key, { value: event.target.value })} className={assistedContentControlClass} />
            <label className="block text-xs text-neutral-400" htmlFor={`fact-${key}-verification`}>Verification</label>
            <select id={`fact-${key}-verification`} value={fact.verificationState} onChange={(event) => updateFact(key, { verificationState: event.target.value as ProductFactInput['verificationState'] })} className={assistedContentControlClass}>
              <option value="UNVERIFIED">Unverified</option>
              <option value="VERIFIED">Verified</option>
            </select>
            <label className="block text-xs text-neutral-400" htmlFor={`fact-${key}-source`}>Source reference</label>
            <input id={`fact-${key}-source`} value={fact.sourceReference ?? ''} onChange={(event) => updateFact(key, { sourceReference: event.target.value })} placeholder="For example, product packaging" className={assistedContentControlClass} />
          </fieldset>;
        })}
      </div>
      <button disabled={pending} onClick={() => run(() => saveProductFactsAction(productId, Object.values(facts).filter((fact) => fact.value.trim())))} className="rounded bg-neutral-800 px-4 py-2 font-semibold text-neutral-50 disabled:opacity-60">{pending ? 'Saving...' : 'Save facts'}</button>
    </div>

    <div className="space-y-3">
      <h3 className="font-bold text-neutral-50">Fields to generate</h3>
      <div className="flex flex-wrap gap-3">{generationFields.map((field) => <label key={field.key} className="flex items-center gap-2 text-sm text-neutral-200"><input type="checkbox" checked={selectedForGeneration.includes(field.key)} onChange={() => toggleGenerationField(field.key)} />{field.label}</label>)}</div>
      <button disabled={pending || !selectedForGeneration.length} onClick={generate} className="rounded bg-accent px-4 py-2 font-bold text-neutral-950 disabled:opacity-60">{pending ? 'Working...' : 'Generate review draft'}</button>
      {result ? <p ref={resultRef} tabIndex={-1} role={result.ok ? 'status' : 'alert'} aria-live={result.ok ? 'polite' : 'assertive'} className={`rounded p-3 text-sm outline-none focus:ring-2 focus:ring-accent ${result.ok ? 'bg-neutral-950 text-neutral-200' : 'bg-red-500/10 text-red-200'}`}>{result.message}</p> : null}
    </div>

    {latest && !hideReviewDraft ? <div className="space-y-4 rounded bg-neutral-950/60 p-4">
      <div>
        <h3 className="font-bold text-neutral-50">{latest.status === 'DRAFT' ? 'Generated review draft' : 'Previously applied generation'}</h3>
        <p className="text-xs text-neutral-500">{latest.provider} / {latest.model} / {new Date(latest.createdAt).toLocaleString('en-GB')} / {latest.status}</p>
      </div>
      {latest.generatedContent.missingFactWarnings.length ? <div className="rounded bg-amber-500/10 p-3 text-sm text-amber-100"><strong>Missing-fact warnings</strong><ul className="mt-1 list-disc pl-5">{latest.generatedContent.missingFactWarnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div> : null}
      <div className="space-y-3">{generationFields.filter(({ key }) => latest.requestedFields.includes(key)).map(({ key, label }) => <section key={key} className="rounded bg-neutral-900 p-3" aria-labelledby={`generated-${latest.id}-${key}`}>
        <div className="flex items-center gap-2">
          {latest.status === 'DRAFT' ? <input aria-label={`Apply ${label}`} type="checkbox" checked={selectedForApply.includes(key)} onChange={() => toggleApplyField(key)} /> : null}
          <h4 id={`generated-${latest.id}-${key}`} className="text-sm font-bold text-neutral-100">{label}</h4>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div><p className="text-xs font-bold uppercase text-neutral-500">Current saved content</p><p className="mt-1 whitespace-pre-wrap text-sm text-neutral-300">{formatGeneratedValue(currentContent[key]) || 'No current value'}</p></div>
          <div><p className="text-xs font-bold uppercase text-accent">Proposed generated value</p><p className="mt-1 whitespace-pre-wrap text-sm text-neutral-100">{formatGeneratedValue(latest.generatedContent[key]) || 'No value generated'}</p></div>
        </div>
      </section>)}</div>
      <div className="flex flex-wrap gap-2">
        {latest.status === 'DRAFT' ? <><button disabled={pending || !selectedForApply.length} onClick={() => run(() => applyProductContentAction(productId, latest.id, selectedForApply))} className="rounded bg-accent px-4 py-2 font-bold text-neutral-950 disabled:opacity-60">Apply selected fields</button><button disabled={pending} onClick={() => run(() => discardProductContentAction(productId, latest.id))} className="rounded bg-neutral-800 px-4 py-2">Discard draft</button></> : null}
        {latest.status === 'APPLIED' ? <button disabled={pending} onClick={() => run(() => restoreProductContentAction(productId, latest.id))} className="rounded bg-neutral-800 px-4 py-2">Restore previous content</button> : null}
      </div>
    </div> : null}

    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-4"><span className="mr-2 text-sm text-neutral-400">Current lifecycle: {lifecycleState}</span><button disabled={pending} onClick={() => run(() => setProductReviewLifecycleAction(productId, 'DRAFT'))} className="rounded bg-neutral-800 px-3 py-2 text-sm">Save as draft</button><button disabled={pending} onClick={() => run(() => setProductReviewLifecycleAction(productId, 'AWAITING_REVIEW'))} className="rounded bg-neutral-800 px-3 py-2 text-sm">Ready for review</button></div>
  </section>;
}
