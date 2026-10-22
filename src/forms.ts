/**
 * Recording an order with a hosted VelaStack form, so it is kept even if the
 * customer never sends the chat.
 *
 * velastack.dev serves a project's hosted forms at
 * `/v1/projects/<id>/forms/<key>`. A `GET` there returns a load-time token;
 * the endpoint refuses one younger than two seconds, so fetch it when the
 * form appears, not when it is submitted. A post without a token is still
 * stored, marked unverified.
 */
import { whatsappNumber } from './href.js';
import type { Order } from './order.js';

const HOSTED_CMS = /^(.*\/v1\/projects\/[^/?#]+)\/cms\/?$/;

/**
 * The hosted form `key` beside a hosted CMS endpoint
 * (`…/v1/projects/<id>/cms`). Any other endpoint shape (a same-app
 * `/api/cms`) has no hosted forms, so the result is `null`.
 */
export const hostedFormUrl = (endpoint: string, key: string): string | null => {
	const match = HOSTED_CMS.exec(endpoint);
	return match ? `${match[1]}/forms/${encodeURIComponent(key)}` : null;
};

/** The hosted form's load-time token, or `null` when it can't be had. */
export const formToken = async (url: string): Promise<string | null> => {
	try {
		const res = await fetch(url, { headers: { accept: 'application/json' } });
		if (!res.ok) return null;
		const body: unknown = await res.json();
		const token = (body as { token?: unknown } | null)?.token;
		return typeof token === 'string' ? token : null;
	} catch {
		return null;
	}
};

export interface RecordOptions {
	/** The message the chat was opened with, stored as the customer would have sent it. */
	message: string;
	/** From `formToken`; without it the order is stored unverified. */
	token?: string | null;
	/** The honeypot input's value; a person leaves it empty. */
	gotcha?: string;
}

/**
 * Posts the order as JSON. `keepalive` lets the request finish after the tab
 * has gone to WhatsApp, so call this without awaiting it before opening the
 * chat: a popup opened after an `await` loses the click's user activation
 * and is blocked.
 *
 * `whatsapp` is the customer's phone as `wa.me` digits, so the business can
 * open a chat with someone who never sent theirs.
 */
export const recordOrder = (url: string, order: Order, options: RecordOptions): Promise<Response> =>
	fetch(url, {
		method: 'POST',
		keepalive: true,
		headers: { accept: 'application/json', 'content-type': 'application/json' },
		body: JSON.stringify({
			...order,
			whatsapp: whatsappNumber(order.phone),
			message: options.message,
			...(options.token ? { _token: options.token } : {}),
			...(options.gotcha ? { _gotcha: options.gotcha } : {})
		})
	});
