import pool from '../db/pool.js';
import {
  BUY_BOX_SLOT_COUNT,
  activeSlotExcludeColumns,
  criteriaFromSlot,
  ensureBuyBoxesInMergedPreferences,
  getExcludeListLibrary,
  normalizeUserBuyBoxes
} from '../lib/userBuyBoxes.js';

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
      
      const normalized = normalizeUserBuyBoxes({}, {}, {});
      const ex = activeSlotExcludeColumns(normalized.buyBoxes, normalized.activeBuyBoxIndex);
      const library = getExcludeListLibrary({}, normalized.buyBoxes, {});
      return res.json({
        buyBox: normalized.activeCriteria,
        buyBoxes: normalized.buyBoxes,
        activeBuyBoxIndex: normalized.activeBuyBoxIndex,
        excludeKeywords: ex.excludeKeywords,
        excludeLists: library,
        currentExcludeList: ex.currentExcludeList,
        hiddenDealIds: [],
        preferences: {
          buyBoxes: normalized.buyBoxes,
          activeBuyBoxIndex: normalized.activeBuyBoxIndex
        },
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
    const normalized = normalizeUserBuyBoxes(settings.buy_box, settings.preferences, {
      excludeKeywords: settings.exclude_keywords,
      excludeLists: settings.exclude_lists,
      currentExcludeList: settings.current_exclude_list
    });
    const ex = activeSlotExcludeColumns(normalized.buyBoxes, normalized.activeBuyBoxIndex);
    const library = getExcludeListLibrary(
      settings.preferences,
      normalized.buyBoxes,
      { excludeLists: settings.exclude_lists }
    );

    const preferences = {
      ...(settings.preferences || {}),
      buyBoxes: normalized.buyBoxes,
      activeBuyBoxIndex: normalized.activeBuyBoxIndex
    };

    res.json({
      buyBox: normalized.activeCriteria,
      buyBoxes: normalized.buyBoxes,
      activeBuyBoxIndex: normalized.activeBuyBoxIndex,
      excludeKeywords: ex.excludeKeywords,
      excludeLists: library,
      currentExcludeList: ex.currentExcludeList,
      hiddenDealIds: settings.hidden_deal_ids || [],
      preferences,
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

/** Merge incoming preferences into existing (never overwrite entire object). One-level deep for nested objects like calculatorDefaults. */
function mergePreferences(existing, incoming) {
  if (!incoming || typeof incoming !== 'object') return existing || {};
  const existingObj = existing && typeof existing === 'object' ? existing : {};
  const merged = { ...existingObj };
  for (const key of Object.keys(incoming)) {
    const existingVal = merged[key];
    const incomingVal = incoming[key];
    if (incomingVal !== null && typeof incomingVal === 'object' && !Array.isArray(incomingVal) &&
        existingVal !== null && typeof existingVal === 'object' && !Array.isArray(existingVal)) {
      merged[key] = { ...existingVal, ...incomingVal };
    } else {
      merged[key] = incomingVal;
    }
  }
  return merged;
}

// Update user settings
export const updateUserSettings = async (req, res) => {
  const {
    buyBox,
    excludeKeywords,
    excludeLists,
    currentExcludeList,
    hiddenDealIds,
    preferences: incomingPreferences,
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
    let preferencesToWrite = null;
    const patchExcludeInBody =
      excludeKeywords !== undefined ||
      excludeLists !== undefined ||
      currentExcludeList !== undefined;

    let row = null;
    const loadRow = async () => {
      if (row) return row;
      const r = await pool.query(
        `SELECT buy_box, preferences, exclude_keywords, exclude_lists, current_exclude_list FROM user_settings WHERE user_id = $1`,
        [req.user.userId]
      );
      if (!r.rows.length) return null;
      row = r.rows[0];
      return row;
    };

    if (incomingPreferences !== undefined) {
      const r = await loadRow();
      if (!r) {
        return res.status(404).json({ error: 'User settings not found' });
      }
      preferencesToWrite = mergePreferences(r.preferences || {}, incomingPreferences);
    }

    if (patchExcludeInBody) {
      const r = await loadRow();
      if (!r) {
        return res.status(404).json({ error: 'User settings not found' });
      }
      const base = preferencesToWrite !== null ? preferencesToWrite : (r.preferences || {});
      const prefs = ensureBuyBoxesInMergedPreferences(base, r);
      const idx = Math.min(
        BUY_BOX_SLOT_COUNT - 1,
        Math.max(0, Number(prefs.activeBuyBoxIndex) || 0)
      );
      const boxes = prefs.buyBoxes.map((b) => ({ ...b }));
      boxes[idx] = { ...boxes[idx] };
      if (excludeKeywords !== undefined) boxes[idx].excludeKeywords = excludeKeywords;
      if (excludeLists !== undefined) boxes[idx].excludeLists = excludeLists;
      if (currentExcludeList !== undefined) {
        boxes[idx].currentExcludeList = currentExcludeList || '';
      }
      preferencesToWrite = { ...prefs, buyBoxes: boxes, activeBuyBoxIndex: idx };
      if (excludeLists !== undefined) {
        preferencesToWrite.excludeListLibrary = excludeLists;
      }
    }

    const updateFields = [];
    const values = [req.user.userId];
    let paramIndex = 2;

    if (hiddenDealIds !== undefined) {
      updateFields.push(`hidden_deal_ids = $${paramIndex++}`);
      values.push(JSON.stringify(hiddenDealIds));
    }
    if (preferencesToWrite !== null) {
      const r = await loadRow();
      if (!r) {
        return res.status(404).json({ error: 'User settings not found' });
      }
      preferencesToWrite = ensureBuyBoxesInMergedPreferences(preferencesToWrite, r);
      updateFields.push(`preferences = $${paramIndex++}`);
      values.push(JSON.stringify(preferencesToWrite));
      const ex = activeSlotExcludeColumns(preferencesToWrite.buyBoxes, preferencesToWrite.activeBuyBoxIndex);
      const library = getExcludeListLibrary(
        preferencesToWrite,
        preferencesToWrite.buyBoxes,
        { excludeLists: r.exclude_lists }
      );
      if (ex) {
        updateFields.push(`exclude_keywords = $${paramIndex++}`);
        values.push(JSON.stringify(ex.excludeKeywords));
        updateFields.push(`exclude_lists = $${paramIndex++}`);
        values.push(JSON.stringify(library));
        updateFields.push(`current_exclude_list = $${paramIndex++}`);
        values.push(ex.currentExcludeList);
      }
    }

    let buyBoxColumnPayload;
    if (buyBox !== undefined) {
      buyBoxColumnPayload = buyBox;
    } else if (
      preferencesToWrite !== null &&
      Array.isArray(preferencesToWrite.buyBoxes) &&
      preferencesToWrite.buyBoxes.length === BUY_BOX_SLOT_COUNT
    ) {
      const idx = Math.min(
        BUY_BOX_SLOT_COUNT - 1,
        Math.max(0, Number(preferencesToWrite.activeBuyBoxIndex) || 0)
      );
      buyBoxColumnPayload = criteriaFromSlot(preferencesToWrite.buyBoxes[idx]);
    }
    if (buyBoxColumnPayload !== undefined) {
      updateFields.push(`buy_box = $${paramIndex++}`);
      values.push(JSON.stringify(buyBoxColumnPayload));
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
