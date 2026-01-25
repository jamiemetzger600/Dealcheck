# Custom Sources & Manual Deal Entry Guide - v2.0.0

## 🎯 Overview

Version 2.0.0 now supports **three ways to add deals** to your aggregator:

1. **RSS Feeds** - Automatic (Nationwide Businesses, BizWorldUSA)
2. **Custom Sources** - Your own Google Sheets or CSV files
3. **Manual Entry** - Off-market deals (word-of-mouth, networking)

---

## 📊 Feature 1: Google Sheets Integration

### Use Case
You maintain a Google Sheet with deals updated daily from your network, broker relationships, or custom research. Now you can automatically import those deals into the aggregator!

### Setup Steps

**1. Prepare Your Google Sheet**
Create a spreadsheet with columns (any of these names work):
- **Name**: `Name`, `Business Name`, `Deal Name`, `Title`
- **Price**: `Price`, `Asking Price`, `Asking`, `Sale Price`
- **EBITDA**: `EBITDA`, `SDE`, `Cash Flow`, `Earnings`
- **Location**: `Location`, `City`, `Address`, `Region`
- **Industry**: `Industry`, `Sector`, `Category`, `Type`
- **URL**: `URL`, `Link`, `Listing URL`, `Website`
- **Description**: `Description`, `Details`, `Summary`, `About`

Example:
```
| Business Name              | Asking Price | EBITDA   | Location       | Industry      |
|----------------------------|--------------|----------|----------------|---------------|
| Dallas Manufacturing Co.   | $3,200,000   | $850,000 | Dallas, TX     | Manufacturing |
| Healthcare SaaS Platform   | $2.5M        | 720K     | Austin, TX     | SaaS          |
| Restaurant Chain           | 1500000      | 380000   | Houston, TX    | Restaurant    |
```

**2. Share Your Google Sheet**
- Click "Share" button in Google Sheets
- Set to: **"Anyone with the link can view"**
- Copy the sharing URL

**3. Add to Deal Aggregator**
- Open Deal Aggregator tab
- Click **"📥 Manage Sources"**
- Click **"📊 Google Sheets"** card
- Enter:
  - **Source Name**: "My Daily Deal List"
  - **URL**: Paste your Google Sheets URL
- Click **"➕ Add Source"**

**4. Fetch Deals**
- Your source appears in the list
- Click **"🔄 Fetch"** button
- Deals are parsed and added to aggregator!
- Will show: "✅ Added X deals from My Daily Deal List"

### Supported Price Formats
The parser automatically handles:
- `$2,500,000` (with commas)
- `$2.5M` (millions)
- `$750K` (thousands)
- `2500000` (plain numbers)

### Column Mapping
The system automatically detects columns even if names vary:
- `Asking Price`, `Price`, `Sale Price` → All map to askingPrice
- `EBITDA`, `SDE`, `Cash Flow` → All map to ebitda
- Flexible and forgiving!

---

## 📄 Feature 2: CSV File Integration

### Use Case
You have a CSV export from:
- Your CRM
- Another deal sourcing tool
- A database export
- A broker's deal list

### Setup Steps

**1. Host Your CSV**
Upload your CSV file to a public URL:
- Dropbox public link
- Google Drive (share as "Anyone with link")
- Your own website
- GitHub raw file URL

**2. Add to Aggregator**
- Click **"📥 Manage Sources"**
- Click **"📄 CSV File/URL"** card
- Enter:
  - **Source Name**: "CRM Export"
  - **URL**: Direct URL to CSV file
- Click **"➕ Add Source"**

**3. Fetch Automatically**
- Click **"🔄 Fetch"** to import deals
- Parser handles same flexible columns as Google Sheets

### Example CSV Format
```csv
Name,Asking Price,EBITDA,Location,Industry
Manufacturing Co.,$3.2M,$850K,"Dallas, TX",Manufacturing
SaaS Platform,$2.5M,$720K,"Austin, TX",SaaS
```

---

## ➕ Feature 3: Manual Deal Entry (Off-Market)

### Use Case
You heard about a deal that's NOT listed anywhere:
- Friend selling their business
- Met owner at networking event
- Direct outreach to business owner
- Private sale opportunity
- Word-of-mouth referral

### How to Add

**1. Click "➕ Add Deal" Button**
Located in the aggregator controls (top bar)

**2. Fill Out the Form**

**📋 Basic Information**
- Business Name (required)
- Description

**📍 Location & Industry**
- City
- State
- Industry (dropdown)

**💰 Financial Information**
- Asking Price
- Annual Revenue
- EBITDA/SDE
- Cash Flow

**📞 Contact Information**
- Contact Name
- Phone Number
- Email

**📝 Additional Notes**
- How did you hear about this deal?
- Private notes

**3. Click "💾 Save Deal"**
- Deal added to aggregator
- ALSO saved directly to "My Deals" (since off-market deals are usually hot)
- Contact info preserved for follow-up

### Why It's Useful
- Track ALL deal opportunities in one place
- Don't lose referrals or networking contacts
- Calculate max price before reaching out
- Professional organization from first contact

---

## 🔄 Managing Your Sources

### Source Management Interface

Click **"📥 Manage Sources"** to see all your sources:

```
┌─────────────────────────────────────────────┐
│ Your Custom Sources                          │
├─────────────────────────────────────────────┤
│ My Daily Deal List                          │
│ Type: google_sheets | Deals: 156 | Last: 2h│
│ [✓ Enabled] [🔄 Fetch] [🗑️]                 │
├─────────────────────────────────────────────┤
│ CRM Export                                  │
│ Type: csv_url | Deals: 43 | Last: 1d       │
│ [✓ Enabled] [🔄 Fetch] [🗑️]                 │
└─────────────────────────────────────────────┘
```

### Actions Available

**✓ Enabled / Disabled**
- Toggle to include/exclude in aggregation
- Disabled sources won't fetch when clicking "Start Aggregating Deals"

**🔄 Fetch**
- Manually fetch deals from this source right now
- Updates deal count
- Shows success notification

**🗑️ Delete**
- Remove source from list
- Confirmation dialog protects against accidents
- Already aggregated deals remain

---

## 🚀 Aggregation Workflow

### Combined Aggregation

When you click **"Start Aggregating Deals"**, the system:

1. Fetches built-in RSS feeds (Nationwide Businesses, BizWorldUSA)
2. Fetches all enabled custom sources (Google Sheets, CSV)
3. Deduplicates by deal ID
4. Adds to aggregated pool
5. Shows total: "✅ Added X deals from Y sources"

### Daily Workflow Example

**Morning:**
1. Update your Google Sheet with new deals from brokers
2. Open Deal Aggregator
3. Click "Start Aggregating Deals"
4. 200+ new deals added automatically
5. Apply your buy box filters (coming Phase 3)
6. Review matches, save promising deals

**Throughout Day:**
1. Meet owner at networking event
2. Click "➕ Add Deal" button
3. Enter details while fresh in memory
4. Deal saved instantly
5. Follow up later from "My Deals"

---

## 📝 Google Sheets Template

Create a copy of this template structure:

```
| Business Name          | Asking Price | EBITDA | Revenue | Location    | Industry      | URL                  | Description        |
|------------------------|--------------|--------|---------|-------------|---------------|----------------------|--------------------|
| Manufacturing Co.      | $3,200,000   | 850000 | 4500000 | Dallas, TX  | Manufacturing | https://example.com  | Established 1995   |
| SaaS Platform          | $2.5M        | 720K   | 1.8M    | Austin, TX  | SaaS          | https://example.com  | Growing tech co    |
```

**Tips:**
- Use consistent formats for easier parsing
- Include as many columns as possible (more data = better filtering)
- Update daily for best results
- Can use formulas to calculate fields

---

## 🔒 Privacy & Security

**Your Data is Safe:**
- Google Sheets: Read-only access via export URL
- No authentication required (uses public sharing)
- No data sent to third parties
- Everything stored locally in Chrome
- (Cloud sync coming Phase 7)

**Best Practices:**
- Don't include sensitive information in public sheets
- Use "view only" sharing (not edit access)
- Regularly review your sources
- Delete unused sources

---

## 🐛 Troubleshooting

### Google Sheets Not Loading

**Issue:** "Error fetching Google Sheets"

**Solutions:**
1. Verify sheet is shared as "Anyone with link can view"
2. Check URL is complete (includes /edit#gid=...)
3. Sheet must not be password protected
4. Try opening the sheet in incognito mode to verify it's public

### CSV Not Parsing

**Issue:** "Error parsing CSV"

**Solutions:**
1. Verify CSV is publicly accessible (test URL in browser)
2. Check file is valid CSV format
3. Ensure headers match expected column names
4. Use quotes for fields with commas: "Dallas, TX"

### Duplicate Deals

**Issue:** Same deal appears multiple times

**Solutions:**
- System deduplicates by URL (if provided)
- Manual deals get unique IDs
- Future: Enhanced duplicate detection coming (Phase 7)

---

## 📊 Example Use Cases

### Use Case 1: Broker Network
*"I have relationships with 5 brokers who send me weekly deal lists via email"*

**Solution:**
1. Forward emails to yourself
2. Copy deals to Google Sheet
3. Add Google Sheet as source
4. Fetch weekly to aggregate all broker deals

### Use Case 2: Industry-Specific Research
*"I track SaaS businesses for sale across multiple sources"*

**Solution:**
1. Create Google Sheet with SaaS deals
2. Research and add deals manually to sheet
3. Import to aggregator
4. Use buy box to filter by your criteria

### Use Case 3: Private Networking
*"I meet business owners at conferences who want to sell"*

**Solution:**
1. During conversation, click "➕ Add Deal"
2. Enter details on phone (web dashboard)
3. Add contact info while you have it
4. Follow up later with full analysis

---

## 🎯 Next Steps

With custom sources, you can now:
- Import your existing deal lists
- Add off-market opportunities
- Centralize all deal flow
- Never lose a lead again

**Coming in Phase 3:**
- Buy Box filtering to automatically match deals
- AI scoring to rank your custom deals
- Alerts when new deals match your criteria

---

## 📞 Support

**Questions about column mapping?**
The system searches for these keywords in headers (case-insensitive):
- Price: "price", "asking", "sale"
- EBITDA: "ebitda", "sde", "cash flow", "earnings"
- Location: "location", "city", "address", "region"
- Industry: "industry", "sector", "category", "type"

If your columns don't match, rename headers in your sheet!

---

**Ready to import your deals? Click "📥 Manage Sources" to get started!** 🚀
