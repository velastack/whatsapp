import { describe, expect, it } from 'vitest';
import { fillMessage, whatsappHref, whatsappNumber } from './href.js';

const formData = (entries: Array<[string, string]>) => {
	const data = new FormData();
	for (const [key, value] of entries) data.append(key, value);
	return data;
};

describe('fillMessage', () => {
	it('should substitute each placeholder with its field', () => {
		const data = formData([
			['name', 'Ada'],
			['guests', '4']
		]);
		expect(fillMessage("Hi, I'm {name}. A table for {guests}.", data)).toBe(
			"Hi, I'm Ada. A table for 4."
		);
	});

	it('should join repeated fields and empty unknown ones', () => {
		const data = formData([
			['extras', 'wine'],
			['extras', 'cake'],
			['extras', '']
		]);
		expect(fillMessage('{extras} / {missing} / {missing}', data)).toBe('wine, cake /  / ');
	});

	it('should leave braces that are not placeholders alone', () => {
		expect(fillMessage('{ spaced } {} {a b}', formData([]))).toBe('{ spaced } {} {a b}');
	});

	it('should fill from plain values', () => {
		expect(fillMessage('{a} / {b} / {c}', { a: 'one', b: ['x', '', 'y'], c: undefined })).toBe(
			'one / x, y / '
		);
	});

	it('should skip uploaded files', () => {
		const data = new FormData();
		data.append('photo', new Blob(['x']), 'x.png');
		expect(fillMessage('[{photo}]', data)).toBe('[]');
	});
});

describe('whatsappNumber', () => {
	it('should keep only the digits wa.me accepts', () => {
		expect(whatsappNumber('+1 (555) 010-0199')).toBe('15550100199');
		expect(whatsappNumber('0044 20 7946 0000')).toBe('442079460000');
		expect(whatsappNumber('')).toBe('');
	});
});

describe('whatsappHref', () => {
	it('should link to the number with the message encoded', () => {
		expect(whatsappHref('+1 555 0100', 'Hi & bye?')).toBe(
			'https://wa.me/15550100?text=Hi%20%26%20bye%3F'
		);
	});

	it('should link to the number alone without a message', () => {
		expect(whatsappHref('+1 555 0100')).toBe('https://wa.me/15550100');
	});

	it('should give nothing without a number', () => {
		expect(whatsappHref('', 'Hi')).toBeNull();
		expect(whatsappHref('n/a', 'Hi')).toBeNull();
	});
});
