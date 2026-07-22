import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createOpenAiContentProvider } from './product-content-provider.server';

const content = { shortDescription: 'Short', fullDescription: 'Full', contents: ['Verified item'], highlights: [], specificationSummary: '', seoTitle: 'Title', metaDescription: 'Description', searchTags: ['pokemon'], suggestedSlug: 'verified-product', imageAltText: 'Front product packaging', missingFactWarnings: [] };
beforeEach(() => { process.env.OPENAI_API_KEY = 'test-key-not-real'; process.env.OPENAI_CONTENT_MODEL = 'gpt-5-mini'; });
describe('OpenAI product content adapter', () => {
  it('uses Responses structured output without storing the request', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(content) }] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const result = await createOpenAiContentProvider(fetcher).generate({ product: { name: 'Verified product' }, verifiedFacts: [{ key: 'boxContents', value: 'Verified item', sourceReference: 'Owner packaging' }], requestedFields: ['shortDescription'] });
    expect(result.content.shortDescription).toBe('Short'); const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)); expect(request.store).toBe(false); expect(request.model).toBe('gpt-5-mini'); expect(request.text.format.strict).toBe(true); expect(request.text.format.type).toBe('json_schema');
  });
  it('rejects malformed and schema-invalid output', async () => {
    const malformed = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: '{bad' }] }] }), { status: 200 }));
    await expect(createOpenAiContentProvider(malformed).generate({ product: {}, verifiedFacts: [], requestedFields: [] })).rejects.toThrow('malformed JSON');
    const invalid = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: '{}' }] }] }), { status: 200 }));
    await expect(createOpenAiContentProvider(invalid).generate({ product: {}, verifiedFacts: [], requestedFields: [] })).rejects.toThrow('required schema');
  });
  it('does not place the API key in the request body', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(content) }] }] }), { status: 200 }));
    await createOpenAiContentProvider(fetcher).generate({ product: {}, verifiedFacts: [], requestedFields: [] }); expect(String(fetcher.mock.calls[0]?.[1]?.body)).not.toContain('test-key-not-real');
  });
});
