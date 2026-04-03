import pool from './pool.js';

const migrations = [
  {
    name: 'create_users_table',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `
  },
  {
    name: 'create_user_settings_table',
    up: `
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Buy Box Config
        buy_box JSONB DEFAULT '{}'::jsonb,
        
        -- Exclude Keywords & Lists
        exclude_keywords JSONB DEFAULT '[]'::jsonb,
        exclude_lists JSONB DEFAULT '{}'::jsonb,
        current_exclude_list VARCHAR(255),
        
        -- Hidden Deals
        hidden_deal_ids JSONB DEFAULT '[]'::jsonb,
        
        -- User Preferences
        preferences JSONB DEFAULT '{}'::jsonb,
        
        -- Custom Sources
        custom_sources JSONB DEFAULT '[]'::jsonb,
        
        -- Auto-refresh settings
        auto_refresh_enabled BOOLEAN DEFAULT false,
        refresh_interval INTEGER DEFAULT 60,
        notify_new_deals BOOLEAN DEFAULT true,
        
        -- Notification frequency
        notification_frequency VARCHAR(20) DEFAULT 'daily' CHECK (notification_frequency IN ('instant', 'daily', 'weekly')),
        notification_channel VARCHAR(20) DEFAULT 'email' CHECK (notification_channel IN ('email', 'push')),
        last_notification_sent TIMESTAMP,
        
        -- UI state
        visible_columns JSONB DEFAULT '[]'::jsonb,
        deal_view_style VARCHAR(20) DEFAULT 'table',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
    `
  },
  {
    name: 'create_saved_deals_table',
    up: `
      CREATE TABLE IF NOT EXISTS saved_deals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Deal data (mirroring extension structure)
        deal_id VARCHAR(255) NOT NULL,
        name TEXT NOT NULL,
        url TEXT,
        description TEXT,
        broker TEXT,
        broker_name TEXT,
        broker_company TEXT,
        broker_email TEXT,
        broker_phone TEXT,
        source TEXT,
        source_type TEXT,
        discovered_at BIGINT,
        
        -- Financial data
        asking_price NUMERIC,
        ebitda NUMERIC,
        revenue NUMERIC,
        
        -- Location
        location TEXT,
        city TEXT,
        state TEXT,
        county TEXT,
        country TEXT,
        
        -- Other
        industry TEXT,
        years_established TEXT,
        franchise TEXT,
        remote TEXT,
        listing_id TEXT,
        
        -- User-added fields
        notes TEXT,
        status VARCHAR(50) DEFAULT 'none',
        progress_stage VARCHAR(50),
        progress_history JSONB DEFAULT '[]'::jsonb,
        
        -- Metadata
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(user_id, deal_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_saved_deals_user_id ON saved_deals(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_deals_status ON saved_deals(status);
    `
  },
  {
    name: 'create_subscriptions_table',
    up: `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Stripe data
        stripe_customer_id VARCHAR(255) UNIQUE,
        stripe_subscription_id VARCHAR(255),
        
        -- Subscription status
        status VARCHAR(50) DEFAULT 'none' CHECK (status IN ('active', 'canceled', 'past_due', 'none')),
        plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'monthly', 'yearly')),
        
        -- Entitlements (for one-time purchases or special features)
        entitlements JSONB DEFAULT '[]'::jsonb,
        
        -- Timestamps
        subscription_start TIMESTAMP,
        subscription_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
    `
  },
  {
    name: 'harmonize_deal_statuses',
    up: `
      UPDATE saved_deals SET status = 'none' WHERE status = 'new';
      UPDATE saved_deals SET status = 'pass' WHERE status = 'passed';
      UPDATE saved_deals SET status = 'warm' WHERE status IN ('reviewing', 'contacted');
      UPDATE saved_deals SET status = 'hot' WHERE status IN ('due-diligence', 'offer');
      DO $$ BEGIN
        ALTER TABLE saved_deals ALTER COLUMN status SET DEFAULT 'none';
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `
  },
  {
    name: 'create_airtable_deals_table',
    up: `
      CREATE TABLE IF NOT EXISTS airtable_deals (
        id SERIAL PRIMARY KEY,
        airtable_id INTEGER UNIQUE,
        name TEXT,
        description TEXT,
        industries TEXT[],
        listing_url TEXT,
        asking_price NUMERIC,
        annual_revenue NUMERIC,
        annual_profit NUMERIC,
        profit_multiple NUMERIC,
        revenue_multiple NUMERIC,
        city TEXT,
        county TEXT,
        state TEXT,
        country TEXT,
        years_established INTEGER,
        remote_relocatable TEXT,
        franchise TEXT,
        five_plus_years TEXT,
        broker_name TEXT,
        broker_company TEXT,
        broker_contact TEXT,
        broker_email TEXT,
        airtable_updated_at TIMESTAMP,
        airtable_added_at TIMESTAMP,
        first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_airtable_deals_airtable_id ON airtable_deals(airtable_id);
      CREATE INDEX IF NOT EXISTS idx_airtable_deals_state ON airtable_deals(state);
      CREATE INDEX IF NOT EXISTS idx_airtable_deals_asking_price ON airtable_deals(asking_price);
      CREATE INDEX IF NOT EXISTS idx_airtable_deals_last_scraped ON airtable_deals(last_scraped_at);
    `
  },
  {
    name: 'create_updated_at_trigger',
    up: `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
      CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_saved_deals_updated_at ON saved_deals;
      CREATE TRIGGER update_saved_deals_updated_at BEFORE UPDATE ON saved_deals
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
      CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `
  },
  {
    name: 'idx_airtable_deals_updated_added_at',
    up: `
      CREATE INDEX IF NOT EXISTS idx_airtable_deals_airtable_updated_at ON airtable_deals(airtable_updated_at);
      CREATE INDEX IF NOT EXISTS idx_airtable_deals_airtable_added_at ON airtable_deals(airtable_added_at);
    `
  },
  {
    name: 'create_market_deals_table',
    up: `
      CREATE TABLE IF NOT EXISTS market_deals (
        id SERIAL PRIMARY KEY,
        source VARCHAR(50) NOT NULL,
        source_id VARCHAR(255) NOT NULL,
        name TEXT,
        description TEXT,
        listing_url TEXT,
        industries TEXT[],
        asking_price NUMERIC,
        annual_revenue NUMERIC,
        annual_profit NUMERIC,
        profit_multiple NUMERIC,
        revenue_multiple NUMERIC,
        city TEXT,
        county TEXT,
        state TEXT,
        country TEXT,
        years_established INTEGER,
        remote_relocatable TEXT,
        franchise TEXT,
        five_plus_years TEXT,
        broker_name TEXT,
        broker_company TEXT,
        broker_contact TEXT,
        broker_email TEXT,
        source_added_at TIMESTAMP,
        source_updated_at TIMESTAMP,
        first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(source, source_id)
      );

      CREATE INDEX IF NOT EXISTS idx_market_deals_source ON market_deals(source);
      CREATE INDEX IF NOT EXISTS idx_market_deals_source_id ON market_deals(source, source_id);
      CREATE INDEX IF NOT EXISTS idx_market_deals_state ON market_deals(state);
      CREATE INDEX IF NOT EXISTS idx_market_deals_asking_price ON market_deals(asking_price);
      CREATE INDEX IF NOT EXISTS idx_market_deals_source_added_at ON market_deals(source_added_at);
      CREATE INDEX IF NOT EXISTS idx_market_deals_source_updated_at ON market_deals(source_updated_at);
      CREATE INDEX IF NOT EXISTS idx_market_deals_is_active ON market_deals(is_active);
      CREATE INDEX IF NOT EXISTS idx_market_deals_annual_profit ON market_deals(annual_profit);
      CREATE INDEX IF NOT EXISTS idx_market_deals_annual_revenue ON market_deals(annual_revenue);
    `
  },
  {
    name: 'create_deal_sources_table',
    up: `
      CREATE TABLE IF NOT EXISTS deal_sources (
        id SERIAL PRIMARY KEY,
        source_key VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(255),
        source_type VARCHAR(50),
        config JSONB DEFAULT '{}',
        scrape_enabled BOOLEAN DEFAULT TRUE,
        scrape_cron VARCHAR(50),
        last_scrape_at TIMESTAMP,
        last_scrape_result JSONB,
        deal_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO deal_sources (source_key, display_name, source_type, scrape_cron, scrape_enabled)
      VALUES ('airtable_bizbuysell', 'Airtable (BizBuySell)', 'airtable', '0 */12 * * *', true)
      ON CONFLICT (source_key) DO NOTHING;
    `
  },
  {
    name: 'migrate_airtable_deals_to_market_deals',
    up: `
      INSERT INTO market_deals (
        source, source_id, name, description, listing_url, industries,
        asking_price, annual_revenue, annual_profit, profit_multiple, revenue_multiple,
        city, county, state, country, years_established,
        remote_relocatable, franchise, five_plus_years,
        broker_name, broker_company, broker_contact, broker_email,
        source_added_at, source_updated_at, first_seen_at, last_scraped_at, is_active
      )
      SELECT
        'airtable_bizbuysell',
        airtable_id::text,
        name, description, listing_url, industries,
        asking_price, annual_revenue, annual_profit, profit_multiple, revenue_multiple,
        city, county, state, country, years_established,
        remote_relocatable, franchise, five_plus_years,
        broker_name, broker_company, broker_contact, broker_email,
        airtable_added_at, airtable_updated_at, first_seen_at, last_scraped_at, true
      FROM airtable_deals
      WHERE airtable_id IS NOT NULL
      ON CONFLICT (source, source_id) DO NOTHING;

      UPDATE deal_sources
      SET deal_count = (SELECT COUNT(*) FROM market_deals WHERE source = 'airtable_bizbuysell')
      WHERE source_key = 'airtable_bizbuysell';
    `
  },
  {
    name: 'market_deals_search_indexes',
    up: `
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      CREATE INDEX IF NOT EXISTS idx_market_deals_name_trgm ON market_deals USING gin (name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_market_deals_desc_trgm ON market_deals USING gin (description gin_trgm_ops);
    `
  },
  {
    name: 'market_deals_dedupe_and_unique',
    up: `
      UPDATE market_deals SET source_id = trim(both from source_id)
      WHERE source_id IS NOT NULL AND source_id <> trim(both from source_id);

      DELETE FROM market_deals md
      WHERE md.id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (PARTITION BY source, source_id ORDER BY id DESC) AS rn
          FROM market_deals
        ) sub WHERE rn > 1
      );

      DELETE FROM market_deals md
      WHERE md.id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY source, lower(trim(listing_url))
              ORDER BY id DESC
            ) AS rn
          FROM market_deals
          WHERE listing_url IS NOT NULL AND trim(listing_url) <> ''
        ) sub WHERE rn > 1
      );

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'market_deals'::regclass
            AND conname = 'market_deals_source_source_id_key'
        ) THEN
          ALTER TABLE market_deals ADD CONSTRAINT market_deals_source_source_id_key UNIQUE (source, source_id);
        END IF;
      END $$;
    `
  },
  {
    name: 'deal_sources_airtable_cron_12h',
    up: `
      UPDATE deal_sources
      SET scrape_cron = '0 */12 * * *'
      WHERE source_key = 'airtable_bizbuysell'
        AND (scrape_cron IS NULL OR scrape_cron = '0 */4 * * *' OR scrape_cron = '*/30 * * * *');
    `
  },
  {
    name: 'saved_deals_calculator_state',
    up: `
      ALTER TABLE saved_deals ADD COLUMN IF NOT EXISTS calculator_state JSONB DEFAULT NULL;
    `
  }
];

async function migrate() {
  console.log('🔄 Running database migrations...');
  
  try {
    for (const migration of migrations) {
      console.log(`  Running: ${migration.name}`);
      await pool.query(migration.up);
      console.log(`  ✅ ${migration.name} completed`);
    }
    
    console.log('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
