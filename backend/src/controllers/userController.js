import pool from '../db/pool.js';

// Get user settings
export const getUserSettings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        buy_box, 
        exclude_keywords, 
        exclude_lists, 
        current_exclude_list,
        hidden_deal_ids, 
        preferences, 
        custom_sources,
        auto_refresh_enabled,
        refresh_interval,
        notify_new_deals,
        notification_frequency,
        notification_channel,
        visible_columns,
        deal_view_style
      FROM user_settings 
      WHERE user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      // Create default settings if not exists
      await pool.query(
        'INSERT INTO user_settings (user_id) VALUES ($1)',
        [req.user.userId]
      );
      
      return res.json({
        buyBox: {},
        excludeKeywords: [],
        excludeLists: {},
        currentExcludeList: null,
        hiddenDealIds: [],
        preferences: {},
        customSources: [],
        autoRefreshEnabled: false,
        refreshInterval: 60,
        notifyNewDeals: true,
        notificationFrequency: 'daily',
        notificationChannel: 'email',
        visibleColumns: [],
        dealViewStyle: 'table'
      });
    }

    const settings = result.rows[0];

    res.json({
      buyBox: settings.buy_box || {},
      excludeKeywords: settings.exclude_keywords || [],
      excludeLists: settings.exclude_lists || {},
      currentExcludeList: settings.current_exclude_list,
      hiddenDealIds: settings.hidden_deal_ids || [],
      preferences: settings.preferences || {},
      customSources: settings.custom_sources || [],
      autoRefreshEnabled: settings.auto_refresh_enabled,
      refreshInterval: settings.refresh_interval,
      notifyNewDeals: settings.notify_new_deals,
      notificationFrequency: settings.notification_frequency,
      notificationChannel: settings.notification_channel,
      visibleColumns: settings.visible_columns || [],
      dealViewStyle: settings.deal_view_style
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user settings
export const updateUserSettings = async (req, res) => {
  const {
    buyBox,
    excludeKeywords,
    excludeLists,
    currentExcludeList,
    hiddenDealIds,
    preferences,
    customSources,
    autoRefreshEnabled,
    refreshInterval,
    notifyNewDeals,
    notificationFrequency,
    notificationChannel,
    visibleColumns,
    dealViewStyle
  } = req.body;

  try {
    const updateFields = [];
    const values = [req.user.userId];
    let paramIndex = 2;

    if (buyBox !== undefined) {
      updateFields.push(`buy_box = $${paramIndex++}`);
      values.push(JSON.stringify(buyBox));
    }
    if (excludeKeywords !== undefined) {
      updateFields.push(`exclude_keywords = $${paramIndex++}`);
      values.push(JSON.stringify(excludeKeywords));
    }
    if (excludeLists !== undefined) {
      updateFields.push(`exclude_lists = $${paramIndex++}`);
      values.push(JSON.stringify(excludeLists));
    }
    if (currentExcludeList !== undefined) {
      updateFields.push(`current_exclude_list = $${paramIndex++}`);
      values.push(currentExcludeList);
    }
    if (hiddenDealIds !== undefined) {
      updateFields.push(`hidden_deal_ids = $${paramIndex++}`);
      values.push(JSON.stringify(hiddenDealIds));
    }
    if (preferences !== undefined) {
      updateFields.push(`preferences = $${paramIndex++}`);
      values.push(JSON.stringify(preferences));
    }
    if (customSources !== undefined) {
      updateFields.push(`custom_sources = $${paramIndex++}`);
      values.push(JSON.stringify(customSources));
    }
    if (autoRefreshEnabled !== undefined) {
      updateFields.push(`auto_refresh_enabled = $${paramIndex++}`);
      values.push(autoRefreshEnabled);
    }
    if (refreshInterval !== undefined) {
      updateFields.push(`refresh_interval = $${paramIndex++}`);
      values.push(refreshInterval);
    }
    if (notifyNewDeals !== undefined) {
      updateFields.push(`notify_new_deals = $${paramIndex++}`);
      values.push(notifyNewDeals);
    }
    if (notificationFrequency !== undefined) {
      updateFields.push(`notification_frequency = $${paramIndex++}`);
      values.push(notificationFrequency);
    }
    if (notificationChannel !== undefined) {
      updateFields.push(`notification_channel = $${paramIndex++}`);
      values.push(notificationChannel);
    }
    if (visibleColumns !== undefined) {
      updateFields.push(`visible_columns = $${paramIndex++}`);
      values.push(JSON.stringify(visibleColumns));
    }
    if (dealViewStyle !== undefined) {
      updateFields.push(`deal_view_style = $${paramIndex++}`);
      values.push(dealViewStyle);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await pool.query(
      `UPDATE user_settings SET ${updateFields.join(', ')} WHERE user_id = $1`,
      values
    );

    res.json({ message: 'Settings updated successfully' });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user entitlements (subscription info)
export const getUserEntitlements = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT status, plan, entitlements FROM subscriptions WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        status: 'none',
        plan: 'free',
        entitlements: [],
        features: {
          instantNotifications: false,
          unlimitedSavedDeals: false,
          advancedFilters: false
        }
      });
    }

    const subscription = result.rows[0];
    
    // Define features based on plan
    const features = {
      instantNotifications: subscription.plan !== 'free',
      unlimitedSavedDeals: subscription.plan !== 'free',
      advancedFilters: subscription.plan !== 'free'
    };

    res.json({
      status: subscription.status,
      plan: subscription.plan,
      entitlements: subscription.entitlements || [],
      features
    });

  } catch (error) {
    console.error('Get entitlements error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
