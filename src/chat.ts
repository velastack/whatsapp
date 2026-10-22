/**
 * Opens a `wa.me` link in a new tab. Call it straight from the click or
 * submit handler, before any `await`: a popup opened later has lost the
 * click's user activation and is blocked. If it is blocked anyway, this tab
 * goes to WhatsApp instead. Returns whether a new tab opened.
 */
export const openChat = (href: string): boolean => {
	const chat = window.open(href, '_blank');
	if (!chat) {
		location.assign(href);
		return false;
	}
	chat.opener = null;
	return true;
};
