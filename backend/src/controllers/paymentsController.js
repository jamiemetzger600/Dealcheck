import dotenv from 'dotenv';
import Stripe from 'stripe';
import pool from '../db/pool.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session (monthly subscription only for now)
export const createCheckoutSession = async (req, res) => {
  const plan = req.body?.plan || 'monthly';

  if (plan !== 'monthly') {
    return res.status(400).json({ error: 'Only monthly billing is available' });
  }

  const priceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  if (!priceId) {
    console.error('STRIPE_MONTHLY_PRICE_ID is not configured');
    return res.status(503).json({ error: 'Billing is not configured yet' });
  }

  try {
    // Get or create Stripe customer
    let stripeCustomerId;
    const subResult = await pool.query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
      [req.user.userId]
    );

    if (subResult.rows[0]?.stripe_customer_id) {
      stripeCustomerId = subResult.rows[0].stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { userId: req.user.userId.toString() }
      });
      stripeCustomerId = customer.id;

      await pool.query(
        'UPDATE subscriptions SET stripe_customer_id = $1 WHERE user_id = $2',
        [stripeCustomerId, req.user.userId]
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      phone_number_collection: { enabled: false },
      success_url: `${process.env.WEB_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.WEB_APP_URL}/billing?canceled=true`,
      metadata: {
        userId: req.user.userId.toString(),
        plan
      }
    });

    res.json({ sessionId: session.id, url: session.url });

  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Confirm checkout after redirect (local dev without Stripe CLI webhooks)
export const confirmCheckoutSession = async (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const sessionUserId = parseInt(session.metadata?.userId, 10);
    if (!sessionUserId || sessionUserId !== req.user.userId) {
      return res.status(403).json({ error: 'Checkout session does not belong to this user' });
    }

    if (session.status !== 'complete') {
      return res.status(400).json({ error: 'Checkout is not complete yet' });
    }

    await activateSubscriptionFromCheckout(session);
    res.json({ ok: true, plan: session.metadata?.plan || 'monthly', status: 'active' });
  } catch (error) {
    console.error('Confirm checkout session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create Customer Portal session (for managing subscription)
export const createPortalSession = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
      [req.user.userId]
    );

    if (!result.rows[0]?.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: result.rows[0].stripe_customer_id,
      return_url: `${process.env.WEB_APP_URL}/billing`,
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Webhook handler for Stripe events
export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`🎣 Webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
};

async function activateSubscriptionFromCheckout(session) {
  const userId = parseInt(session.metadata.userId, 10);
  const plan = session.metadata.plan || 'monthly';

  await pool.query(
    `UPDATE subscriptions
     SET stripe_customer_id = COALESCE(stripe_customer_id, $1),
         stripe_subscription_id = $2,
         status = $3,
         plan = $4,
         subscription_start = NOW()
     WHERE user_id = $5`,
    [session.customer, session.subscription, 'active', plan, userId]
  );

  console.log(`✅ Subscription activated for user ${userId}, plan: ${plan}`);
}

// Helper functions for webhook events
async function handleCheckoutComplete(session) {
  await activateSubscriptionFromCheckout(session);
}

async function handleSubscriptionUpdate(subscription) {
  const customer = subscription.customer;
  
  const result = await pool.query(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1',
    [customer]
  );

  if (result.rows.length === 0) return;

  const userId = result.rows[0].user_id;
  const status = subscription.status; // active, canceled, past_due, etc.

  await pool.query(
    'UPDATE subscriptions SET status = $1 WHERE user_id = $2',
    [status, userId]
  );

  console.log(`✅ Subscription updated for user ${userId}, status: ${status}`);
}

async function handleSubscriptionDeleted(subscription) {
  const customer = subscription.customer;
  
  const result = await pool.query(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1',
    [customer]
  );

  if (result.rows.length === 0) return;

  const userId = result.rows[0].user_id;

  await pool.query(
    `UPDATE subscriptions 
     SET status = $1, plan = $2, subscription_end = NOW()
     WHERE user_id = $3`,
    ['canceled', 'free', userId]
  );

  console.log(`✅ Subscription canceled for user ${userId}`);
}

async function handleInvoicePaid(invoice) {
  const customer = invoice.customer;
  
  const result = await pool.query(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1',
    [customer]
  );

  if (result.rows.length === 0) return;

  const userId = result.rows[0].user_id;

  await pool.query(
    'UPDATE subscriptions SET status = $1 WHERE user_id = $2',
    ['active', userId]
  );

  console.log(`✅ Invoice paid for user ${userId}`);
}

async function handlePaymentFailed(invoice) {
  const customer = invoice.customer;
  
  const result = await pool.query(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1',
    [customer]
  );

  if (result.rows.length === 0) return;

  const userId = result.rows[0].user_id;

  await pool.query(
    'UPDATE subscriptions SET status = $1 WHERE user_id = $2',
    ['past_due', userId]
  );

  console.log(`⚠️ Payment failed for user ${userId}`);
}
