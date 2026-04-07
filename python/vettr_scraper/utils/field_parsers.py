import re

US_STATES = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
}

VALID_ABBREVS = set(US_STATES.values())


def parse_price(raw):
    """
    Convert price strings to float.
    Handles: '$1,200,000', '1.2M', '500K', '$2.5 million', 'Not Disclosed', etc.
    Returns None if unparseable.
    """
    if raw is None:
        return None
    if not isinstance(raw, str):
        try:
            return float(raw)
        except (ValueError, TypeError):
            return None

    text = raw.strip().lower()
    if not text or text in ('not disclosed', 'n/a', 'na', '-', 'undisclosed', 'call', 'tbd'):
        return None

    text = text.replace('$', '').replace(',', '').strip()

    multiplier = 1
    if text.endswith('m') or 'million' in text:
        multiplier = 1_000_000
        text = re.sub(r'\s*(m|million)\s*$', '', text)
    elif text.endswith('k') or 'thousand' in text:
        multiplier = 1_000
        text = re.sub(r'\s*(k|thousand)\s*$', '', text)

    match = re.search(r'[\d.]+', text)
    if not match:
        return None

    try:
        return float(match.group()) * multiplier
    except ValueError:
        return None


def normalize_state(raw):
    """
    Normalize state to 2-letter abbreviation.
    Handles: 'California', 'CA', 'ca', 'CALIFORNIA'.
    """
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None

    upper = text.upper()
    if upper in VALID_ABBREVS:
        return upper

    lookup = US_STATES.get(text.lower())
    if lookup:
        return lookup

    return text[:2].upper() if len(text) == 2 else None
