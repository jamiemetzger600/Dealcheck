# Deal Analyzer - Web Beta Version

This is the web version of the Deal Analyzer Chrome extension, designed for beta testing and mobile access.

## 🚀 Quick Deploy to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from the web directory**:
   ```bash
   cd web
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? **Y**
   - Which scope? Choose your account
   - Link to existing project? **N**
   - Project name? `deal-analyzer` (or your choice)
   - In which directory is your code located? `./`
   - Want to override settings? **N**

5. **Done!** You'll get a URL like: `https://deal-analyzer-xxx.vercel.app`

### Option 2: Deploy via Vercel Dashboard

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add web version for beta testing"
   git push origin feature/web-deployment
   ```

2. **Go to [vercel.com](https://vercel.com)**:
   - Click "Add New Project"
   - Import your GitHub repository
   - Set **Root Directory** to `web`
   - Click "Deploy"

3. **Done!** Your site will be live at `https://your-project.vercel.app`

## 📱 What Works

✅ **Full Dashboard** - View and manage deals  
✅ **Buy Box Filtering** - Set criteria and filter deals  
✅ **NOT Filters** - Exclude deals by keyword  
✅ **ROI Calculators** - DSCR, COC, payback analysis  
✅ **PDF Export** - Export deal analysis reports  
✅ **Mobile Responsive** - Works on phone, tablet, desktop  
✅ **Dark/Light Mode** - Toggle theme preference  
✅ **CSV Import** - Import deals from CSV files  

## ⚠️ Limitations (Beta)

❌ **No Auto-Scraping** - Can't scrape from BizQuest, BizBuySell, etc. (requires Chrome extension)  
❌ **No Cloud Sync** - Data stored in browser localStorage only  
❌ **No User Accounts** - No login/signup (yet)  
❌ **No Cross-Device Sync** - Data doesn't sync between devices  

## 🧪 Beta Testing

This version is perfect for:
- Testing UI/UX on mobile devices
- Getting feedback on the dashboard layout
- Testing calculators and filtering logic
- Sharing with beta testers who don't want to install extension

## 🔄 Data Storage

- Uses browser **localStorage** (5-10MB limit)
- Data stays on your device
- Clear browser data = lose your deals
- Export CSV regularly to backup

## 📊 How to Add Deals

Since auto-scraping doesn't work in web version, you can:

1. **Manual Entry**: Click "Add Deal" and fill in the form
2. **CSV Import**: Import deals from a CSV file
3. **Copy from Extension**: If you have the Chrome extension, export CSV and import here

## 🎯 Next Steps

After beta testing, we'll add:
- User accounts and authentication
- Cloud storage with sync
- Cross-device access
- Team collaboration features
- Premium features (freemium model)

See `WEB_APP_MIGRATION_PLAN.md` in the root directory for the full roadmap.

## 🐛 Reporting Issues

If you find bugs or have feedback:
1. Note the URL where the issue occurred
2. Describe what you expected vs. what happened
3. Include browser and device info
4. Screenshots are helpful!

## 📞 Support

This is a beta version for testing purposes. For the full Chrome extension with auto-scraping, visit the Chrome Web Store.

---

**Version**: 2.2.4 (Web Beta)  
**Last Updated**: January 25, 2026
