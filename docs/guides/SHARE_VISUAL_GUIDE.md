# Share Feature - Visual Guide

## Share Button Location

### In Deal Modal Footer:

```
┌─────────────────────────────────────────────────────┐
│ Deal Details Modal                              [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [All deal information displayed above]             │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Modal Footer                                        │
│                                                     │
│ [📤 Share] [📊 Export CSV] [🗑️ Delete] [Close]   │
│     ↑                                               │
│  NEW BUTTON                                         │
└─────────────────────────────────────────────────────┘
```

---

## Share Modal Appearance

### When You Click "📤 Share":

```
┌─────────────────────────────────────────────────────┐
│ 📤 Share Deal                                   [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┬──────────────┐                   │
│  │              │              │                   │
│  │     📧       │     💬       │                   │
│  │    Email     │  SMS/Text    │                   │
│  │              │              │                   │
│  └──────────────┴──────────────┘                   │
│  ┌──────────────┬──────────────┐                   │
│  │              │              │                   │
│  │     📋       │     📲       │                   │
│  │  Copy Link   │Share(AirDrop)│                   │
│  │              │              │                   │
│  └──────────────┴──────────────┘                   │
│                                                     │
│  PREVIEW                                            │
│  ┌─────────────────────────────────────────────┐   │
│  │ 📊 DEAL ANALYSIS: ABC Manufacturing         │   │
│  │ ==========================================  │   │
│  │                                             │   │
│  │ 📍 OVERVIEW                                 │   │
│  │ Status: 🔥 Hot                              │   │
│  │ Saved: 1/24/2026                            │   │
│  │ Quality Score: 85/100                       │   │
│  │ Link: https://www.bizquest.com/...          │   │
│  │                                             │   │
│  │ 💰 FINANCIAL HIGHLIGHTS                     │   │
│  │ Asking Price: $3,250,000                    │   │
│  │ EBITDA: $874,703                            │   │
│  │ Max Price: $5,184,515                       │   │
│  │ [... scrollable content ...]                │   │
│  └─────────────────────────────────────────────┘   │
│                 ↑                                   │
│          Scrollable Preview                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Share Option Buttons (Hover States)

### Normal State:

```
┌──────────────┐
│              │
│     📧       │  ← Large emoji icon
│    Email     │  ← Label text
│              │
└──────────────┘
Background: Light gray
Border: Gray
```

### Hover State:

```
┌──────────────┐
│              │  ← Slightly elevated
│     📧       │
│    Email     │
│              │
└──────────────┘
Background: Lighter
Border: Purple (#667eea)
Shadow: Purple glow
Transform: translateY(-2px)
```

---

## Share Workflow Visualization

### Email Flow:

```
User clicks [📧 Email]
         ↓
Email app opens automatically
         ↓
Pre-filled with:
  Subject: Deal Analysis: ABC Manufacturing
  Body: [Full formatted analysis]
         ↓
User reviews and sends
         ↓
Toast: "Opening email client..."
```

### SMS Flow:

```
User clicks [💬 SMS/Text]
         ↓
Messages app opens
         ↓
Pre-filled with short summary:
  Deal: ABC Manufacturing
  Asking: $3,250,000
  EBITDA: $874,703
  Quality: 85/100
  Link: https://...
         ↓
User selects recipient and sends
         ↓
Toast: "Opening messages app..."
```

### Copy Flow:

```
User clicks [📋 Copy Link]
         ↓
Full analysis copied to clipboard
         ↓
Toast: "Deal analysis copied to clipboard!"
         ↓
User pastes into any application
  • Email compose window
  • Notes app
  • CRM system
  • Document
  • Chat application
```

### AirDrop/Native Share Flow:

```
User clicks [📲 Share (AirDrop)]
         ↓
Is Web Share API available?
   ↙YES              NO↘
System share        Fallback to copy
dialog opens        to clipboard
   ↓                    ↓
Shows options:      Toast: "Copied
• AirDrop           to clipboard!"
• WhatsApp
• Messages
• Notes
• More Apps
   ↓
User selects method
   ↓
Share completes
   ↓
Toast: "Shared successfully!"
```

---

## Preview Text Format (Scrollable)

```
┌─────────────────────────────────────────────────────┐
│ PREVIEW                                             │
│ ┌───────────────────────────────────────────────┐   │
│ │                                               │ ↑ │
│ │ 📊 DEAL ANALYSIS: ABC Manufacturing           │ │ │
│ │ ==========================================    │ │ │
│ │                                               │ │ │
│ │ 📍 OVERVIEW                                   │ │ │
│ │ Status: 🔥 Hot                                │ │ │
│ │ Quality Score: 85/100                         │ │ │
│ │                                               │ ║ │
│ │ 💰 FINANCIAL HIGHLIGHTS                       │ ║ │
│ │ Asking Price: $3,250,000                      │ ║ │
│ │ EBITDA: $874,703                              │ ║ │
│ │                                               │ ║ │
│ │ 👔 BROKER CONTACT                             │ ║ │
│ │ Name: John Smith                              │ ║ │
│ │ Company: Acme Brokers                         │ ║ │
│ │                                               │ ║ │
│ │ 📋 DEAL PROGRESS                              │ ║ │
│ │ • LOI Sent (1/24/2026)                        │ ║ │
│ │                                               │ │ │
│ │ 🎯 DEAL STRUCTURE SCENARIOS                   │ │ │
│ │ ==========================================    │ │ │
│ │                                               │ │ │
│ │ SCENARIO 1                                    │ │ │
│ │ ------------------------------                │ │ │
│ │ Purchase Price: $3,250,000                    │ │ │
│ │ EBITDA/SDE: $874,703                          │ ↓ │
│ └───────────────────────────────────────────────┘   │
│                     ↑                               │
│             Max height: 300px                       │
│             Scrolls if content longer               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Toast Notifications

### Success Toast (After Copying):

```
                    ┌─────────────────────────────────┐
                    │ ✅ Deal analysis copied to      │
                    │    clipboard!                   │ [×]
                    └─────────────────────────────────┘
                              ↑
                    Top-right corner
                    Auto-dismiss: 3 seconds
                    Green accent border
```

### Info Toast (Fallback):

```
                    ┌─────────────────────────────────┐
                    │ ℹ️ Web Share not available.     │
                    │    Copied to clipboard instead! │ [×]
                    └─────────────────────────────────┘
                              ↑
                    Blue accent border
```

### Warning Toast (Share Cancelled):

```
                    ┌─────────────────────────────────┐
                    │ ⚠️ Share cancelled or failed    │ [×]
                    └─────────────────────────────────┘
                              ↑
                    Orange accent border
```

---

## Mobile View (Responsive)

### On Smaller Screens:

```
┌─────────────────────────┐
│ 📤 Share Deal       [×] │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │        📧           │ │
│ │       Email         │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │        💬           │ │
│ │      SMS/Text       │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │        📋           │ │
│ │     Copy Link       │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │        📲           │ │
│ │  Share (AirDrop)    │ │
│ └─────────────────────┘ │
│                         │
│ PREVIEW (Scrollable)    │
│ ┌─────────────────────┐ │
│ │ Deal Analysis...    │ │
│ │ [content]           │ │
│ └─────────────────────┘ │
└─────────────────────────┘
      ↑ Stacks vertically
```

---

## Dark Mode Appearance

```
┌─────────────────────────────────────────────────────┐
│ 📤 Share Deal                      Background: #2d2d2d
│                                    Text: #e0e0e0  [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┬──────────────┐                   │
│  │ Background:  │ Background:  │                   │
│  │ #252525      │ #252525      │                   │
│  │     📧       │     💬       │                   │
│  │    Email     │  SMS/Text    │                   │
│  │              │              │                   │
│  └──────────────┴──────────────┘                   │
│         ↑ Hover: Lighter background                │
│           Border: #667eea (same purple)             │
│                                                     │
│  PREVIEW                                            │
│  ┌─────────────────────────────────────────────┐   │
│  │ Background: #252525                         │   │
│  │ Text: #e0e0e0                               │   │
│  │ Monospace font for formatting               │   │
│  │                                             │   │
│  │ [Share content in dark theme...]            │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## System Share Dialog (AirDrop)

### iOS/iPadOS:

```
┌─────────────────────────────────────┐
│                                     │
│  Deal Analysis: ABC Manufacturing   │
│  ════════════════════════════════   │
│                                     │
│  [People/Devices with AirDrop]      │
│  ┌───┐  ┌───┐  ┌───┐               │
│  │👤 │  │💻 │  │📱 │               │
│  │ Me│  │Mac│  │iPad               │
│  └───┘  └───┘  └───┘               │
│                                     │
│  [App Suggestions]                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│  │📧  │ │💬  │ │📝  │ │📁  │       │
│  │Mail│ │Msg │ │Note│ │File│       │
│  └────┘ └────┘ └────┘ └────┘       │
│                                     │
│  [More Apps...]                     │
│                                     │
│         [Cancel]                    │
└─────────────────────────────────────┘
```

### macOS:

```
┌─────────────────────────────────────────┐
│ Share "Deal Analysis: ABC Manufacturing"│
├─────────────────────────────────────────┤
│                                         │
│ AirDrop:                                │
│ ┌────┐ ┌────┐ ┌────┐                   │
│ │ 📱 │ │ 💻 │ │ 📱 │                   │
│ │iPad│ │iMac│ │Phone                   │
│ └────┘ └────┘ └────┘                   │
│                                         │
│ Apps:                                   │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│ │Mail│ │Msgs│ │Note│ │More│           │
│ └────┘ └────┘ └────┘ └────┘           │
│                                         │
└─────────────────────────────────────────┘
```

---

## Example Share Content (As Recipient Sees It)

### Email Received:

```
From: You
To: Partner
Subject: Deal Analysis: ABC Manufacturing

📊 DEAL ANALYSIS: ABC Manufacturing
==================================================

📍 OVERVIEW
Status: 🔥 Hot
Saved: 1/24/2026
Quality Score: 85/100
Link: https://www.bizquest.com/business/...

💰 FINANCIAL HIGHLIGHTS
Asking Price: $3,250,000
EBITDA: $874,703
Max Price: $5,184,515
COC Return: 134.2%
[... full analysis continues ...]

👔 BROKER CONTACT
Name: John Smith
Phone: (555) 123-4567
Email: john@acmebrokers.com

[... scenarios and recommendation ...]

Generated by Deal Analyzer Extension v1.9.20
```

### SMS Received:

```
Deal: ABC Manufacturing
Asking: $3,250,000
EBITDA: $874,703
Quality: 85/100
Link: https://www.bizquest.com/business/...
```

---

## Color Scheme

### Light Mode:
- Modal Background: `#ffffff`
- Button Background: `#f8f9fa`
- Button Hover: `#f0f3ff`
- Border: `#e0e6ed`
- Purple Accent: `#667eea`
- Preview Background: `#f4f6f9`

### Dark Mode:
- Modal Background: `#2d2d2d`
- Button Background: `#252525`
- Button Hover: `#333333`
- Border: `#404040`
- Purple Accent: `#667eea` (same)
- Preview Background: `#252525`

---

## Animation Timings

- Modal fade in: `0.2s`
- Button hover: `0.2s`
- Toast appear: `0.3s`
- Toast disappear: `0.3s`
- Auto-dismiss: `3000ms` (3 seconds)

---

**This visual guide shows the actual UI for the Share feature in v1.9.20**
