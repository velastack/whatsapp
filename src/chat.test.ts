import { afterEach, describe, expect, it, vi } from 'vitest';
import { openChat } from './chat.js';

describe('openChat', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('should open a new tab and cut its opener', () => {
		const chat = { opener: {} as unknown };
		const open = vi.fn(() => chat);
		vi.stubGlobal('window', { open });
		expect(openChat('https://wa.me/1')).toBe(true);
		expect(open).toHaveBeenCalledWith('https://wa.me/1', '_blank');
		expect(chat.opener).toBeNull();
	});

	it('should send this tab to WhatsApp when the popup is blocked', () => {
		const assign = vi.fn();
		vi.stubGlobal('window', { open: () => null });
		vi.stubGlobal('location', { assign });
		expect(openChat('https://wa.me/1')).toBe(false);
		expect(assign).toHaveBeenCalledWith('https://wa.me/1');
	});
});
