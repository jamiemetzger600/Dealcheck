from scrapy.exceptions import DropItem


class ValidationPipeline:
    """Drop items that fail critical validation. Flag warnings for non-critical issues."""

    def process_item(self, item, spider):
        if not item.get('source_id'):
            raise DropItem(f"Missing source_id: {item.get('listing_url')}")

        if not item.get('name') and not item.get('listing_url'):
            raise DropItem(f"Missing both name and URL for {item.get('source_id')}")

        if item.get('asking_price') is not None:
            try:
                item['asking_price'] = float(item['asking_price'])
                if item['asking_price'] <= 0:
                    item['asking_price'] = None
                    item.setdefault('_extraction_notes', []).append('asking_price was <= 0, set to null')
            except (ValueError, TypeError):
                item['asking_price'] = None
                item.setdefault('_extraction_notes', []).append('asking_price was non-numeric, set to null')

        if (item.get('annual_profit') and item.get('annual_revenue')
                and item['annual_profit'] > item['annual_revenue']):
            item.setdefault('_extraction_notes', []).append('WARNING: annual_profit > annual_revenue')

        return item
