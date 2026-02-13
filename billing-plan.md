# AION Billing & Economy Plan

AION uses a hybrid credits/currency system powered by Stripe.

## 1. The Wallet System
- Users maintain a balance in USD.
- 1 credit = $0.01 (internal mapping for simplicity).
- Credits are deducted upon **successful** workflow execution.

## 2. Revenue Split
- **AION Platform Fee**: 20%
- **Creator Share**: 80% (minus processing fees).
- *Example:* A $1.00 run results in $0.80 for the creator and $0.20 for AION.

## 3. Stripe Integration
- **Stripe Checkout**: For adding balance to the wallet.
- **Stripe Connect**: For creators to register and receive payouts.
- **Stripe Webhooks**: To listen for successful payments and update Supabase `wallets`.

## 4. Billing Tiers (Phase 2)
### Basic (Free)
- Build up to 3 private workflows.
- Cannot monetize.
- Basic execution speed.

### Pro ($19/mo)
- Unlimited private workflows.
- Priority execution queue.
- Advanced analytics.

### Creator (Revenue Share)
- Can publish to marketplace.
- Access to high-quality AI models at wholesale rates.

## 5. Cost Tracking
- Each node in the engine reports its "cost" (e.g., OpenAI tokens used).
- Total run cost = sum(node costs) + creator margin.
- Users are notified if their balance is too low to complete a run.
