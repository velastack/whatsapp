import { afterEach, describe, expect, it, vi } from 'vitest';
import { formToken, hostedFormUrl, recordOrder } from './forms.js';
import type { Order } from './order.js';

describe('hostedFormUrl', () => {
	it('should put the form beside a hosted CMS endpoint', () => {
		expect(hostedFormUrl('https://velastack.dev/v1/projects/p1/cms', 'contact')).toBe(
			'https://velastack.dev/v1/projects/p1/forms/contact'
		);
		expect(hostedFormUrl('https://velastack.dev/v1/projects/p1/cms/', 'contact')).toBe(
			'https://velastack.dev/v1/projects/p1/forms/contact'
		);
		expect(hostedFormUrl('/v1/projects/p1/cms', 'book-a-table')).toBe(
			'/v1/projects/p1/forms/book-a-table'
		);
	});

	it('should derive nothing from an endpoint without hosted forms', () => {
		expect(hostedFormUrl('/api/cms', 'contact')).toBeNull();
		expect(hostedFormUrl('/cms', 'contact')).toBeNull();
		expect(hostedFormUrl('', 'contact')).toBeNull();
		expect(hostedFormUrl('https://velastack.dev/v1/projects/p1/cms/docs', 'contact')).toBeNull();
	});

	it('should encode the key', () => {
		expect(hostedFormUrl('/v1/projects/p1/cms', 'a/b')).toBe('/v1/projects/p1/forms/a%2Fb');
	});
});

describe('formToken', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('should return the token the endpoint issues', async () => {
		const fetch = vi.fn(async () => Response.json({ token: 't1', issuedAt: 0 }));
		vi.stubGlobal('fetch', fetch);
		expect(await formToken('/v1/projects/p1/forms/order')).toBe('t1');
		expect(fetch).toHaveBeenCalledWith('/v1/projects/p1/forms/order', {
			headers: { accept: 'application/json' }
		});
	});

	it('should give null for a refusal, a bad body or a network error', async () => {
		vi.stubGlobal('fetch', async () => Response.json({ ok: false }, { status: 403 }));
		expect(await formToken('/f')).toBeNull();
		vi.stubGlobal('fetch', async () => new Response('nope'));
		expect(await formToken('/f')).toBeNull();
		vi.stubGlobal('fetch', async () => {
			throw new TypeError('offline');
		});
		expect(await formToken('/f')).toBeNull();
	});
});

describe('recordOrder', () => {
	afterEach(() => vi.unstubAllGlobals());

	const order: Order = {
		ref: 'A7K-3Q2',
		name: 'Ada',
		phone: '+44 20 7946 0000',
		currency: 'EUR',
		lines: [{ name: 'Sourdough', quantity: 2, price: 4.5 }],
		subtotal: 9
	};

	it('should post the order as JSON with keepalive', async () => {
		const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ ok: true }));
		vi.stubGlobal('fetch', fetch);
		await recordOrder('/v1/projects/p1/forms/order', order, { message: 'Hi', token: 't1' });

		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe('/v1/projects/p1/forms/order');
		expect(init).toMatchObject({
			method: 'POST',
			keepalive: true,
			headers: { accept: 'application/json', 'content-type': 'application/json' }
		});
		expect(JSON.parse(init.body as string)).toEqual({
			...order,
			whatsapp: '442079460000',
			message: 'Hi',
			_token: 't1'
		});
	});

	it('should leave out an empty token and honeypot, and send a filled honeypot', async () => {
		const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({ ok: true }));
		vi.stubGlobal('fetch', fetch);
		await recordOrder('/f', order, { message: 'Hi', token: null, gotcha: '' });
		await recordOrder('/f', order, { message: 'Hi', gotcha: 'bot' });

		const first = JSON.parse(fetch.mock.calls[0][1].body as string);
		expect(first).not.toHaveProperty('_token');
		expect(first).not.toHaveProperty('_gotcha');
		expect(JSON.parse(fetch.mock.calls[1][1].body as string)._gotcha).toBe('bot');
	});
});
