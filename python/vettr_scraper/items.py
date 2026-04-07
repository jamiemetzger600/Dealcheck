import scrapy


class DealItem(scrapy.Item):
    """Canonical deal schema — maps 1:1 to the market_deals table."""

    # Identity
    source = scrapy.Field()
    source_id = scrapy.Field()
    listing_url = scrapy.Field()
    name = scrapy.Field()
    description = scrapy.Field()

    # Financials
    asking_price = scrapy.Field()
    annual_revenue = scrapy.Field()
    annual_profit = scrapy.Field()
    profit_multiple = scrapy.Field()
    revenue_multiple = scrapy.Field()

    # Location
    city = scrapy.Field()
    county = scrapy.Field()
    state = scrapy.Field()
    country = scrapy.Field()

    # Classification
    industries = scrapy.Field()
    franchise = scrapy.Field()
    remote_relocatable = scrapy.Field()
    five_plus_years = scrapy.Field()
    years_established = scrapy.Field()

    # Broker
    broker_name = scrapy.Field()
    broker_company = scrapy.Field()
    broker_contact = scrapy.Field()
    broker_email = scrapy.Field()

    # Dates from source site
    source_added_at = scrapy.Field()
    source_updated_at = scrapy.Field()

    # Pipeline metadata (not stored in DB)
    _raw_html = scrapy.Field()
    _confidence = scrapy.Field()
    _extraction_notes = scrapy.Field()
