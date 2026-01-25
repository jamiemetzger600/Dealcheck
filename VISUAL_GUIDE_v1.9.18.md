# Visual Guide - Broker Information & Progress Tracking

## 📸 What You'll See - v1.9.18

---

## 1️⃣ Automatic Broker Scraping (Behind the Scenes)

### When You Visit a Listing Page:

```
┌─────────────────────────────────────────────────────┐
│ Business Listing Page (BizBuySell, BizQuest, etc.) │
└─────────────────────────────────────────────────────┘
                      ↓
        🤖 Extension Automatically Scans
                      ↓
┌─────────────────────────────────────────────────────┐
│ ✓ Finds: "Broker: John Smith"                      │
│ ✓ Finds: "Acme Brokers LLC"                        │
│ ✓ Finds: "(555) 123-4567"                          │
│ ✓ Finds: "john@acmebrokers.com"                    │
└─────────────────────────────────────────────────────┘
                      ↓
         Saved When You Save Deal
```

### Console Output (For Debugging):
```
🔄 Starting scrapeData...
📍 Current URL: https://www.bizbuysell.com/...
🏢 Platform detected: bizbuysell
👔 Starting scrapeBrokerInfo...
  Found broker name via generic search: John Smith
  Found broker company in element: Acme Brokers LLC
  Found broker phone: (555) 123-4567
  Found broker email: john@acmebrokers.com
👔 Broker info scraping complete: {name: "...", company: "..."}
```

---

## 2️⃣ Broker Information Section (In Deal Modal)

### Location in Dashboard:

```
┌─────────────────────────────────────────────────────┐
│ 📊 Deals Dashboard                                  │
├─────────────────────────────────────────────────────┤
│ [Search box...]                    [Filters] [Sort] │
│                                                     │
│ ┌──────────────────────────────────────────┐      │
│ │ ABC Manufacturing Co.              [View] │      │
│ │ $3,000,000 • $400k EBITDA • Score: 85   │      │
│ └──────────────────────────────────────────┘      │
│                                                     │
└─────────────────────────────────────────────────────┘
              ↓ Click Deal Name
┌─────────────────────────────────────────────────────┐
│ Deal Details Modal                              [×] │
├─────────────────────────────────────────────────────┤
│ 📊 Overview                                         │
│ [Deal information displayed here]                   │
│                                                     │
│ 👔 Broker Information                              │
│ ┌──────────────────┬──────────────────────────┐    │
│ │ BROKER NAME      │ COMPANY                  │    │
│ │ [John Smith    ] │ [Acme Brokers LLC      ] │    │
│ └──────────────────┴──────────────────────────┘    │
│ ┌──────────────────┬──────────────────────────┐    │
│ │ PHONE NUMBER     │ EMAIL                    │    │
│ │ [(555) 123-4567] │ [john@acmebrokers.com  ] │    │
│ └──────────────────┴──────────────────────────┘    │
│                                                     │
│ [💾 Save Broker Info]                              │
└─────────────────────────────────────────────────────┘
```

### Visual Design:

```
┌─────────────────────────────────────────────────────┐
│ 👔 Broker Information                               │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Background: Light gray (light) / Dark (dark)   │ │
│ │ Border: 2px solid border color                 │ │
│ │ Rounded corners: 8px                           │ │
│ │                                                │ │
│ │   BROKER NAME              COMPANY             │ │
│ │   ┌─────────────┐          ┌─────────────┐    │ │
│ │   │ John Smith  │          │ Acme Brokers│    │ │
│ │   └─────────────┘          └─────────────┘    │ │
│ │                                                │ │
│ │   PHONE NUMBER             EMAIL               │ │
│ │   ┌─────────────┐          ┌─────────────┐    │ │
│ │   │(555)123-4567│          │john@acme.com│    │ │
│ │   └─────────────┘          └─────────────┘    │ │
│ │                                                │ │
│ │   [💾 Save Broker Info] ← Purple button       │ │
│ │                                                │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 3️⃣ Deal Progress Tracking Section

### Visual Layout:

```
┌─────────────────────────────────────────────────────┐
│ 📋 Deal Progress Tracking                          │
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ │ CURRENT PROGRESS STATUS                        │ │
│ │ ┌────────────────────────────────────────────┐ │ │
│ │ │ ▼ Requested NDA                    ▼       │ │ │
│ │ └────────────────────────────────────────────┘ │ │
│ │                                                 │ │
│ │ Progress History                               │ │
│ │ ┌────────────────────────────────────────────┐ │ │
│ │ │ 📌 LOI Sent                           [×] │ │ │
│ │ │    Jan 15, 2024 2:30 PM                   │ │ │
│ │ ├────────────────────────────────────────────┤ │ │
│ │ │ 📌 Underwriting Complete              [×] │ │ │
│ │ │    Jan 12, 2024 11:45 AM                  │ │ │
│ │ ├────────────────────────────────────────────┤ │ │
│ │ │ 📌 Underwriting Began                 [×] │ │ │
│ │ │    Jan 8, 2024 9:00 AM                    │ │ │
│ │ ├────────────────────────────────────────────┤ │ │
│ │ │ 📌 Signed NDA                         [×] │ │ │
│ │ │    Jan 5, 2024 4:15 PM                    │ │ │
│ │ └────────────────────────────────────────────┘ │ │
│ │              ↑ Scrollable if many items        │ │
│ │                                                 │ │
│ │ ADD CUSTOM STATUS                              │ │
│ │ ┌─────────────────────────┐  [+ Add]          │ │
│ │ │ Enter custom status...  │                   │ │
│ │ └─────────────────────────┘                   │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Dropdown Menu Expanded:

```
┌─────────────────────────────────────────┐
│ Current Progress Status         [▼]     │
│ ┌───────────────────────────────────┐   │
│ │ Select Progress Status            │   │
│ ├───────────────────────────────────┤   │
│ │ Requested NDA                     │   │
│ │ Signed NDA                        │   │
│ │ Deal Room Access                  │   │
│ │ Underwriting Began                │   │
│ │ Underwriting Complete             │   │
│ │ Bank Pre-Approval                 │   │
│ │ IOI Sent                          │   │
│ │ IOI Accepted                      │   │
│ │ IOI Declined                      │   │
│ │ LOI Sent                          │   │
│ │ LOI Accepted                      │   │
│ │ LOI Declined                      │   │
│ │ Awaiting Seller Response          │   │
│ ├───────────────────────────────────┤   │
│ │ Site Visit Scheduled     ← Custom │   │
│ │ Attorney Review          ← Custom │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Progress Item States:

```
┌─────────────────────────────────────────────┐
│ Normal State:                               │
│ ┌─────────────────────────────────────────┐ │
│ │ 📌  LOI Sent                        [ ] │ │
│ │     Jan 15, 2024 2:30 PM               │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Hover State:                                │
│ ┌─────────────────────────────────────────┐ │
│ │ 📌  LOI Sent                        [×] │ │ ← Delete appears
│ │     Jan 15, 2024 2:30 PM               │ │
│ └─────────────────────────────────────────┘ │
│     ↑ Slightly translated to right         │
└─────────────────────────────────────────────┘
```

---

## 4️⃣ Success Notifications (Toasts)

### After Saving Broker Info:

```
                    ┌─────────────────────────────┐
                    │ ✅ Broker information saved │
                    │    successfully             │ [×]
                    └─────────────────────────────┘
                                      ↑
                            Top-right corner
                            Fades out after 3s
```

### After Adding Progress Status:

```
                    ┌─────────────────────────────┐
                    │ ✅ Progress updated:        │
                    │    LOI Sent                 │ [×]
                    └─────────────────────────────┘
```

### After Removing Progress Item:

```
                    ┌─────────────────────────────┐
                    │ ✅ Progress item removed    │ [×]
                    └─────────────────────────────┘
```

---

## 5️⃣ CSV Export Result

### Export File Structure:

```csv
Deal Name,Status,Saved Date,URL,Asking Price,EBITDA,Quality Score,COC Return,Payback Period,Max Price,Total Debt,FCF Annual,Owner Take-Home,Broker Name,Broker Company,Broker Phone,Broker Email,Latest Progress,Notes
"ABC Manufacturing","hot","1/15/2024","https://...","$3,000,000","$400,000","85","35.2%","4.2 years","$2,850,000","$2,400,000","$360,000","$200,000","John Smith","Acme Brokers LLC","(555) 123-4567","john@acmebrokers.com","LOI Sent","Great opportunity..."
```

### Opened in Excel:

```
┌───────────────┬────────┬─────────────┬───────────┬──────┬───────┐
│ Deal Name     │ Status │ Broker Name │ Company   │Phone │ Email │
├───────────────┼────────┼─────────────┼───────────┼──────┼───────┤
│ ABC Mfg       │ hot    │ John Smith  │ Acme LLC  │ 555… │ john… │
│ XYZ Services  │ warm   │ Jane Doe    │ Best RE   │ 444… │ jane… │
│ Tech Startup  │ cold   │             │           │      │       │
└───────────────┴────────┴─────────────┴───────────┴──────┴───────┘
                           ↑ Empty if not scraped/entered
```

---

## 6️⃣ Dark Mode Appearance

### Broker Section in Dark Mode:

```
┌─────────────────────────────────────────────────────┐
│ Background: #2d2d2d (dark gray)                     │
│ Text: #e0e0e0 (light gray)                          │
│ Borders: #404040                                    │
│                                                     │
│ 👔 Broker Information                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Background: #252525                             │ │
│ │                                                 │ │
│ │   Input fields:                                 │ │
│ │   ┌─────────────┐                               │ │
│ │   │ John Smith  │ ← Background: #2d2d2d        │ │
│ │   └─────────────┘   Text: #e0e0e0              │ │
│ │                     Border: #404040             │ │
│ │                                                 │ │
│ │   [💾 Save Broker Info] ← Same purple button   │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Progress History in Dark Mode:

```
┌─────────────────────────────────────────────────────┐
│ Progress History                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Background: #1e1e1e                             │ │
│ │                                                 │ │
│ │ ┌─────────────────────────────────────────────┐ │ │
│ │ │ 📌  LOI Sent                            [×]│ │ │
│ │ │     Jan 15, 2024 2:30 PM                   │ │ │
│ │ └─────────────────────────────────────────────┘ │ │
│ │   ↑ Background: #252525                         │ │
│ │     Text: #e0e0e0                               │ │
│ │     Border-left: #667eea (purple accent)        │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 7️⃣ Empty States

### No Broker Information:

```
┌─────────────────────────────────────────────────────┐
│ 👔 Broker Information                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ │   BROKER NAME              COMPANY             │ │
│ │   ┌─────────────┐          ┌─────────────┐    │ │
│ │   │ John Smith  │          │ ABC Brokers │    │ │  ← Placeholder
│ │   └─────────────┘          └─────────────┘    │ │     text
│ │        Empty                    Empty          │ │
│ │                                                 │ │
│ │   [💾 Save Broker Info]                        │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### No Progress History:

```
┌─────────────────────────────────────────────────────┐
│ Progress History                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ │              No progress updates yet            │ │
│ │                                                 │ │
│ │    (Gray text, centered, 20px padding)          │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 8️⃣ Interaction Flow

### Complete User Journey:

```
1. VISIT LISTING PAGE
   ↓
   Extension icon shows
   
2. OPEN ANALYZER
   ↓
   Auto-scrapes:
   • EBITDA
   • Asking Price
   • Broker Info ← NEW!
   
3. SAVE DEAL (Cmd+S)
   ↓
   Toast: "✅ Saved!"
   
4. OPEN DASHBOARD
   ↓
   Click deal name
   
5. VIEW BROKER INFO
   ↓
   Pre-populated fields
   (or empty if not found)
   
6. EDIT IF NEEDED
   ↓
   Modify any field
   Click "Save Broker Info"
   Toast: "✅ Success"
   
7. TRACK PROGRESS
   ↓
   Select status from dropdown
   Instantly appears in history
   Toast: "✅ Progress updated"
   
8. ADD CUSTOM STATUS
   ↓
   Type custom status
   Click "+ Add"
   Now in dropdown
   
9. EXPORT
   ↓
   CSV includes all broker
   and progress data
```

---

## 9️⃣ Responsive Behavior

### On Small Screens:

```
┌───────────────────────────┐
│ Modal adapts:             │
│                           │
│ Broker fields stack:      │
│ ┌─────────────────────┐   │
│ │ BROKER NAME         │   │
│ │ [John Smith       ] │   │
│ └─────────────────────┘   │
│ ┌─────────────────────┐   │
│ │ COMPANY             │   │
│ │ [Acme Brokers LLC ] │   │
│ └─────────────────────┘   │
│ ┌─────────────────────┐   │
│ │ PHONE               │   │
│ │ [(555) 123-4567   ] │   │
│ └─────────────────────┘   │
│ ┌─────────────────────┐   │
│ │ EMAIL               │   │
│ │ [john@acme.com    ] │   │
│ └─────────────────────┘   │
│                           │
│ [💾 Save Broker Info]    │
└───────────────────────────┘
```

---

## 🎨 Color Scheme

### Light Mode:
- Background: `#ffffff` (white)
- Secondary: `#f8f9fa` (light gray)
- Text: `#333333` (dark gray)
- Accent: `#667eea` (purple)
- Border: `#e0e6ed` (light border)

### Dark Mode:
- Background: `#1e1e1e` (dark)
- Secondary: `#2d2d2d` (darker gray)
- Text: `#e0e0e0` (light gray)
- Accent: `#667eea` (same purple)
- Border: `#404040` (dark border)

---

## ⌨️ Keyboard Shortcuts

```
Cmd+S / Ctrl+S → Save Deal
Escape → Close Modal
Tab → Navigate fields
Enter → Submit (when in input)
```

---

## 🔔 Notification Types

```
✅ Success (Green accent)
   • "Broker information saved successfully"
   • "Progress updated: [Status]"
   • "Progress item removed"
   • "Custom status added"

❌ Error (Red accent)
   • "Failed to save broker information"
   • (Rare, handled gracefully)

⚠️ Warning (Orange accent)
   • "Please enter a custom status"
   • "This custom status already exists"

ℹ️ Info (Blue accent)
   • Future notifications
```

---

**This visual guide shows the actual user interface elements for v1.9.18**
