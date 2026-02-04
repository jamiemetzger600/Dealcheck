# Auto-Refresh System Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Chrome Extension                             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                  Background Service Worker                  │   │
│  │                      (background.js)                        │   │
│  │                                                             │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐ │   │
│  │  │ Alarms API   │───▶│ Refresh      │───▶│ Notification│ │   │
│  │  │ Scheduler    │    │ Logic        │    │ System      │ │   │
│  │  └──────────────┘    └──────────────┘    └─────────────┘ │   │
│  │         │                    │                    │        │   │
│  └─────────┼────────────────────┼────────────────────┼────────┘   │
│            │                    │                    │             │
│            │                    ▼                    │             │
│            │          ┌──────────────────┐          │             │
│            │          │ Chrome Storage   │          │             │
│            │          │ • Settings       │          │             │
│            │          │ • Deals Pool     │          │             │
│            │          │ • Buy Box Config │          │             │
│            │          └──────────────────┘          │             │
│            │                    │                    │             │
│            │                    │                    │             │
│  ┌─────────▼────────────────────▼────────────────────▼────────┐   │
│  │                    Dashboard (deals-dashboard.js)           │   │
│  │                                                             │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐ │   │
│  │  │ Settings UI  │    │ Message      │    │ Deal        │ │   │
│  │  │ Modal        │    │ Listener     │    │ Display     │ │   │
│  │  └──────────────┘    └──────────────┘    └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Refresh Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Refresh Cycle                                │
└─────────────────────────────────────────────────────────────────────┘

    ⏰ Alarm Triggers (Every X minutes)
                │
                ▼
    ┌───────────────────────┐
    │ Background Worker     │
    │ Wakes Up              │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Load Current Settings │
    │ • Buy Box Config      │
    │ • Previous Deal Count │
    │ • Notification Prefs  │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Send Refresh Message  │
    │ to All Open Tabs      │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Dashboard Receives    │
    │ Message & Fetches     │
    │ New Deals from Sources│
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Compare New vs Old    │
    │ Deal Lists            │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Filter New Deals      │
    │ by Buy Box Criteria   │
    └───────────┬───────────┘
                │
                ▼
         ┌──────┴──────┐
         │             │
    New Deals?      No Deals
         │             │
        YES            │
         │             │
         ▼             ▼
    ┌─────────┐   ┌─────────┐
    │ Show    │   │ Silent  │
    │ Notif.  │   │ Update  │
    └─────────┘   └─────────┘
         │             │
         └──────┬──────┘
                │
                ▼
    ┌───────────────────────┐
    │ Update Storage        │
    │ • New Deal Count      │
    │ • Last Refresh Time   │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Worker Goes to Sleep  │
    │ (Until Next Alarm)    │
    └───────────────────────┘
```

---

## 🎯 Buy Box Filtering Logic

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Deal Filtering Pipeline                         │
└─────────────────────────────────────────────────────────────────────┘

    New Deal Discovered
            │
            ▼
    ┌───────────────────┐
    │ Age Check         │
    │ < 24 hours old?   │
    └────────┬──────────┘
             │
        ┌────┴────┐
       YES       NO
        │         │
        │         └──▶ Skip (Too Old)
        │
        ▼
    ┌───────────────────┐
    │ Price Filter      │
    │ Min ≤ $ ≤ Max?    │
    └────────┬──────────┘
             │
        ┌────┴────┐
       YES       NO
        │         │
        │         └──▶ Skip (Price)
        │
        ▼
    ┌───────────────────┐
    │ EBITDA Filter     │
    │ Min ≤ $ ≤ Max?    │
    └────────┬──────────┘
             │
        ┌────┴────┐
       YES       NO
        │         │
        │         └──▶ Skip (EBITDA)
        │
        ▼
    ┌───────────────────┐
    │ Revenue Filter    │
    │ Min ≤ $ ≤ Max?    │
    └────────┬──────────┘
             │
        ┌────┴────┐
       YES       NO
        │         │
        │         └──▶ Skip (Revenue)
        │
        ▼
    ┌───────────────────┐
    │ Location Filter   │
    │ In Target States? │
    └────────┬──────────┘
             │
        ┌────┴────┐
       YES       NO
        │         │
        │         └──▶ Skip (Location)
        │
        ▼
    ┌───────────────────┐
    │ Exclude Check     │
    │ Not in Excluded?  │
    └────────┬──────────┘
             │
        ┌────┴────┐
       YES       NO
        │         │
        │         └──▶ Skip (Excluded)
        │
        ▼
    ┌───────────────────┐
    │ Industry Filter   │
    │ Matches Target?   │
    └────────┬──────────┘
             │
        ┌────┴────┐
       YES       NO
        │         │
        │         └──▶ Skip (Industry)
        │
        ▼
    ┌───────────────────┐
    │ ✅ MATCH!         │
    │ Show Notification │
    └───────────────────┘
```

---

## 💾 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Data Flow                                    │
└─────────────────────────────────────────────────────────────────────┘

    User Configures Settings
            │
            ▼
    ┌───────────────────┐
    │ Settings Modal    │
    │ • Enable/Disable  │
    │ • Interval        │
    │ • Notifications   │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Save to Storage   │
    │ chrome.storage    │
    │ .local.set()      │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Storage Listener  │
    │ Detects Change    │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Update Alarm      │
    │ Schedule          │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Alarm Triggers    │
    │ at Interval       │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Fetch New Deals   │
    │ from Sources      │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Process & Filter  │
    │ by Buy Box        │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Save to Storage   │
    │ aggregatedDeals   │
    │ Pool              │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Update Dashboard  │
    │ Display           │
    └───────────────────┘
```

---

## 🔔 Notification Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Notification Pipeline                           │
└─────────────────────────────────────────────────────────────────────┘

    New Matching Deal Found
            │
            ▼
    ┌───────────────────┐
    │ Check Settings    │
    │ notifyNewDeals?   │
    └────────┬──────────┘
             │
        ┌────┴────┐
       YES       NO
        │         │
        │         └──▶ Skip Notification
        │
        ▼
    ┌───────────────────┐
    │ Check Permission  │
    │ Notifications OK? │
    └────────┬──────────┘
             │
        ┌────┴────┐
       YES       NO
        │         │
        │         └──▶ Request Permission
        │
        ▼
    ┌───────────────────┐
    │ Create            │
    │ Notification      │
    │ chrome            │
    │ .notifications    │
    │ .create()         │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Show to User      │
    │ 🎯 "X new deals   │
    │ matching your     │
    │ Buy Box"          │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Auto-Dismiss      │
    │ After 10 Seconds  │
    └───────────────────┘
```

---

## 🔄 State Machine

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Auto-Refresh State Machine                        │
└─────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   INITIAL   │
    │   (Idle)    │
    └──────┬──────┘
           │
           │ Extension Installed/Updated
           │
           ▼
    ┌─────────────┐
    │ CONFIGURING │
    │ Load Settings│
    └──────┬──────┘
           │
           │ Settings Loaded
           │
           ▼
    ┌─────────────┐
    │   ENABLED?  │
    └──────┬──────┘
           │
      ┌────┴────┐
     YES       NO
      │         │
      │         ▼
      │    ┌─────────────┐
      │    │  DISABLED   │
      │    │  (No Alarm) │◀───────┐
      │    └─────────────┘        │
      │                            │
      │                    User Disables
      │                            │
      ▼                            │
    ┌─────────────┐                │
    │  SCHEDULED  │                │
    │ (Alarm Set) │────────────────┘
    └──────┬──────┘
           │
           │ Alarm Triggers
           │
           ▼
    ┌─────────────┐
    │ REFRESHING  │
    │ (Fetching)  │
    └──────┬──────┘
           │
           │ Fetch Complete
           │
           ▼
    ┌─────────────┐
    │ PROCESSING  │
    │ (Filtering) │
    └──────┬──────┘
           │
           │ Processing Complete
           │
           ▼
    ┌─────────────┐
    │ NOTIFYING   │
    │ (If Matches)│
    └──────┬──────┘
           │
           │ Notification Shown
           │
           ▼
    ┌─────────────┐
    │  SCHEDULED  │
    │ (Waiting)   │
    └─────────────┘
           │
           │ Next Alarm
           │
           └──────▶ (Loop)
```

---

## 📦 Component Interaction

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Component Interaction Map                         │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                         User Interface                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐         ┌──────────────┐         ┌───────────┐ │
│  │  Settings    │────────▶│  Dashboard   │◀────────│  Toast    │ │
│  │  Button      │         │  Main View   │         │  Messages │ │
│  └──────┬───────┘         └──────┬───────┘         └───────────┘ │
│         │                        │                                 │
│         │ Opens                  │ Displays                        │
│         │                        │                                 │
│         ▼                        ▼                                 │
│  ┌──────────────┐         ┌──────────────┐                        │
│  │  Settings    │         │  Deal Table  │                        │
│  │  Modal       │         │  & Stats     │                        │
│  └──────┬───────┘         └──────┬───────┘                        │
│         │                        │                                 │
└─────────┼────────────────────────┼─────────────────────────────────┘
          │                        │
          │ Saves                  │ Reads
          │                        │
          ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Chrome Storage API                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Settings    │  │  Deals Pool  │  │  Buy Box     │             │
│  │  Data        │  │  Data        │  │  Config      │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
└─────────┼──────────────────┼──────────────────┼─────────────────────┘
          │                  │                  │
          │ Reads            │ Reads            │ Reads
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Background Service Worker                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Alarm       │  │  Refresh     │  │  Notification│             │
│  │  Scheduler   │─▶│  Engine      │─▶│  Manager     │             │
│  └──────────────┘  └──────────────┘  └──────┬───────┘             │
└─────────────────────────────────────────────┼─────────────────────┘
                                               │
                                               │ Shows
                                               │
                                               ▼
                                    ┌──────────────────┐
                                    │  Desktop         │
                                    │  Notification    │
                                    └──────────────────┘
```

---

## 🔐 Security Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Security Layers                              │
└─────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────┐
    │         User Permissions                 │
    │  • Notifications (requested on demand)   │
    │  • Storage (automatic)                   │
    └────────────────┬────────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────────┐
    │      Chrome Extension Sandbox            │
    │  • Isolated storage                      │
    │  • No external network access            │
    │  • No file system access                 │
    └────────────────┬────────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────────┐
    │         Data Validation                  │
    │  • Sanitize deal data                    │
    │  • Validate settings values              │
    │  • Type checking                         │
    └────────────────┬────────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────────┐
    │         Local Storage Only               │
    │  • No cloud sync                         │
    │  • No external APIs                      │
    │  • No tracking                           │
    └─────────────────────────────────────────┘
```

---

## 📊 Performance Optimization

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Performance Strategy                              │
└─────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────┐
    │      Efficient Alarm API                 │
    │  • Only wakes when needed                │
    │  • Precise scheduling                    │
    │  • Battery friendly                      │
    └────────────────┬────────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────────┐
    │      Lazy Loading                        │
    │  • Load deals only when tab active       │
    │  • Defer non-critical operations         │
    │  • Minimize memory footprint             │
    └────────────────┬────────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────────┐
    │      Efficient Filtering                 │
    │  • Early exit on mismatch                │
    │  • Cached Buy Box config                 │
    │  • Minimal comparisons                   │
    └────────────────┬────────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────────┐
    │      Storage Optimization                │
    │  • Compress deal data                    │
    │  • LRU eviction                          │
    │  • Batch writes                          │
    └─────────────────────────────────────────┘
```

---

**Version:** 2.2.0  
**Last Updated:** January 30, 2026  
**Status:** ✅ Production Ready
