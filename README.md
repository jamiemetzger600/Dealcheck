# Deal Check v2.2.0 - Beta Release

## 🎉 Welcome Beta Tester!

Thank you for testing Deal Check v2.2.0! This release includes a major new feature: **Auto-Refresh & Smart Notifications**.

---

## 📦 Installation

### **Step 1: Extract the ZIP**
1. Extract the "Deal Check 2.2.0.zip" file to a folder on your computer

### **Step 2: Load in Chrome**
1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the extracted folder
5. The extension should now appear in your extensions list

### **Step 3: Pin the Extension**
1. Click the puzzle piece icon in Chrome toolbar
2. Find "Max Price Deal Analyzer"
3. Click the pin icon to keep it visible

---

## 🚀 Quick Start

### **First Time Setup (5 minutes):**

1. **Open Dashboard**
   - Click the extension icon in Chrome toolbar
   - Dashboard will open

2. **Add a Deal Source**
   - Click "📥 Manage Sources"
   - Add your Google Sheets URL or CSV file
   - Click "🔄 Fetch Deals" to load deals

3. **Configure Buy Box**
   - Click "⚙️ Configure Buy Box"
   - Set your investment criteria (price, location, industry)
   - Save settings

4. **Enable Auto-Refresh** (NEW in v2.2.0!)
   - Click "🔔 Auto-Refresh Settings"
   - Check "Enable Auto-Refresh"
   - Choose refresh interval (default: 1 hour)
   - Check "Show notifications for new matching deals"
   - Click "🔔 Test Notification" to verify it works
   - Click "💾 Save Settings"

---

## ✨ What's New in v2.2.0

### **Auto-Refresh System**
- Automatically checks your sources for new deals in the background
- Configurable intervals: 15 minutes to once per day
- Works even when dashboard is closed

### **Smart Notifications**
- Get desktop notifications when new deals matching your Buy Box are found
- Shows count of new matching deals
- Auto-dismisses after 10 seconds

### **Settings Interface**
- New settings modal with comprehensive controls
- Real-time statistics (total deals, new today)
- Last/next refresh timestamps
- Test notification button

---

## 📚 Documentation

- **QUICK_START.md** - Basic setup guide
- **AUTO_REFRESH_QUICK_START.md** - Auto-refresh feature guide (5-minute setup)
- **RELEASE_NOTES_v2.2.0.md** - Detailed release notes

---

## 🧪 What to Test

### **Priority 1: Auto-Refresh**
- [ ] Open settings modal
- [ ] Enable auto-refresh
- [ ] Set interval to 15 minutes (for quick testing)
- [ ] Save settings
- [ ] Wait 15 minutes and verify deals refresh

### **Priority 2: Notifications**
- [ ] Enable notifications in settings
- [ ] Click "Test Notification" button
- [ ] Verify notification appears
- [ ] Add new deal to your source
- [ ] Wait for next refresh cycle
- [ ] Verify notification for new deal

### **Priority 3: Buy Box Filtering**
- [ ] Configure Buy Box with specific criteria
- [ ] Add deals that match AND don't match
- [ ] Verify notifications only for matching deals

### **Priority 4: General Functionality**
- [ ] Add/remove deal sources
- [ ] Fetch deals manually
- [ ] View deal details
- [ ] Save deals to "My Deals"
- [ ] Column sorting and filtering
- [ ] Export deals

---

## 🐛 Known Issues

### **Current Limitations:**
- Clicking notification doesn't open specific deal yet (planned for v2.3.0)
- No notification history (planned)
- No email/SMS notifications (planned)

### **If You Encounter Issues:**
1. Check browser notification permissions
2. Open browser console (F12) and look for errors
3. Try reloading the extension
4. Check that sources are configured correctly

---

## 📝 Feedback Requested

Please provide feedback on:

1. **Auto-Refresh Feature**
   - Does it work reliably?
   - Is the refresh interval appropriate?
   - Any performance issues?

2. **Notifications**
   - Do they appear correctly?
   - Is the content clear and useful?
   - Too many/too few notifications?

3. **Settings Interface**
   - Is it intuitive?
   - Any confusing elements?
   - Missing features?

4. **General Experience**
   - Overall impression
   - Bugs or errors encountered
   - Feature requests

---

## 🔧 Troubleshooting

### **Notifications Not Appearing**
1. Check Chrome notification permissions
2. Make sure "Do Not Disturb" is off
3. Click "Test Notification" in settings
4. Check browser console for errors

### **Auto-Refresh Not Working**
1. Verify auto-refresh is enabled in settings
2. Check "Last Refresh" timestamp updates
3. Try manual refresh with "🔄 Fetch Deals"
4. Check browser console for errors

### **Deals Not Loading**
1. Verify source URL is correct
2. Check Google Sheets sharing settings (must be "Anyone with link can view")
3. Try clicking "🔄 Fetch Deals" manually
4. Check browser console for errors

---

## 📞 Support

If you encounter any issues:

1. **Check Documentation:**
   - Open `AUTO_REFRESH_QUICK_START.md` for detailed setup
   - Review `RELEASE_NOTES_v2.2.0.md` for technical details

2. **Debug:**
   - Open browser console (F12)
   - Look for error messages (red text)
   - Take screenshots if needed

3. **Report Issues:**
   - Describe what you were trying to do
   - Include any error messages
   - Mention your browser version and OS

---

## 🎯 Testing Checklist

```
Installation & Setup:
[ ] Extension loads without errors
[ ] Dashboard opens correctly
[ ] Can add deal sources
[ ] Can fetch deals
[ ] Can configure Buy Box

Auto-Refresh Feature:
[ ] Settings modal opens
[ ] Can enable/disable auto-refresh
[ ] Can change refresh interval
[ ] Settings persist after reload
[ ] Background refresh works
[ ] Last refresh timestamp updates

Notifications:
[ ] Test notification works
[ ] Browser permission requested (if needed)
[ ] Notifications appear for new deals
[ ] Notifications respect Buy Box
[ ] Notifications auto-dismiss

General Functionality:
[ ] Deal table displays correctly
[ ] Column sorting works
[ ] Filtering works
[ ] Can save deals to "My Deals"
[ ] Can view deal details
[ ] Can export deals

Performance:
[ ] No noticeable lag
[ ] Memory usage acceptable
[ ] Battery impact minimal
[ ] No console errors
```

---

## 🙏 Thank You!

Your feedback is invaluable in making Deal Check better. Thank you for taking the time to test this beta release!

---

**Version:** 2.2.0  
**Release Date:** January 30, 2026  
**Status:** Beta Testing  
**Contact:** [Your contact info]
