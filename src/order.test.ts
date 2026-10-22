import { describe, expect, it } from 'vitest';
import {
	formatLines,
	formatMoney,
	lineTotal,
	orderPlaceholders,
	orderRef,
	orderSubtotal,
	type Order
} from './order.js';

describe('orderRef', () => {
	it('should be two groups of three unambiguous characters', () => {
		for (let i = 0; i < 200; i++) {
			expect(orderRef()).toMatch(/^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/);
		}
	});

	it('should differ between orders', () => {
		const refs = new Set(Array.from({ length: 100 }, orderRef));
		expect(refs.size).toBeGreaterThan(95);
	});
});

describe('lineTotal', () => {
	it('should multiply in minor units', () => {
		expect(lineTotal({ name: 'a', quantity: 3, price: 0.1 }, 'EUR')).toBe(0.3);
	});

	it('should give nothing for a line without a price', () => {
		expect(lineTotal({ name: 'a', quantity: 1 }, 'EUR')).toBeUndefined();
	});
});

describe('orderSubtotal', () => {
	it('should sum the lines in minor units', () => {
		expect(
			orderSubtotal(
				[
					{ name: 'a', quantity: 1, price: 0.1 },
					{ name: 'b', quantity: 2, price: 0.1 }
				],
				'USD'
			)
		).toBe(0.3);
	});

	it('should round to the currency, with none for JPY', () => {
		expect(orderSubtotal([{ name: 'a', quantity: 2, price: 100.4 }], 'JPY')).toBe(200);
	});

	it('should give nothing when a line has no price, or the cart is empty', () => {
		expect(
			orderSubtotal(
				[
					{ name: 'a', quantity: 1, price: 1 },
					{ name: 'b', quantity: 1 }
				],
				'EUR'
			)
		).toBeUndefined();
		expect(orderSubtotal([], 'EUR')).toBeUndefined();
	});
});

describe('formatMoney', () => {
	it("should follow the page's language, not the currency's country", () => {
		expect(formatMoney(5.5, 'MXN', 'en')).toBe('MX$5.50');
		expect(formatMoney(5.5, 'MXN', 'es-MX')).toBe('$5.50');
	});
});

describe('formatLines', () => {
	it('should write one line per item, with a price where there is one', () => {
		expect(
			formatLines(
				[
					{ name: 'Sourdough', quantity: 2, price: 4.5 },
					{ name: 'Birthday cake', quantity: 1 }
				],
				'EUR',
				'en-IE'
			)
		).toBe('2 × Sourdough · €9.00\n1 × Birthday cake');
	});

	it('should format zero-decimal currencies without decimals', () => {
		expect(formatLines([{ name: 'Mochi', quantity: 3, price: 150 }], 'JPY', 'en-US')).toBe(
			'3 × Mochi · ¥450'
		);
	});
});

describe('orderPlaceholders', () => {
	const order: Order = {
		ref: 'A7K-3Q2',
		name: 'Ada',
		phone: '+52 55 1234 5678',
		currency: 'MXN',
		lines: [{ name: 'Concha', quantity: 2, price: 12 }],
		subtotal: 24
	};

	it('should give every placeholder a value', () => {
		expect(orderPlaceholders(order, 'es-MX')).toEqual({
			ref: 'A7K-3Q2',
			items: '2 × Concha · $24.00',
			total: '$24.00',
			name: 'Ada',
			phone: '+52 55 1234 5678',
			note: ''
		});
	});

	it('should leave the total empty without a subtotal', () => {
		expect(orderPlaceholders({ ...order, subtotal: undefined }).total).toBe('');
	});
});
