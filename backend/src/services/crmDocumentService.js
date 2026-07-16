import pool from '../db/pool.js';
import { assertDealOwned } from './crmTaskService.js';

export async function listDealDocuments(userId, savedDealId) {
  await assertDealOwned(userId, savedDealId, { write: false });
  const result = await pool.query(
    `SELECT id, doc_type, filename, mime_type, notes, uploaded_at, user_id
     FROM deal_documents
     WHERE saved_deal_id = $1
     ORDER BY uploaded_at DESC`,
    [savedDealId]
  );
  return result.rows;
}

export async function addDealDocument(userId, savedDealId, { filename, docType = 'other', mimeType, notes, storageKey }) {
  await assertDealOwned(userId, savedDealId, { write: true });
  const name = (filename || '').trim();
  if (!name) {
    const err = new Error('Filename required');
    err.status = 400;
    throw err;
  }

  const result = await pool.query(
    `INSERT INTO deal_documents (user_id, saved_deal_id, doc_type, filename, mime_type, notes, storage_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, doc_type, filename, mime_type, notes, uploaded_at`,
    [userId, savedDealId, docType, name, mimeType || null, notes || null, storageKey || null]
  );

  await pool.query(
    `INSERT INTO activities (user_id, saved_deal_id, activity_type, body)
     VALUES ($1, $2, 'document_added', $3)`,
    [userId, savedDealId, `Document added: ${name}`]
  );

  return result.rows[0];
}
