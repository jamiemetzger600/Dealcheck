from vettr_scraper.utils.field_parsers import parse_price, normalize_state


class SchemaMapperPipeline:
    """Normalize raw extracted values into clean typed fields."""

    def process_item(self, item, spider):
        for field in ('asking_price', 'annual_revenue', 'annual_profit'):
            if item.get(field) and isinstance(item[field], str):
                item[field] = parse_price(item[field])

        if item.get('state'):
            item['state'] = normalize_state(item['state'])

        if not item.get('country'):
            item['country'] = 'US'

        if item.get('description') and isinstance(item['description'], list):
            item['description'] = ' '.join(item['description']).strip()

        if item.get('industries') and isinstance(item['industries'], str):
            item['industries'] = [item['industries']]

        # Compute multiples if we have the data
        price = item.get('asking_price')
        profit = item.get('annual_profit')
        revenue = item.get('annual_revenue')
        if price and profit and isinstance(price, (int, float)) and isinstance(profit, (int, float)) and profit > 0:
            item['profit_multiple'] = round(price / profit, 2)
        if price and revenue and isinstance(price, (int, float)) and isinstance(revenue, (int, float)) and revenue > 0:
            item['revenue_multiple'] = round(price / revenue, 2)

        return item
