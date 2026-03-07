import dotenv from 'dotenv';
import Stripe from 'stripe';
import pool from '../db/pool.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
export const createCheckoutSession = async (req, res) => {
  const { plan } = req.body; // 'monthly' or 'yearly'

  if (!plan || !['monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
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

    // Create Checkout Session
    // Note: Replace price IDs with your actual Stripe price IDs
    const priceId = plan === 'monthly' 
      ? process.env.STRIPE_MONTHLY_PRICE_ID 
      : process.env.STRIPE_YEARLY_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
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

// Helper functions for webhook events
async function handleCheckoutComplete(session) {
  const userId = parseInt(session.metadata.userId);
  const plan = session.metadata.plan;

  await pool.query(
    `UPDATE subscriptions 
     SET stripe_subscription_id = $1, status = $2, plan = $3, subscription_start = NOW()
     WHERE user_id = $4`,
    [session.subscription, 'active', plan, userId]
  );

  console.log(`✅ Subscription activated for user ${userId}, plan: ${plan}`);
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
