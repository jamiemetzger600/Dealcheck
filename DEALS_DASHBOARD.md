# Deals Dashboard - Lightweight CRM

## Overview
The Deals Dashboard is a full-page interface for managing all your saved business deals. It opens in a new Chrome tab and provides powerful tools for organizing, filtering, and exporting your deal pipeline.

## Features

### 📊 Dashboard View
- **Full-page interface** - Opens in a new tab for maximum screen space
- **Statistics cards** - See total deals, hot leads, warm, and cold deals at a glance
- **Clean table view** - All deal information in an organized, sortable table

### 🔍 Search & Filter
- **Real-time search** - Search by deal name, URL, or notes
- **Status filter** - Filter by Hot, Warm, Cold, Pass, or No Status
- **Multi-column sorting** - Sort by:
  - Date (newest/oldest first)
  - Name (A-Z or Z-A)
  - Price (highest/lowest)
  - Quality Score (best/worst)

### 🏷️ Deal Status Tags
- **🔥 Hot** - High-priority deals you're actively pursuing
- **🌡️ Warm** - Deals you're interested in but not urgent
- **❄️ Cold** - Deals on the back burner
- **❌ Pass** - Deals you've decided not to pursue
- **Change status** - Click the dropdown in any row to update

### ✅ Bulk Actions
- **Select multiple deals** - Use checkboxes to select deals
- **Select all** - Click the header checkbox to select all visible deals
- **Bulk delete** - Delete multiple deals at once (with confirmation)
- **Bulk export** - Export selected deals to CSV

### 📤 Export Functionality
- **Export to CSV** - Download deals as a spreadsheet
- **Single deal export** - Export individual deals
- **Bulk export** - Export multiple selected deals
- **Export all** - Export all filtered deals
- **Includes all data** - Asking price, EBITDA, quality score, ROI, notes, etc.

### 🎯 Individual Deal Actions
- **👁️ View** - Opens the original listing URL in a new tab
- **📤 Export** - Export single deal to CSV
- **🗑️ Delete** - Delete deal (with confirmation)

## How to Use

### Opening the Dashboard
1. Click the **📊 icon** in the Deal Analyzer header
2. Dashboard opens in a new Chrome tab
3. All your saved deals load automatically

### Managing Deals
1. **Search** - Type in the search box to filter deals
2. **Filter by status** - Use the status dropdown
3. **Sort** - Use the sort dropdown or click column headers
4. **Change status** - Click the status dropdown in any row
5. **Select deals** - Check boxes to select multiple deals
6. **Bulk actions** - Use the yellow action bar when deals are selected

### Exporting Deals
1. **Single deal**: Click the 📤 button in the Actions column
2. **Selected deals**: Select deals, then click "📤 Export Selected"
3. **All visible deals**: Click the "📤 Export" button in the controls

### Deleting Deals
1. **Single deal**: Click the 🗑️ button in the Actions column
2. **Multiple deals**: Select deals, then click "🗑️ Delete Selected"
3. **Confirmation required** - You'll be asked to confirm before deletion

## Performance

### Optimized for Scale
- **Handles hundreds of deals** - Efficient rendering and filtering
- **Real-time search** - Instant results as you type
- **Fast sorting** - Quick column sorting
- **Smooth scrolling** - Table scrolls smoothly even with many deals

### Data Storage
- All deals stored in Chrome's local storage
- No external servers or databases
- Your data stays private and local
- Syncs across the extension automatically

## CSV Export Format

Exported CSV files include:
- Deal Name
- Status
- Saved Date
- URL
- Asking Price
- EBITDA
- Quality Score
- COC Return
- Payback Period
- Max Price
- Total Debt
- FCF Annual
- Owner Take-Home
- Notes

## Tips & Best Practices

### Organization
- **Use status tags** - Keep your pipeline organized
- **Add descriptive names** - Make deals easy to find
- **Use notes** - Add context, questions, and follow-ups
- **Regular cleanup** - Archive or delete old deals

### Workflow
1. Save deals as you analyze them
2. Tag hot leads immediately
3. Use dashboard to review and compare deals
4. Export deals for sharing with partners/advisors
5. Update status as deals progress

### Search Tips
- Search by business name
- Search by location (if in URL)
- Search by notes keywords
- Combine with status filter for precision

## Version History

### v1.8.0 (Current)
- ✅ Full-page dashboard in new tab
- ✅ Search and filter functionality
- ✅ Deal status tags (Hot, Warm, Cold, Pass)
- ✅ Bulk selection and actions
- ✅ Delete (single and bulk)
- ✅ Export to CSV (single and bulk)
- ✅ Multi-column sorting
- ✅ Statistics cards
- ✅ Responsive design

## Future Enhancements (Roadmap)

### Phase 2 Features
- **Follow-up dates** - Set reminders for next actions
- **Deal stages** - Pipeline stages (Research → Offer → Due Diligence → Closing)
- **Comparison view** - Compare 2-3 deals side-by-side
- **Deal history** - Track changes/updates over time
- **Custom tags** - Create your own tags beyond Hot/Warm/Cold
- **Advanced filters** - Filter by price range, ROI range, etc.
- **Export to PDF** - Generate PDF reports
- **Share via email** - Email deals directly from dashboard

## Troubleshooting

### Dashboard won't open
- Make sure you've reloaded the extension after updating
- Check that you're using Chrome (not another browser)
- Try closing and reopening Chrome

### Deals not showing
- Click the "↻ Refresh" button
- Make sure you've saved deals first
- Check your search/filter settings

### Export not working
- Make sure pop-ups are allowed for the extension
- Check your Downloads folder
- Try exporting a single deal first

## Support

For issues or feature requests, please check the main README or contact support.

