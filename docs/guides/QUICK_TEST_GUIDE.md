# Quick Testing Guide - v2.1.6

## 🚀 Quick Start

1. **Reload Extension**
   ```
   Chrome → Extensions → Reload button
   ```

2. **Open Dashboard**
   - Click extension icon on any page
   - Or navigate directly to deals-dashboard.html

---

## ✅ Test Checklist (5 minutes)

### Global Buttons (v2.1.5 fix)
- [ ] Click "🔄 Fetch Deals" - should trigger aggregation
- [ ] Click "📥 Manage Sources" - should open modal
- [ ] Click "➕ Add Deal" - should show message
- [ ] Click "⚙️ Configure Buy Box" - should show message
- **All should work WITHOUT switching tabs first**

### Deal Aggregator Tab
- [ ] "Fetch Deals" button fetches RSS feeds
- [ ] Deals appear in table
- [ ] Search box filters deals
- [ ] Save button (💾) saves deal to "My Deals"
- [ ] Toast notification confirms save

### My Deals Tab (NEW in v2.1.6)
- [ ] Switch to "My Deals" tab
- [ ] Stats cards show correct counts
- [ ] Saved deals appear in table
- [ ] Search box filters deals
- [ ] Status filter works
- [ ] Sort dropdown changes order
- [ ] Click deal name (placeholder modal)
- [ ] Export button (📤) downloads CSV
- [ ] Delete button (🗑️) removes deal
- [ ] Bulk select works
- [ ] Bulk export works
- [ ] Bulk delete works

---

## 🐛 Known Issues

- Deal modal is placeholder (shows "coming soon")
- Manual deal entry not yet functional
- Source management modal needs enhancement
- Buy Box configuration not implemented

---

## 💾 What's Stored

Check Chrome storage:
```javascript
// Open console on dashboard page
chrome.storage.local.get(['savedDeals', 'aggregatedDeals'], console.log)
```

---

## 📊 Expected Behavior

### When you click "Fetch Deals":
1. Button shows loading state
2. Toast: "Starting deal aggregation..."
3. Toast: "Added X new deals (Y duplicates)"
4. Deals appear in aggregator table

### When you save a deal:
1. Toast: "Saving deal..."
2. Toast: "Deal saved to My Deals!"
3. "My Deals" badge count increases
4. Deal appears when you switch to "My Deals" tab

### When you switch to "My Deals":
1. Stats cards update (total, hot, warm, cold)
2. Deals load into table
3. Empty state if no deals saved

---

## 🔧 Troubleshooting

**Buttons don't work:**
- Check browser console for errors
- Verify v2.1.5 or later in header
- Try reloading extension

**Deals don't save:**
- Check console for storage errors
- Verify Chrome storage isn't full
- Check savedDeals in storage

**My Deals tab empty:**
- Save deals from aggregator first
- Check console for loading errors
- Try clicking refresh button

**CSV export doesn't work:**
- Check Downloads folder
- Allow pop-ups if blocked
- Check console for errors

---

## 🎯 Success Criteria

After testing, you should be able to:
- ✅ Fetch deals from RSS feeds
- ✅ Browse deals in aggregator
- ✅ Save interesting deals
- ✅ View saved deals in "My Deals"
- ✅ Search and filter your deals
- ✅ Export deals to CSV
- ✅ Delete unwanted deals

---

## 📝 Report Issues

If something doesn't work:
1. Check browser console
2. Note the exact steps to reproduce
3. Check which version is running
4. Look for JavaScript errors

---

**Current Version: 2.1.6**  
**Last Updated: January 25, 2026**  
**Branch: feature/deal-aggregator-v2**
