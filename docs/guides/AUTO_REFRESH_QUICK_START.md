# Auto-Refresh Quick Start Guide

## ⚡ 5-Minute Setup

Get automatic deal updates and notifications in just 5 minutes!

---

## 📋 Prerequisites

Before you start:
- ✅ Extension installed and loaded
- ✅ At least one deal source configured (Google Sheets, CSV, etc.)
- ✅ Browser notifications enabled

---

## 🚀 Step-by-Step Setup

### **Step 1: Open Settings (30 seconds)**

1. Open the Deal Analyzer dashboard
2. Look for the **"🔔 Auto-Refresh Settings"** button in the top toolbar
3. Click it to open the settings modal

![Settings Button Location](Screenshots/settings-button.png)

---

### **Step 2: Enable Auto-Refresh (1 minute)**

1. In the settings modal, find **"Enable Auto-Refresh"**
2. Make sure the checkbox is **checked** ✅
3. Choose your refresh interval from the dropdown:
   - **Recommended:** "Every 1 hour" (default)
   - **Active hunters:** "Every 15-30 minutes"
   - **Passive monitoring:** "Every 4-8 hours"

**Example:**
```
☑ Enable Auto-Refresh
Refresh Interval: [Every 1 hour ▼]
```

---

### **Step 3: Enable Notifications (30 seconds)**

1. Scroll down to **"New Deal Notifications"**
2. Check **"Show notifications for new matching deals"** ✅
3. Click **"🔔 Test Notification"** button
4. You should see a test notification appear!

**If no notification appears:**
- Your browser may ask for permission - click "Allow"
- Check your browser notification settings
- Make sure "Do Not Disturb" is off

---

### **Step 4: Configure Buy Box (2 minutes)**

**Important:** Notifications only show for deals matching your Buy Box!

1. Close the settings modal
2. Click **"⚙️ Configure Buy Box"** button
3. Set your investment criteria:
   - **Price Range:** Min $500K, Max $2M (example)
   - **Target States:** TX, FL, GA (example)
   - **Industries:** Healthcare, SaaS (example)
4. Save your Buy Box

**Example Buy Box:**
```
Asking Price: $500,000 - $2,000,000
EBITDA: $100,000 - $500,000
Target States: TX, FL, GA, NC
Industries: Healthcare, SaaS, Manufacturing
```

---

### **Step 5: Save Settings (30 seconds)**

1. Go back to **"🔔 Auto-Refresh Settings"**
2. Click **"💾 Save Settings"** button
3. You should see a confirmation message: ✅ "Settings saved!"
4. Close the modal

**Done!** 🎉 Auto-refresh is now active!

---

## ✅ Verification

### **Confirm It's Working:**

1. **Check Last Refresh:**
   - Open settings modal
   - Look for "Last Refresh" timestamp
   - Should update after your first refresh cycle

2. **Check Statistics:**
   - Look at "Total Deals" and "New Today" in settings
   - Numbers should match your dashboard

3. **Wait for Notification:**
   - If new deals matching your Buy Box are found
   - You'll get a notification: "🎯 X new deals found!"

---

## 🎯 What Happens Next?

### **Automatic Process:**

```
Every [your interval]:
  1. Extension checks your sources for new deals
  2. Compares with existing deals
  3. Filters by your Buy Box criteria
  4. Shows notification if matches found
  5. Updates dashboard automatically
```

### **You'll Get Notified When:**
- ✅ New deals are added to your sources
- ✅ Deals match your Buy Box criteria
- ✅ Deals are less than 24 hours old

### **You WON'T Get Notified For:**
- ❌ Deals outside your Buy Box
- ❌ Deals older than 24 hours
- ❌ Duplicate deals already in your list

---

## 💡 Pro Tips

### **For Active Deal Hunters:**
```
✅ Set refresh to 15-30 minutes
✅ Enable notifications
✅ Configure specific Buy Box
✅ Check dashboard daily
```

### **For Passive Investors:**
```
✅ Set refresh to 4-8 hours
✅ Enable notifications
✅ Configure broad Buy Box
✅ Review weekly
```

### **For Maximum Coverage:**
```
✅ Add multiple deal sources
✅ Set refresh to 1 hour
✅ Configure wide Buy Box
✅ Enable notifications
```

---

## 🔧 Customization Options

### **Refresh Intervals:**
- **15 minutes** - Most frequent (for active hunting)
- **30 minutes** - Very active
- **1 hour** - Recommended (default)
- **2 hours** - Moderate
- **4 hours** - Passive
- **8 hours** - Minimal
- **Daily** - Once per day

### **Notification Settings:**
- **Enabled** - Get notified of new matching deals
- **Disabled** - Silent updates (no notifications)

---

## 🐛 Troubleshooting

### **Problem: No notifications appearing**

**Solution:**
1. Check browser notification permissions
2. Click "Test Notification" in settings
3. Make sure "Do Not Disturb" is off
4. Check if Buy Box is too restrictive

### **Problem: Too many notifications**

**Solution:**
1. Increase refresh interval (e.g., 1 hour → 4 hours)
2. Make Buy Box more specific
3. Temporarily disable notifications

### **Problem: Not seeing new deals**

**Solution:**
1. Check if auto-refresh is enabled
2. Verify sources are configured
3. Click "🔄 Fetch Deals" to manual refresh
4. Check browser console for errors

---

## 📊 Understanding Statistics

### **In Settings Modal:**

**Total Deals:** Current number of deals in your aggregator
- Includes all deals from all sources
- Updates after each refresh

**New Today:** Deals added in the last 24 hours
- Resets daily
- Shows deal flow rate

**Last Refresh:** Timestamp of last successful refresh
- Shows when deals were last updated
- "Never" if first time

**Next Refresh:** When the next refresh will occur
- Calculated based on your interval
- Updates automatically

---

## 🎓 Best Practices

### **1. Start Conservative**
- Begin with 1-hour refresh interval
- Adjust based on deal flow
- Monitor notification frequency

### **2. Configure Buy Box First**
- Set realistic criteria
- Not too broad (too many notifications)
- Not too narrow (miss opportunities)

### **3. Test Regularly**
- Use "Test Notification" button
- Verify settings persist
- Check statistics accuracy

### **4. Monitor Performance**
- Check "Last Refresh" regularly
- Verify new deals appear
- Adjust interval as needed

---

## 🔮 What's Next?

After setup, you can:

1. **Add More Sources**
   - Click "📥 Manage Sources"
   - Add Google Sheets, CSV files, etc.
   - More sources = more deals

2. **Refine Buy Box**
   - Adjust criteria based on results
   - Add/remove states
   - Change price ranges

3. **Adjust Settings**
   - Change refresh interval
   - Enable/disable notifications
   - Monitor statistics

---

## 📞 Need Help?

If you encounter issues:

1. **Check Documentation:**
   - `AUTO_REFRESH_GUIDE.md` - Complete guide
   - `TESTING_v2.2.0.md` - Testing procedures

2. **Debug Steps:**
   - Open browser console (F12)
   - Look for error messages
   - Check notification permissions

3. **Common Fixes:**
   - Reload extension
   - Clear extension storage
   - Reconfigure settings

---

## 🎉 Success!

You're now set up for automatic deal updates!

**What you've achieved:**
- ✅ Auto-refresh enabled
- ✅ Notifications configured
- ✅ Buy Box set up
- ✅ Ready to receive deal alerts

**Next time a matching deal appears:**
- 📬 You'll get a notification
- 📊 Dashboard updates automatically
- 🎯 Deal appears in your aggregator

**Happy deal hunting!** 🚀

---

**Version:** 2.2.0  
**Setup Time:** ~5 minutes  
**Difficulty:** Easy  
**Status:** ✅ Ready to Use
