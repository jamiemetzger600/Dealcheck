import cron from 'node-cron';
import pool from '../db/pool.js';
import { sendEmail } from './emailService.js';
import { dealMatchesBuyBox } from '../lib/buyBoxMatcher.js';
import { processDueReminders, sendCrmDailyDigests } from './crmReminderService.js';

// Simulated deal fetching (in production, fetch from Opensheet/sources)
async function fetchDealsForMatching() {
  // This would call the same Opensheet/custom sources as the client
  // For now, return empty array - implement when integrating with actual sources
  console.log('📥 Fetching deals for notification matching...');
  return [];
}

// Check for matching deals and send notifications
async function checkAndNotifyUser(user, settings, frequency) {
  try {
    // Fetch deals
    const deals = await fetchDealsForMatching();
    
    // Apply buy box filter
    const matchingDeals = deals.filter(deal => 
      dealMatchesBuyBox(deal, settings.buy_box)
    );

    if (matchingDeals.length === 0) {
      console.log(`  No matches for user ${user.email}`);
      return;
    }

    // Send notification
    const subject = `${matchingDeals.length} Deal${matchingDeals.length > 1 ? 's' : ''} Match Your Criteria`;
    const emailBody = generateEmailBody(matchingDeals, frequency);

    await sendEmail({
      to: user.email,
      subject,
      html: emailBody
    });

    // Update last notification sent
    await pool.query(
      'UPDATE user_settings SET last_notification_sent = NOW() WHERE user_id = $1',
      [user.id]
    );

    console.log(`✅ Sent ${frequency} notification to ${user.email}: ${matchingDeals.length} matches`);

  } catch (error) {
    console.error(`❌ Error notifying user ${user.email}:`, error);
  }
}

// Daily notifications (runs at 9:00 AM)
cron.schedule('0 9 * * *', async () => {
  console.log('🔔 Running daily notification job...');
  
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, us.buy_box, us.last_notification_sent
      FROM users u
      JOIN user_settings us ON u.id = us.user_id
      WHERE us.notification_frequency = 'daily'
      AND (us.last_notification_sent IS NULL OR us.last_notification_sent < NOW() - INTERVAL '23 hours')
    `);

    console.log(`  Found ${result.rows.length} users for daily notifications`);

    for (const user of result.rows) {
      await checkAndNotifyUser(user, { buy_box: user.buy_box }, 'daily');
    }

  } catch (error) {
    console.error('❌ Daily notification job error:', error);
  }
});

// Weekly notifications (runs Mondays at 9:00 AM)
cron.schedule('0 9 * * 1', async () => {
  console.log('🔔 Running weekly notification job...');
  
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, us.buy_box, us.last_notification_sent
      FROM users u
      JOIN user_settings us ON u.id = us.user_id
      WHERE us.notification_frequency = 'weekly'
      AND (us.last_notification_sent IS NULL OR us.last_notification_sent < NOW() - INTERVAL '6 days')
    `);

    console.log(`  Found ${result.rows.length} users for weekly notifications`);

    for (const user of result.rows) {
      await checkAndNotifyUser(user, { buy_box: user.buy_box }, 'weekly');
    }

  } catch (error) {
    console.error('❌ Weekly notification job error:', error);
  }
});

// Instant notifications (check every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  console.log('🔔 Running instant notification check...');
  
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, us.buy_box, us.last_notification_sent
      FROM users u
      JOIN user_settings us ON u.id = us.user_id
      JOIN subscriptions s ON u.id = s.user_id
      WHERE us.notification_frequency = 'instant'
      AND s.status = 'active'
      AND s.plan != 'free'
      AND (us.last_notification_sent IS NULL OR us.last_notification_sent < NOW() - INTERVAL '15 minutes')
    `);

    console.log(`  Found ${result.rows.length} users for instant notifications`);

    for (const user of result.rows) {
      await checkAndNotifyUser(user, { buy_box: user.buy_box }, 'instant');
    }

  } catch (error) {
    console.error('❌ Instant notification job error:', error);
  }
});

// CRM task reminders (every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  try {
    await processDueReminders();
  } catch (error) {
    console.error('❌ CRM reminder job error:', error);
  }
});

// CRM daily digest (9:00 AM — opt-in via preferences.crmEmailDigest)
cron.schedule('0 9 * * *', async () => {
  try {
    await sendCrmDailyDigests();
  } catch (error) {
    console.error('❌ CRM daily digest error:', error);
  }
});

function generateEmailBody(deals, frequency) {
  const dealsHtml = deals.slice(0, 10).map(deal => `
    <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0;">${deal.name || 'Unnamed Business'}</h3>
      ${deal.askingPrice ? `<p><strong>Price:</strong> $${deal.askingPrice.toLocaleString()}</p>` : ''}
      ${deal.revenue ? `<p><strong>Revenue:</strong> $${deal.revenue.toLocaleString()}</p>` : ''}
      ${deal.ebitda ? `<p><strong>EBITDA:</strong> $${deal.ebitda.toLocaleString()}</p>` : ''}
      ${deal.location ? `<p><strong>Location:</strong> ${deal.location}</p>` : ''}
      ${deal.industry ? `<p><strong>Industry:</strong> ${deal.industry}</p>` : ''}
      ${deal.url ? `<p><a href="${deal.url}" style="color: #667eea;">View Listing →</a></p>` : ''}
    </div>
  `).join('');

  const frequencyText = frequency === 'instant' ? 'New' : frequency === 'daily' ? 'Daily' : 'Weekly';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px;">📊 ${frequencyText} Deal Matches</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">You have ${deals.length} deal${deals.length > 1 ? 's' : ''} matching your buy box</p>
      </div>
      
      <div>
        ${dealsHtml}
        ${deals.length > 10 ? `<p style="text-align: center; color: #666;">...and ${deals.length - 10} more</p>` : ''}
      </div>
      
      <div style="margin-top: 30px; padding: 20px; background: #f5f7fa; border-radius: 8px; text-align: center;">
        <a href="${process.env.WEB_APP_URL}/dashboard" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View All Matches</a>
      </div>
      
      <div style="margin-top: 20px; text-align: center; color: #999; font-size: 12px;">
        <p>Manage your notification preferences in <a href="${process.env.WEB_APP_URL}/settings" style="color: #667eea;">Settings</a></p>
      </div>
    </body>
    </html>
  `;
}

console.log('✅ Notification scheduler initialized');
console.log('   - Daily: 9:00 AM every day');
console.log('   - Weekly: 9:00 AM every Monday');
console.log('   - Instant: Every 15 minutes (paid users only)');
