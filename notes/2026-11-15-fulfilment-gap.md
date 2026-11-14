---
date: 2026-11-15
topic: fulfilment
focus: What happens when the first real order arrives, and what to settle before it does
status: open — needs a founder decision, not more analysis
---

# The fulfilment gap

## The problem, stated plainly

The store takes money today. Razorpay is live, test mode is off, 67 products are in Shopify and ads are running. **There is no defined path from a paid order to a finished object.** No print-on-demand app is installed (nothing in the repo references one), no vinyl vendor is selected, and no SOP exists.

Orders #1001 and #1002 were placed by Vibhaas as tests, so this has never been exercised with a stranger's money and a stranger's deadline.

This is the thing that bites hardest the moment the ads work.

## What the August V2 plan assumed, and what checking it shows

The plan named Qikink, Blinkstore, Vendorboat and GetPrintX as print-on-demand options that would auto-fulfil through a Shopify app, with the vinyl handled by a separate vendor on a weekly batch.

Two problems with that:

**1. The POD vendors may not print what PastForward sells.** Qikink's own catalogue lists apparel (jackets, t-shirts, tank tops, crop tops, tote bags). Posters do not appear in it. Its Shopify app is rated around 3.2 stars across 18 reviews, and one third-party report puts it lower. Verify the product range and the paper stock before assuming any of these four can print a 300 GSM A3 to the standard the site promises. ([Qikink Shopify app](https://apps.shopify.com/qikink-print-on-demand-dropshipping) · [Qikink product range](https://qikink.com/why-qikink/))

**2. Print-on-demand cannot make the hero product at all.** The vinyl is a *used 12-inch record, sourced, cleaned, and printed on the centre label*. No POD service does that, because it isn't printing — it's sourcing a second-hand object and modifying it. The ₹999 product that carries the brand's whole identity is structurally outside the automation the plan was built on.

So the honest position: POD may cover posters, prints and polaroids once a vendor is verified. **The vinyl needs either in-house production or a dedicated maker, and that part will not be hands-off.**

## What to do before the first real order

This is the interim path. It is manual and that is fine — it needs to exist today, not be elegant.

1. **Turn on the Shopify order notification to both founders.** A paid order should hit two phones, not one inbox.
2. **Hold stock for the five bestsellers.** Enough blank records and printed A3s to fill the first handful of orders the day they land, rather than starting production from zero.
3. **Write the promise down and keep it.** The site says 7–10 days across India. That is the clock, and it starts at payment.
4. **One shared sheet, one row per order:** order number, what was ordered, who is making it, date promised, date shipped, tracking number. A spreadsheet is enough. The point is that neither founder has to remember.
5. **Pick the courier before you need it.** Decide now who ships and what a record costs to send, so the first order isn't also the first quote.

## What to settle with vendors

Weight integration as heavily as price. A supplier that needs an order forwarded by hand defeats the point.

**Ask every candidate, in writing:**
- Do you print A3 and A5 at 300 GSM, and can you send a sample before we commit?
- Do you have a Shopify app that pulls orders automatically, or an API or CSV feed?
- If not, will you accept a fixed recurring batch window, for example every Monday?
- What is the per-unit cost at 10, 50 and 200 units a month?
- Who pays, and who reprints, when a piece arrives damaged?

**Get three quotes minimum. Get samples before signing anything.**

For the vinyl specifically, the question is different: where do used records come from at volume, at what cost per disc, and who prints the centre label. That is a sourcing problem, not a printing one.

## The number that is missing from everything

**Unit cost per format has never been recorded.** Without it there is no gross margin, no profitable CPA, and no way to judge whether any ad result is good. It is marked UNKNOWN in `.agents/product-marketing.md` and it blocks every budget decision downstream.

Work it out for one vinyl and one A3 — materials, printing, packaging, courier, payment-gateway fee — before raising ad spend by a rupee.
