import pool from '../db/pool.js';

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

// Save a new deal
export const saveDeal = async (req, res) => {
  const {
    dealId, name, url, description, broker, brokerName, brokerCompany,
    brokerEmail, brokerPhone, source, sourceType, discoveredAt,
    askingPrice, ebitda, revenue, location, city, state, county, country,
    industry, yearsEstablished, franchise, remote, listingId,
    notes, status, progressStage
  } = req.body;

  if (!dealId || !name) {
    return res.status(400).json({ error: 'Deal ID and name required' });
  }

  try {
    // Check if already saved
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
        notes, status, progress_stage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
      RETURNING id, saved_at`,
      [
        req.user.userId, dealId, name, url, description, broker, brokerName, brokerCompany,
        brokerEmail, brokerPhone, source, sourceType, discoveredAt,
        askingPrice, ebitda, revenue, location, city, state, county, country,
        industry, yearsEstablished, franchise, remote, listingId,
        notes, status || 'new', progressStage
      ]
    );

    res.status(201).json({
      message: 'Deal saved successfully',
      dealId: result.rows[0].id,
      savedAt: result.rows[0].saved_at
    });

  } catch (error) {
    console.error('Save deal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update a saved deal
export const updateSavedDeal = async (req, res) => {
  const { id } = req.params;
  const { notes, status, progressStage, progressHistory } = req.body;

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
