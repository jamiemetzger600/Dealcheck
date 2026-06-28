import pool from '../db/pool.js';

/** Normalize URL for matching: same listing may appear with different fragments/casing. */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  const withoutHash = u.split('#')[0];
  return withoutHash.toLowerCase();
}

// Get all saved deals for user
export const getSavedDeals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, deal_id, name, url, description, broker, broker_name, broker_company,
        broker_email, broker_phone, source, source_type, discovered_at,
        asking_price, ebitda, revenue, location, city, state, county, country,
        industry, years_established, franchise, remote, listing_id,
        notes, status, progress_stage, progress_history,
        calculator_state,
        saved_at, updated_at
      FROM saved_deals 
      WHERE user_id = $1 
      ORDER BY saved_at DESC`,
      [req.user.userId]
    );

    res.json({ deals: result.rows });

  } catch (error) {
    console.error('Get saved deals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Save a new deal (or update existing saved deal when same listing by URL — keeps one saved deal per listing, never removes)
export const saveDeal = async (req, res) => {
  const {
    dealId, name, url, description, broker, brokerName, brokerCompany,
    brokerEmail, brokerPhone, source, sourceType, discoveredAt,
    askingPrice, ebitda, revenue, location, city, state, county, country,
    industry, yearsEstablished, franchise, remote, listingId,
    notes, status, progressStage,
    calculatorState
  } = req.body;

  if (!dealId || !name) {
    return res.status(400).json({ error: 'Deal ID and name required' });
  }

  try {
    const normalizedUrl = normalizeUrl(url);

    // If we have a URL, check for existing saved deal with same listing (same normalized URL).
    // Update that row with new listing data instead of creating a duplicate; never remove saved deals.
    if (normalizedUrl) {
      const byUrl = await pool.query(
        `SELECT id, saved_at FROM saved_deals
         WHERE user_id = $1 AND url IS NOT NULL AND url != ''
         AND LOWER(TRIM(SPLIT_PART(url, '#', 1))) = $2`,
        [req.user.userId, normalizedUrl]
      );

      if (byUrl.rows.length > 0) {
        const existingId = byUrl.rows[0].id;
        await pool.query(
          `UPDATE saved_deals SET
            deal_id = $1, name = $2, url = $3, description = $4, broker = $5, broker_name = $6,
            broker_company = $7, broker_email = $8, broker_phone = $9, source = $10, source_type = $11,
            discovered_at = $12, asking_price = $13, ebitda = $14, revenue = $15,
            location = $16, city = $17, state = $18, county = $19, country = $20,
            industry = $21, years_established = $22, franchise = $23, remote = $24, listing_id = $25,
            calculator_state = COALESCE($26::jsonb, calculator_state),
            updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $27 AND id = $28`,
          [
            dealId, name, url || null, description || null, broker || null, brokerName || null, brokerCompany || null,
            brokerEmail || null, brokerPhone || null, source || null, sourceType || null, discoveredAt || null,
            askingPrice ?? null, ebitda ?? null, revenue ?? null,
            location || null, city || null, state || null, county || null, country || null,
            industry || null, yearsEstablished || null, franchise || null, remote || null, listingId || null,
            calculatorState !== undefined ? calculatorState : null,
            req.user.userId, existingId
          ]
        );
        return res.status(200).json({
          message: 'Deal already saved; listing info updated',
          vettrId: existingId,
          dealId: existingId,
          deal_id: dealId,
          savedAt: byUrl.rows[0].saved_at,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // No existing row by URL; check by deal_id (avoid duplicate by id)
    const existing = await pool.query(
      'SELECT id FROM saved_deals WHERE user_id = $1 AND deal_id = $2',
      [req.user.userId, dealId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Deal already saved' });
    }

    const result = await pool.query(
      `INSERT INTO saved_deals (
        user_id, deal_id, name, url, description, broker, broker_name, broker_company,
        broker_email, broker_phone, source, source_type, discovered_at,
        asking_price, ebitda, revenue, location, city, state, county, country,
        industry, years_established, franchise, remote, listing_id,
        notes, status, progress_stage, calculator_state
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
      RETURNING id, saved_at`,
      [
        req.user.userId, dealId, name, url, description, broker, brokerName, brokerCompany,
        brokerEmail, brokerPhone, source, sourceType, discoveredAt,
        askingPrice, ebitda, revenue, location, city, state, county, country,
        industry, yearsEstablished, franchise, remote, listingId,
        notes, status || 'none', progressStage,
        calculatorState !== undefined ? calculatorState : null
      ]
    );

    res.status(201).json({
      message: 'Deal saved successfully',
      vettrId: result.rows[0].id,
      dealId: result.rows[0].id,
      deal_id: dealId,
      savedAt: result.rows[0].saved_at,
      updatedAt: result.rows[0].saved_at
    });

  } catch (error) {
    console.error('Save deal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update a saved deal
export const updateSavedDeal = async (req, res) => {
  const { id } = req.params;
  const { 
    notes, status, progressStage, progressHistory,
    brokerName, brokerCompany, brokerPhone, brokerEmail,
    calculatorState,
    name, description, url,
    askingPrice, ebitda, revenue,
    location, city, state, county, country,
    industry, yearsEstablished, franchise, remote,
    source, sourceType, discoveredAt, listingId,
    broker
  } = req.body;

  try {
    const updateFields = [];
    const values = [req.user.userId, id];
    let paramIndex = 3;

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (progressStage !== undefined) {
      updateFields.push(`progress_stage = $${paramIndex++}`);
      values.push(progressStage);
    }
    if (progressHistory !== undefined) {
      updateFields.push(`progress_history = $${paramIndex++}`);
      values.push(JSON.stringify(progressHistory));
    }
    if (brokerName !== undefined) {
      updateFields.push(`broker_name = $${paramIndex++}`);
      values.push(brokerName);
    }
    if (brokerCompany !== undefined) {
      updateFields.push(`broker_company = $${paramIndex++}`);
      values.push(brokerCompany);
    }
    if (brokerPhone !== undefined) {
      updateFields.push(`broker_phone = $${paramIndex++}`);
      values.push(brokerPhone);
    }
    if (brokerEmail !== undefined) {
      updateFields.push(`broker_email = $${paramIndex++}`);
      values.push(brokerEmail);
    }
    if (calculatorState !== undefined) {
      updateFields.push(`calculator_state = $${paramIndex++}`);
      values.push(calculatorState);
    }
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (url !== undefined) {
      updateFields.push(`url = $${paramIndex++}`);
      values.push(url);
    }
    if (askingPrice !== undefined) {
      updateFields.push(`asking_price = $${paramIndex++}`);
      values.push(askingPrice);
    }
    if (ebitda !== undefined) {
      updateFields.push(`ebitda = $${paramIndex++}`);
      values.push(ebitda);
    }
    if (revenue !== undefined) {
      updateFields.push(`revenue = $${paramIndex++}`);
      values.push(revenue);
    }
    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      values.push(location);
    }
    if (city !== undefined) {
      updateFields.push(`city = $${paramIndex++}`);
      values.push(city);
    }
    if (state !== undefined) {
      updateFields.push(`state = $${paramIndex++}`);
      values.push(state);
    }
    if (county !== undefined) {
      updateFields.push(`county = $${paramIndex++}`);
      values.push(county);
    }
    if (country !== undefined) {
      updateFields.push(`country = $${paramIndex++}`);
      values.push(country);
    }
    if (industry !== undefined) {
      updateFields.push(`industry = $${paramIndex++}`);
      values.push(industry);
    }
    if (yearsEstablished !== undefined) {
      updateFields.push(`years_established = $${paramIndex++}`);
      values.push(yearsEstablished);
    }
    if (franchise !== undefined) {
      updateFields.push(`franchise = $${paramIndex++}`);
      values.push(franchise);
    }
    if (remote !== undefined) {
      updateFields.push(`remote = $${paramIndex++}`);
      values.push(remote);
    }
    if (source !== undefined) {
      updateFields.push(`source = $${paramIndex++}`);
      values.push(source);
    }
    if (sourceType !== undefined) {
      updateFields.push(`source_type = $${paramIndex++}`);
      values.push(sourceType);
    }
    if (discoveredAt !== undefined) {
      updateFields.push(`discovered_at = $${paramIndex++}`);
      values.push(discoveredAt);
    }
    if (listingId !== undefined) {
      updateFields.push(`listing_id = $${paramIndex++}`);
      values.push(listingId);
    }
    if (broker !== undefined) {
      updateFields.push(`broker = $${paramIndex++}`);
      values.push(broker);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await pool.query(
      `UPDATE saved_deals SET ${updateFields.join(', ')} 
       WHERE user_id = $1 AND id = $2 
       RETURNING id`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({ message: 'Deal updated successfully' });

  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete a saved deal
export const deleteSavedDeal = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM saved_deals WHERE user_id = $1 AND id = $2 RETURNING id',
      [req.user.userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({ message: 'Deal deleted successfully' });

  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
