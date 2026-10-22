/**
 * `wa.me` links: a business's number, and a prefilled message with
 * `{placeholders}` substituted.
 */

const PLACEHOLDER = /\{([^{}\s]+)\}/g;

/** Values to substitute: a submitted form, or plain strings (lists join like repeated fields). */
export type MessageData = FormData | Record<string, string | string[] | undefined>;

const valuesOf = (data: MessageData, name: string): string[] => {
	if (data instanceof FormData) {
		return data.getAll(name).filter((value): value is string => typeof value === 'string');
	}
	const value = data[name];
	return value === undefined ? [] : Array.isArray(value) ? value : [value];
};

/**
 * Substitute `{field}` placeholders. A field with several values (checkboxes,
 * multi-selects) joins with commas; a placeholder with no value, and file
 * uploads, become empty.
 */
export const fillMessage = (template: string, data: MessageData): string =>
	template.replace(PLACEHOLDER, (_, name: string) =>
		valuesOf(data, name)
			.filter((value) => value !== '')
			.join(', ')
	);

/**
 * The digits `wa.me` wants: country code and number, no `+`, spaces or
 * dashes. A leading `00` international prefix is dropped, since no country
 * code starts with 0.
 */
export const whatsappNumber = (raw: string): string => raw.replace(/\D/g, '').replace(/^00/, '');

/** `https://wa.me/<number>?text=<message>`, or `null` when no number is set. */
export const whatsappHref = (number: string, message = ''): string | null => {
	const digits = whatsappNumber(number);
	if (!digits) return null;
	return message
		? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
		: `https://wa.me/${digits}`;
};
