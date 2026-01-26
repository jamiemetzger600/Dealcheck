# Deal Details View - User Guide

## Overview
Version 2.2.1 introduces a comprehensive deal details viewing system that allows you to click on any deal in the aggregator table to view complete information in either a sidebar or popup modal.

## How to Use

### Viewing Deal Details

1. **Navigate to Deal Aggregator Tab**
   - Open the Deals Dashboard
   - Ensure you're on the "Deal Aggregator" tab (🔍 Deal Aggregator)

2. **Click on Any Deal**
   - Click anywhere on a deal row in the aggregator table
   - The deal details will open in your preferred view mode

3. **View Comprehensive Information**
   - **Overview**: Deal name, source, discovery date, buy box match status
   - **Financial Information**: Asking price, EBITDA/SDE, revenue, cash flow
   - **Location & Industry**: Geographic location and industry classification
   - **Description**: Full deal description (when available)
   - **Link**: Direct link to original listing
   - **Additional Fields**: All raw data fields from the source

### Configuring Your View Preference

1. **Open Settings**
   - Click "⚙️ Configure Buy Box" button in the top controls

2. **Find Display Preferences**
   - Scroll down to the "⚙️ Display Preferences" section
   - Locate the "Deal Details View" dropdown

3. **Choose Your Preferred Mode**
   - **Sidebar (Default)**: Slides in from the right side
     - Best for: Quick scanning while keeping context
     - Allows you to see the deal list in the background
     - Smooth slide-in/out animation
   
   - **Popup Modal**: Center overlay
     - Best for: Focused review with full attention
     - Larger viewing area
     - Dimmed background for better focus

4. **Save Settings**
   - Click "💾 Save Buy Box" to save your preference
   - Your choice will be remembered for all future sessions

## View Modes Comparison

### Sidebar Mode (Default)
```
┌─────────────────────────────────────────────┐
│  Deal Aggregator Table                      │
│  ┌──────────────────────────────┐          │
│  │ Deal 1                       │          │
│  │ Deal 2                       │  ┌───────┤
│  │ Deal 3 (clicked)             │  │ DEAL  │
│  │ Deal 4                       │  │DETAILS│
│  │ Deal 5                       │  │       │
│  └──────────────────────────────┘  │ Slide │
│                                     │  In   │
└─────────────────────────────────────┴───────┘
```

**Advantages:**
- Keep context of deal list visible
- Quick to open and close
- Easy to compare multiple deals
- Less disruptive to workflow

### Popup Modal Mode
```
┌─────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════╗  │
│  ║                                       ║  │
│  ║         DEAL DETAILS                  ║  │
│  ║                                       ║  │
│  ║    [Full deal information here]       ║  │
│  ║                                       ║  │
│  ║                                       ║  │
│  ╚═══════════════════════════════════════╝  │
│         (Dimmed background)                 │
└─────────────────────────────────────────────┘
```

**Advantages:**
- Full focus on single deal
- Larger viewing area
- Better for detailed analysis
- Professional modal presentation

## Actions Available

### From Deal Details View

1. **💼 Save to My Deals**
   - Saves the deal to your personal deals list
   - Automatically closes the detail view
   - Deal appears in "My Deals" tab

2. **🔗 Open Link**
   - Opens the original deal listing in a new tab
   - Keeps the detail view open
   - Disabled if no URL is available

3. **Close**
   - Multiple ways to close:
     - Click the × button in the header
     - Click the overlay/background (sidebar mode)
     - Press ESC key
     - Click "Close" button in footer (popup mode)

## Information Displayed

### 📊 Overview Section
- **Deal Name**: Full business name
- **Source**: Where the deal was discovered (RSS feed, Google Sheet, etc.)
- **Discovered**: How long ago the deal was added
- **Buy Box Match**: 🎯 if matches your criteria, ❌ if not

### 💰 Financial Information
- **Asking Price**: Listed sale price
- **EBITDA/SDE**: Earnings before interest, taxes, depreciation, and amortization
- **Revenue**: Annual revenue
- **Cash Flow**: Annual cash flow

### 📍 Location & Industry
- **Location**: City, State, or region
- **Industry**: Business category/sector

### 📝 Description
- Full business description (when available from source)
- May include details about operations, assets, opportunities

### 🔗 Link
- Direct link to original listing
- Opens in new tab when clicked

### 📋 Additional Information
- All raw fields from the data source
- May include: employees, years in business, facilities, inventory, etc.
- Limited to first 10 fields for readability

## Tips & Tricks

### Keyboard Shortcuts
- **ESC**: Close deal details view instantly
- Works in both sidebar and popup modes

### Quick Workflow
1. Browse deals in aggregator table
2. Click interesting deal to view details
3. Review information quickly
4. Save to My Deals or open original link
5. Press ESC to close and continue browsing

### Buy Box Integration
- Deals matching your buy box criteria show 🎯 indicator
- Helps you quickly identify qualified opportunities
- Configure buy box in settings to filter deals

### Journey Stage
- Viewing deal details automatically advances to KNOWLEDGE stage
- Shows your progress through the deal acquisition journey:
  - DATA → INFORMATION → **KNOWLEDGE** → INSIGHT → WISDOM

## Troubleshooting

### Detail View Not Opening
- Ensure you're clicking on a deal row in the aggregator table
- Check browser console for errors (F12)
- Try refreshing the page

### Preference Not Saving
- Make sure to click "💾 Save Buy Box" after changing preference
- Check that Chrome storage is enabled
- Verify no browser extensions are blocking storage

### Missing Information
- Some deals may not have all fields populated
- Depends on data quality from source
- Fields show "-" or "Not specified" when unavailable

### Performance
- Detail view loads instantly (no network requests)
- All data is already in memory from aggregator
- Smooth animations may be affected by browser performance

## Best Practices

### For Quick Scanning (Use Sidebar)
- Review multiple deals rapidly
- Keep deal list visible for context
- Quick save or pass decisions

### For Deep Analysis (Use Popup)
- Focus on single opportunity
- Review all details thoroughly
- Take notes or research in parallel

### Workflow Integration
1. **Filter** deals using buy box criteria
2. **Browse** aggregator table for matches
3. **Click** to view full details
4. **Analyze** financial and operational info
5. **Save** promising deals to My Deals
6. **Open** original listing for more info

## Related Features

- **Deal Aggregator**: Browse all discovered deals
- **Buy Box Configuration**: Set criteria for automatic filtering
- **My Deals**: Manage saved opportunities
- **Journey Stages**: Track progress through acquisition process

---

**Version**: 2.2.1  
**Last Updated**: January 25, 2026
