// ============================================================
// AION Billing Part 3 — Payment gateway abstraction.
//
// CURRENT: dummy gateway (user picks amount → Proceed → bill animation
// → backend credits wallet). No card data, no external calls.
//
// PRODUCTION: plug a real provider here WITHOUT touching the API routes,
// the page, or the payments table:
//   1. `npm i stripe`, set STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET /
//      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
//   2. Implement `StripeProvider` below (method stubs marked TODO-REAL).
//   3. Set PAYMENTS_PROVIDER=stripe.
//   4. Add `app/api/webhooks/stripe/route.ts` that calls
//      `verifyWebhook()` then the existing `confirmPayment()` service —
//      idempotency is already handled by confirm_payment() (status gate +
//      unique provider_payment_id), so duplicate webhooks credit nothing.
// ============================================================

export type GatewayName = 'dummy' | 'stripe' | 'razorpay';

export interface PaymentIntent {
  /** Unique per-attempt provider reference. Stored in payments.provider_payment_id (UNIQUE) → duplicate replays collapse. */
  providerPaymentId: string;
  /** Opaque payload the API persists into payments.metadata. */
  metadata: Record<string, unknown>;
  /** If set, the client redirects here (real hosted checkout). Dummy: null. */
  redirectUrl?: string | null;
}

export interface PaymentProvider {
  readonly name: GatewayName;
  createIntent(input: {
    paymentId: string;
    userId: string;
    amountUsd: number;
    customerType: 'byok' | 'managed';
  }): Promise<PaymentIntent>;
  /**
   * Server-side verification that money actually moved.
   * Dummy: validates the intent exists and amount matches (no external call).
   * Real: retrieve the Checkout Session / PaymentIntent from the provider API
   *   and require status = paid/succeeded. NEVER trust a frontend flag.
   */
  verifyAndConfirm(input: {
    paymentId: string;
    providerPaymentId: string;
    amountUsd: number;
  }): Promise<{ ok: boolean; reason?: string }>;
}

// ─── Dummy (current) ─────────────────────────────────────────
class DummyProvider implements PaymentProvider {
  readonly name: GatewayName = 'dummy';

  async createIntent(input: {
    paymentId: string;
    userId: string;
    amountUsd: number;
    customerType: 'byok' | 'managed';
  }): Promise<PaymentIntent> {
    return {
      providerPaymentId: `dummy_${input.paymentId.replace(/-/g, '').slice(0, 12)}_${Date.now().toString(36)}`,
      metadata: {
        mode: 'dummy',
        note: 'No real charge. Real gateway plugs in here for production.',
      },
    };
  }

  async verifyAndConfirm(input: {
    paymentId: string;
    providerPaymentId: string;
    amountUsd: number;
  }): Promise<{ ok: boolean; reason?: string }> {
    if (!input.providerPaymentId.startsWith('dummy_')) {
      return { ok: false, reason: 'unknown provider reference' };
    }
    if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
      return { ok: false, reason: 'invalid amount' };
    }
    // Dummy has no external charge to verify; the trust boundary is that
    // this code runs server-side (service_role) and the actual crediting
    // happens in the atomic confirm_payment() RPC — not in the browser.
    return { ok: true };
  }
}

// ─── TODO-REAL: Stripe (production) ──────────────────────────
// class StripeProvider implements PaymentProvider {
//   readonly name: GatewayName = 'stripe';
//   async createIntent(input) {
//     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
//     const session = await stripe.checkout.sessions.create({
//       mode: 'payment',
//       line_items: [{ price_data: {
//         currency: 'usd',
//         product_data: { name: `${input.amountUsd} AION Credits (${input.customerType})` },
//         unit_amount: Math.round(input.amountUsd * 100),
//       }, quantity: 1 }],
//       metadata: { payment_id: input.paymentId, user_id: input.userId },
//       success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/add-credits?payment=${input.paymentId}`,
//       cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/add-credits?payment=${input.paymentId}&cancelled=1`,
//     });
//     return { providerPaymentId: session.id, metadata: {}, redirectUrl: session.url };
//   }
//   async verifyAndConfirm(input) {
//     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
//     const session = await stripe.checkout.sessions.retrieve(input.providerPaymentId);
//     return session.payment_status === 'paid'
//       ? { ok: true }
//       : { ok: false, reason: `session status: ${session.payment_status}` };
//   }
// }

export function getProvider(): PaymentProvider {
  const name = (process.env.PAYMENTS_PROVIDER ?? 'dummy').toLowerCase() as GatewayName;
  switch (name) {
    case 'dummy':
      return new DummyProvider();
    case 'stripe':
    case 'razorpay':
      // Not wired yet — fail closed with a clear server-side message
      // (never leak this raw error to the client; routes map it to 503).
      throw new Error(`payments_provider_not_configured: ${name}`);
    default:
      throw new Error(`payments_unknown_provider: ${name}`);
  }
}
