# Release Notes - v2.2.0

**Release Date**: January 25, 2026

## 📊 Google Sheets / CSV Import – Full Parsing & Dynamic Columns

### Parse All Columns
- **All columns** from Google Sheets (and CSV) are now imported and stored
- Header row is auto-detected (supports "Daily Deal Update" style sheets with title rows)
- Known fields mapped: Name, Asking Price, Annual Profit, Annual Revenue, City, State, Industry, Description, Date Added, View Listing
- Every other column is stored in `rawFields` and shown as its own table column

### Dynamic Aggregator Table
- Table columns are **dynamic**: built-in (NAME, ASKING, EBITDA, LOCATION, INDUSTRY, SOURCE, DISCOVERED) plus all `rawFields` columns from your data
- **Columns** button: show/hide any column via checkboxes
- **Moveable headers**: drag column headers to reorder; order is persisted
- Sort and search work on all columns (including raw fields)
- Search matches **all fields** (name, location, industry, description, and every `rawFields` value)

### Technical Changes
- `utils/custom-source-manager.js`: `parseCSV` rewritten to capture all columns, detect header row, map Date Added → `discoveredAt`, City+State → location, Annual Revenue → `revenue`
- `deals-dashboard.js`: column discovery, prefs (order + visibility) in `userPreferences.aggregatorColumns`, dynamic header/row rendering, sort/search over raw columns, column menu, drag-and-drop reorder
- `deals-dashboard.html`: dynamic thead, Columns button, column menu popover, styles for draggable headers

## 📋 Files Modified

- `manifest.json` – Version 2.2.0
- `utils/custom-source-manager.js` – Full column parsing, header detection, `rawFields`, revenue
- `deals-dashboard.js` – Dynamic columns, visibility, reorder, sort/search
- `deals-dashboard.html` – Columns UI, dynamic thead, CSS

## 🧪 Testing

1. Add a Google Sheets source (e.g. [Alesha Metzger - Daily Deal Update](https://docs.google.com/spreadsheets/d/1BRxqznJiNw08Rrq0HF-eGqAg7lREkpsnhhXIkyV9BRw/edit?gid=697021806)) and **Fetch**
2. Confirm **Name**, **Asking Price**, **Annual Profit**, **Location**, **Industry**, and extra columns (Date Added, County, State, Broker Name, etc.) appear
3. Click **Columns**, uncheck a column → it hides; check again → it shows
4. Drag a header (e.g. INDUSTRY) left/right → column reorders; refresh → order persists
5. Sort by any column; search by any field (e.g. broker name, city)
