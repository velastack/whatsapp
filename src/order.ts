/**
 * An order placed over WhatsApp: what the customer picked, who they are, and
 * a reference the business can match between the chat and the stored copy.
 *
 * An order is in one currency, the business's own: the one it prices in and
 * quotes in the chat. Prices are optional and written as a person would
 * write them (`4.5`, not `450`); many sellers quote in the chat instead. Sums
 * are done in the currency's minor unit so `0.1 + 0.2` stays `0.30`.
 */

export interface OrderLine {
	name: string;
	quantity: number;
	/** The unit price in the order's currency, in its major unit. */
	price?: number;
}

export interface Order {
	/** From `orderRef()`; shown in the message and stored with the order. */
	ref: string;
	name: string;
	phone: string;
	note?: string;
	/** ISO 4217, e.g. `MXN`: the business's currency, which every price is in. */
	currency: string;
	lines: OrderLine[];
	/** Only when every line has a price. */
	subtotal?: number;
}

// No 0/O or 1/I, so a reference read aloud or retyped survives. 32
// characters, so a random byte masked to 5 bits picks one without bias.
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A short reference such as `A7K-3Q2`. */
export const orderRef = (): string => {
	const bytes = crypto.getRandomValues(new Uint8Array(6));
	const chars = Array.from(bytes, (byte) => REF_ALPHABET[byte & 31]);
	return `${chars.slice(0, 3).join('')}-${chars.slice(3).join('')}`;
};

const fractionDigits = (currency: string): number =>
	new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
		.maximumFractionDigits ?? 2;

const toMinor = (amount: number, currency: string) =>
	Math.round(amount * 10 ** fractionDigits(currency));

const fromMinor = (minor: number, currency: string) => minor / 10 ** fractionDigits(currency);

/**
 * `amount` in `currency`, formatted for `locale`. Pass the page's language
 * (`<html lang>`, or the request's locale on the server) rather than leaving
 * it to the runtime: an English page shows MXN as `MX$5.50`, a Spanish one as
 * `$5.50`, and a server render and hydration only agree on a fixed locale.
 */
export const formatMoney = (amount: number, currency: string, locale?: string): string =>
	new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

const hasPrice = (line: OrderLine): line is OrderLine & { price: number } =>
	typeof line.price === 'number' && Number.isFinite(line.price);

/** A line's price times its quantity, or `undefined` for a line without a price. */
export const lineTotal = (line: OrderLine, currency: string): number | undefined =>
	hasPrice(line) ? fromMinor(toMinor(line.price, currency) * line.quantity, currency) : undefined;

/** The sum of the lines when every line has a price; otherwise the business quotes it. */
export const orderSubtotal = (lines: OrderLine[], currency: string): number | undefined => {
	if (lines.length === 0 || !lines.every(hasPrice)) return undefined;
	const minor = lines.reduce(
		(sum, line) => sum + toMinor(line.price!, currency) * line.quantity,
		0
	);
	return fromMinor(minor, currency);
};

/** One line per item, `2 × Sourdough · $9.00`; the price part only when the line has one. */
export const formatLines = (lines: OrderLine[], currency: string, locale?: string): string =>
	lines
		.map((line) => {
			const total = lineTotal(line, currency);
			const item = `${line.quantity} × ${line.name}`;
			return total === undefined ? item : `${item} · ${formatMoney(total, currency, locale)}`;
		})
		.join('\n');

/**
 * The values a message template's placeholders take: `{ref}`, `{items}`,
 * `{total}` (empty without a subtotal), `{name}`, `{phone}` and `{note}`.
 * Pass the result to `fillMessage`.
 */
export const orderPlaceholders = (order: Order, locale?: string): Record<string, string> => ({
	ref: order.ref,
	items: formatLines(order.lines, order.currency, locale),
	total: order.subtotal === undefined ? '' : formatMoney(order.subtotal, order.currency, locale),
	name: order.name,
	phone: order.phone,
	note: order.note ?? ''
});
