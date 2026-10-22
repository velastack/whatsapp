# @velastack/whatsapp

WhatsApp ordering for VelaStack sites. A customer picks items, and checkout opens a WhatsApp chat with the business,
prefilled with the order (a `wa.me` link). The same order is recorded in the background to a hosted VelaStack form, so
it is kept even if the customer never sends the message.

Plain TypeScript with no framework or runtime dependencies. `vela enable payments` and `vela enable ecommerce` use it
on the WhatsApp provider, and `@velastack/cms` uses it for `CmsWhatsAppForm` and `CmsWhatsAppCart`.

```sh
npm install @velastack/whatsapp
```

## Placing an order

```ts
import {
	formatLines,
	formToken,
	openChat,
	orderRef,
	orderSubtotal,
	recordOrder,
	whatsappHref,
	type Order
} from '@velastack/whatsapp';

const FORM = 'https://velastack.dev/v1/projects/<project>/forms/order';

// When the form appears: the endpoint refuses a token younger than two seconds.
const token = await formToken(FORM);

// In the submit handler, with no `await` before `openChat`.
function checkout(customer: { name: string; phone: string; note?: string }) {
	const lines = [
		{ name: 'Concha', quantity: 2, price: 12 },
		{ name: 'Birthday cake', quantity: 1 } // quoted in the chat
	];
	const currency = 'MXN'; // the business's own
	const order: Order = {
		ref: orderRef(),
		...customer,
		currency,
		lines,
		subtotal: orderSubtotal(lines, currency)
	};
	const message = `Hi! I'd like to order (${order.ref}):\n${formatLines(lines, currency, 'es-MX')}`;

	void recordOrder(FORM, order, { message, token });
	openChat(whatsappHref('+353 1 555 0100', message)!);
}
```

`openChat` has to run inside the click or submit handler: a popup opened after an `await` has lost the click's user
activation and is blocked. If it is blocked anyway, the current tab goes to WhatsApp. `recordOrder` posts with
`keepalive`, so it finishes after the tab has gone.

## API

### Links

- `whatsappNumber(raw)`: the digits `wa.me` wants (`+1 (555) 010-0199` → `15550100199`; a leading `00` is dropped).
- `whatsappHref(number, message?)`: `https://wa.me/<digits>?text=<message>`, or `null` without a number.
- `fillMessage(template, data)`: substitutes `{field}` placeholders from a `FormData` or a plain record. Repeated
  values join with commas; missing ones become empty.
- `openChat(href)`: opens the link in a new tab, or this one when the popup is blocked.

### Orders

- `orderRef()`: a short reference such as `A7K-3Q2`, without 0/O or 1/I. Put it in the message and the stored order,
  so the business can match a chat to its record.
- `orderSubtotal(lines, currency)`: the sum, when every line has a price; otherwise `undefined`.
- `lineTotal(line, currency)`, `formatMoney(amount, currency, locale?)`.
- `formatLines(lines, currency, locale?)`: one line per item, `2 × Concha · $24.00`.
- `orderPlaceholders(order, locale?)`: `{ ref, items, total, name, phone, note }`, for `fillMessage` with an
  editor-written template.

An order is in one currency: the business's own, which it prices in and quotes in the chat. Prices are optional and
written as a person writes them (`4.5`, not `450`). Sums are done in the currency's minor unit, so `0.1 + 0.2` is
`0.30` and yen have no decimals. Format with the page's language rather than the visitor's browser: an English page
shows MXN as `MX$5.50` and a Spanish one as `$5.50`.

### Hosted forms

- `hostedFormUrl(cmsEndpoint, key)`: the form `key` beside a hosted CMS endpoint (`…/v1/projects/<id>/cms` →
  `…/v1/projects/<id>/forms/<key>`), or `null` for any other endpoint.
- `formToken(url)`: the form's load-time token, or `null`. Without one the order is still stored, marked unverified.
- `recordOrder(url, order, { message, token?, gotcha? })`: posts the order as JSON, plus `whatsapp` (the customer's
  phone as `wa.me` digits) and `message`. `gotcha` is the honeypot input's value.

## License

MIT
