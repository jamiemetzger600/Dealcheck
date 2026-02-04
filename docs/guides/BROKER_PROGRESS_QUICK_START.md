# Broker Information & Deal Progress - Quick Start Guide

## 🎯 Overview

Version 1.9.18 introduces **automatic broker information capture** and comprehensive **deal progress tracking**. The extension now intelligently extracts broker contact details from listing pages and allows you to track your deal pipeline with built-in and custom status updates.

---

## 🤖 Automatic Broker Information Capture

### How It Works

When you save a deal from a listing page, the extension automatically:

1. **Scans the page** for broker/agent information
2. **Extracts contact details:**
   - Broker/Agent name
   - Brokerage company name
   - Phone number
   - Email address
3. **Saves with your deal** - No manual data entry needed!

### What Gets Captured

✅ **Broker Names** - Detects names near "Broker", "Agent", "Representative" labels  
✅ **Company Names** - Identifies firms with LLC, Inc, Corp, Ltd, etc.  
✅ **Phone Numbers** - Recognizes various formats: (555) 123-4567, +1-555-123-4567  
✅ **Email Addresses** - Finds contact emails (excludes generic like info@, support@)

### Platform Coverage

Works on all major platforms:
- BizBuySell
- BizQuest
- Crexi
- LoopNet
- Zillow (commercial)
- Redfin (commercial)
- Generic business listing sites

---

## ✏️ Manual Editing

### Always Editable

- All broker fields are **fully editable**
- Correct any auto-captured information
- Add missing details the scraper didn't find
- Update information as it changes

### How to Edit

1. Open **Deals Dashboard** (📊 icon)
2. Click on any **deal name** to open details
3. Scroll to **"👔 Broker Information"** section
4. Edit any field
5. Click **"💾 Save Broker Info"**
6. See success confirmation ✅

---

## 📋 Deal Progress Tracking

### Built-in Status Options

Track your deal through these standard stages:

**Pre-Underwriting:**
- Requested NDA
- Signed NDA
- Deal Room Access

**Underwriting Phase:**
- Underwriting Began
- Underwriting Complete

**Financing:**
- Bank Pre-Approval

**Offers:**
- IOI Sent / IOI Accepted / IOI Declined
- LOI Sent / LOI Accepted / LOI Declined

**Other:**
- Awaiting Seller Response

### Adding Progress Updates

1. Open a deal in the dashboard
2. Go to **"📋 Deal Progress Tracking"**
3. Select status from **dropdown**
4. Progress automatically saved with timestamp
5. See update appear in **history list** below

### Custom Status Options

Create your own status options:

1. In Progress Tracking section
2. Enter your status in **"Add Custom Status"** field
   - Examples: "Site Visit Scheduled", "Final Due Diligence", "Attorney Review"
3. Click **"+ Add"** button
4. Custom status now appears in dropdown
5. Use like any built-in status

**Note:** Custom statuses are deal-specific, allowing different workflows for different types of acquisitions.

### Progress History

View complete timeline of your deal:
- 📌 Each status update shown with icon
- Automatic timestamps (date and time)
- Newest updates appear first
- Delete any entry with **×** button
- Scrollable list for long histories

---

## 📤 CSV Export

All broker and progress information exports to CSV:

- **Broker Name** column
- **Broker Company** column
- **Broker Phone** column
- **Broker Email** column
- **Latest Progress** column (most recent status)

Export options:
- Single deal: Click **📤 Export** on deal row
- Multiple deals: Select with checkboxes, click **"📤 Export Selected"**
- All filtered: Apply filters, click main **"📤 Export"** button

---

## 💡 Tips & Best Practices

### For Broker Information:

✅ **Review after save** - Check auto-captured info for accuracy  
✅ **Update as needed** - Brokers change, contact info updates  
✅ **Add notes** - Use notes field for additional contact details  
✅ **Multiple contacts** - Use notes for secondary contacts  

### For Progress Tracking:

✅ **Update immediately** - Track status changes in real-time  
✅ **Use custom statuses** - Match your specific workflow  
✅ **Review history** - See how long deals spend in each stage  
✅ **Clean up errors** - Delete mistaken entries easily  
✅ **Consistent naming** - Use same custom statuses across similar deals  

---

## 🔍 Troubleshooting

### "Broker information not captured"

**Possible reasons:**
- Listing page doesn't publicly show broker info
- Page structure not yet supported (will improve over time)
- Broker info in image/PDF format (can't be scraped)

**Solution:** Manually enter the information - all fields are editable!

### "Wrong information in broker fields"

**Possible reasons:**
- Page has multiple contact types (broker, seller, platform)
- Unusual page layout confused the scraper

**Solution:** Simply edit the fields to correct the information.

### "Custom status disappeared"

**Reason:** Custom statuses are deal-specific by design.

**Solution:** If you want to use a status across multiple deals, add it to each deal individually. This allows different workflows per deal type.

### "Progress history looks wrong"

**Check:**
- Order should be newest first (most recent at top)
- Timestamps should match your actions
- If something looks wrong, delete and re-add

---

## 🎓 Example Workflow

Here's a complete workflow example:

### 1. Finding a Deal
```
- Browse BizBuySell
- Find interesting manufacturing business
- Open Deal Analyzer extension
- EBITDA and price auto-populated ✅
- Broker info auto-captured ✅
```

### 2. Saving the Deal
```
- Enter deal name: "ABC Manufacturing"
- Add initial notes
- Press Cmd+S to save
- Extension confirms: "✅ Saved!"
```

### 3. Tracking Progress
```
Open dashboard → Click deal name

Week 1: Select "Requested NDA"
Week 1: Select "Signed NDA"
Week 2: Select "Deal Room Access"
Week 2: Add custom status: "Q&A with Seller"
Week 3: Select "Underwriting Began"
```

### 4. Managing Contacts
```
Review auto-captured broker info:
- Name: ✅ John Smith (correct)
- Company: ✅ Acme Brokers LLC (correct)
- Phone: ❌ Wrong number captured
- Email: ✅ john@acmebrokers.com (correct)

Edit phone number → Save → Done!
```

### 5. Exporting for CRM
```
- Select all active deals
- Click "📤 Export Selected"
- Open CSV in Excel
- Import to CRM with broker contacts
- Use "Latest Progress" to follow up appropriately
```

---

## 🚀 Coming Soon

Features planned for future versions:
- Broker contact email templates
- Progress-based filtering in dashboard
- Progress analytics (avg time per stage)
- Bulk progress updates
- Reminder notifications
- Progress status color coding

---

## 📚 Additional Resources

- **Full Documentation:** See `DEAL_PROGRESS_TRACKING.md`
- **Testing Guide:** See `TESTING-v1.9.18.md`
- **Video Tutorial:** [Coming soon]
- **Support:** Contact through extension feedback

---

## ❓ FAQ

**Q: Does broker scraping work on all sites?**  
A: It works on most major platforms, but some sites don't publicly display broker info. The scraper improves with each update.

**Q: Can I use the same custom status on multiple deals?**  
A: Custom statuses are per-deal, but you can quickly re-add them. This allows flexibility for different deal types.

**Q: Will old deals work with this new version?**  
A: Yes! Old deals will just have empty broker/progress sections. You can add new tracking to any existing deal.

**Q: Does this slow down the extension?**  
A: No. Broker scraping adds <100ms to load time - barely noticeable.

**Q: Can I disable auto-scraping?**  
A: Currently no, but it doesn't interfere - just leave fields empty if you don't want to use them.

**Q: What if the wrong email is captured?**  
A: Simply edit the field and save. The scraper tries to avoid generic emails, but manual correction is always available.

**Q: How many progress updates can I add?**  
A: Unlimited. The progress list scrolls if it gets long.

**Q: Can I export just broker information?**  
A: Yes, use the CSV export. You can then filter/manipulate in Excel or import to your CRM.

---

**Version:** 1.9.18  
**Last Updated:** January 2026  
**Questions?** Check the full documentation or reach out through extension support.
