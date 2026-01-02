// --- VERSION ---
const VERSION = 'v1.5.2';

// Global error handler to catch any unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // Prevent error from bubbling and causing extension issues
  event.preventDefault();
});

// Global promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent error from bubbling
  event.preventDefault();
});

// --- 1. HTML UI TEMPLATE ---
const uiHTML = `
<div id="deal-analyzer-container">
  <div id="deal-analyzer-header">
    Deal Analyzer <span style="font-size:11px; opacity:0.8; font-weight:400;">${VERSION}</span>
    <div style="display:flex; gap:8px; align-items:center;">
      <span id="da-save-deal-btn" style="cursor:pointer; font-size:18px; opacity:0.7; transition:opacity 0.2s;" title="Save current deal (Cmd/Ctrl+S)">💾</span>
      <span id="da-coffee-btn" style="cursor:pointer; font-size:18px; opacity:0.7; transition:opacity 0.2s;" title="Buy me a coffee ☕ ($10)">☕</span>
      <span id="da-debug-btn" style="cursor:pointer; font-size:18px; opacity:0.7; transition:opacity 0.2s;" title="Scraping Diagnostics">🔍</span>
      <span id="da-settings-btn" style="cursor:pointer; font-size:18px; opacity:0.7; transition:opacity 0.2s;" title="Settings">⚙️</span>
      <span id="da-close" style="cursor:pointer;">✕</span>
    </div>
  </div>

  <!-- Deal Quality Score Banner -->
  <div id="da-quality-banner" style="background:#f8f9fa; border-bottom:2px solid #ddd; padding:8px 15px; display:flex; justify-content:space-between; align-items:center;">
    <div style="display:flex; align-items:center; gap:10px;">
      <div id="da-quality-badge" style="font-size:20px;">📊</div>
      <div>
        <div style="font-size:11px; color:#666; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Deal Quality</div>
        <div id="da-quality-text" style="font-size:14px; font-weight:700; color:#333;">Analyzing...</div>
      </div>
    </div>
    <div id="da-quality-score" style="font-size:28px; font-weight:700; color:#666;">--</div>
  </div>

  <div class="da-section">
    <div class="da-flex-row">
      <div style="flex:1">
        <label class="da-label">Business EBITDA</label>
        <input type="text" id="da-ebitda" class="da-input" placeholder="0">
      </div>
      <div style="flex:1">
        <label class="da-label">Asking Price</label>
        <input type="text" id="da-asking" class="da-input" placeholder="0">
      </div>
    </div>
    <div id="da-sde-warning" class="da-warning">⚠️ SDE detected. We subtracted $200k for Owner Salary.</div>
  </div>

  <div class="da-section">
    <div class="da-label" style="font-weight:700; color:#333; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">Financing Inputs</div>
    <div id="da-percent-error" class="da-warning" style="background:#fee; border-left-color:#e74c3c; display:none;">⚠️ Total percentages must equal 100%</div>

    <div style="margin-bottom:10px;">
      <div class="da-label" style="font-weight:600; color:#444; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none;" id="da-sba-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span id="da-sba-arrow" style="transition:transform 0.2s; display:inline-block;">▼</span>
          <span>A. SBA</span>
        </div>
        <span id="da-sba-summary" style="font-size:11px; color:#666; font-weight:400;">80% • 11.5% • 10yr • 1.25x DSCR</span>
      </div>
      <div id="da-sba-section" style="margin-top:8px;">
        <div class="da-flex-row">
          <div style="flex:1">
            <label class="da-label">Percentage (%)</label>
            <input type="number" id="da-sba-percent" class="da-input" value="80" step="0.1" min="0" max="100">
          </div>
          <div style="flex:1">
            <label class="da-label">Loan Size ($)</label>
            <input type="text" id="da-sba-loan" class="da-input" value="" placeholder="0" readonly>
          </div>
        </div>
        <div class="da-flex-row">
          <div style="flex:1">
            <label class="da-label">Interest Rate (%)</label>
            <input type="number" id="da-bank-rate" class="da-input" value="11.5" step="0.1">
          </div>
          <div style="flex:1">
            <label class="da-label">Term (Yrs)</label>
            <input type="number" id="da-bank-term" class="da-input" value="10">
          </div>
          <div style="flex:1">
            <label class="da-label">Target DSCR</label>
            <input type="number" id="da-dscr" class="da-input" value="1.25" step="0.05" min="1.0">
          </div>
        </div>
      </div>
    </div>

    <div style="margin-bottom:10px;">
      <div class="da-label" style="font-weight:600; color:#444; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none;" id="da-buyer-equity-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span id="da-buyer-equity-arrow" style="transition:transform 0.2s; display:inline-block;">▼</span>
          <span>B. Buyer Equity</span>
        </div>
        <span id="da-buyer-equity-summary" style="font-size:11px; color:#666; font-weight:400;">10% • $150k salary</span>
      </div>
      <div id="da-buyer-equity-section" style="margin-top:8px;">
        <div class="da-flex-row">
          <div style="flex:1">
            <label class="da-label">Percentage (%)</label>
            <input type="number" id="da-down-percent" class="da-input" value="10" step="0.1" min="0" max="100">
          </div>
          <div style="flex:1">
            <label class="da-label">Equity Amount ($)</label>
            <input type="text" id="da-down" class="da-input" value="" placeholder="0" readonly>
          </div>
        </div>
        <div class="da-row">
          <label class="da-label">Target Owner Salary (Annual) <span style="font-weight:400; color:#999; font-size:11px;">(Required for SBA)</span></label>
          <input type="text" id="da-target-salary" class="da-input" placeholder="150000" value="150000">
          <div id="da-salary-warning" class="da-warning" style="background:#fee; border-left:3px solid #e74c3c; padding:6px 8px; margin-top:4px;">⚠️ Warning: Target salary exceeds available cash flow!</div>
        </div>
      </div>
    </div>

    <div style="margin-bottom:10px;">
      <div class="da-label" style="font-weight:600; color:#444; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="da-seller-note-enabled" style="width:auto; cursor:pointer;">
          <span id="da-seller-note-arrow" style="transition:transform 0.2s; display:inline-block; cursor:pointer; user-select:none;">▼</span>
          <label for="da-seller-note-enabled" style="cursor:pointer;">
            <span>C. Seller Note <span style="font-weight:400; color:#999;">(Optional)</span></span>
          </label>
        </div>
        <span id="da-seller-note-summary" style="font-size:11px; color:#666; font-weight:400;">10% • 6.0% • Amortizing</span>
      </div>
      <div id="da-seller-note-section" style="display:none; margin-top:8px;">
        <div class="da-row">
          <label class="da-label">Percentage (%)</label>
          <input type="number" id="da-seller-percent" class="da-input" value="10" step="0.1" min="0" max="100">
        </div>
        <div class="da-row">
          <label class="da-label">Amount ($) <span style="font-weight:400; color:#999; font-size:11px;">(Auto-calculated, override to edit)</span></label>
          <input type="text" id="da-seller-amt" class="da-input" value="" placeholder="0" readonly>
        </div>
        <div class="da-flex-row">
          <div style="flex:1">
            <label class="da-label">Standby</label>
            <select id="da-seller-standby" class="da-select">
              <option value="no" selected>No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div style="flex:1">
            <label class="da-label">Interest Rate (%)</label>
            <input type="number" id="da-seller-rate" class="da-input" value="6.0" step="0.1">
          </div>
          <div style="flex:1">
            <label class="da-label">Payment Type</label>
            <select id="da-seller-payment-type" class="da-select">
              <option value="amortizing" selected>Amortizing</option>
              <option value="interest-only">Interest Only</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="da-section" style="background:#f4f6f9; flex-grow:1;">
    <div id="da-deal-opportunity" class="da-warning" style="background:#d4edda; border-left-color:#28a745; color:#155724; display:none; margin-bottom:12px; position:relative; padding-right:30px;">
      <span id="da-deal-opportunity-close" style="position:absolute; top:8px; right:8px; cursor:pointer; font-size:16px; opacity:0.7; line-height:1; transition:opacity 0.2s;" title="Dismiss">✕</span>
      💰 <strong>DEAL OPPORTUNITY!</strong><br>
      <span id="da-deal-savings"></span>
    </div>
    
    <!-- MAX SCENARIO -->
    <div style="margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #ddd;">
      <div id="da-max-header" style="font-size:10px; font-weight:700; color:#666; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; cursor:pointer; display:flex; align-items:center; gap:6px; user-select:none;">
        <span id="da-max-arrow" style="transition:transform 0.2s; display:inline-block;">▼</span>
        <span>Maximum Allowable (DSCR-Based)</span>
      </div>
      <div id="da-max-content">
        <div class="da-result-box">
          <div class="da-result-title">Max Allowable Purchase Price</div>
          <div class="da-result-value" id="da-max-price" style="font-size:16px;">$0</div>
        </div>
        <div class="da-result-box" style="border-left-color: #95a5a6;">
          <div class="da-result-title">Max Annual Debt Service</div>
          <div class="da-result-value" id="da-max-debt" style="font-size:16px;">$0</div>
        </div>
      </div>
    </div>
    
    <!-- ROI METRICS -->
    <div style="margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #ddd;">
      <div id="da-roi-header" style="font-size:10px; font-weight:700; color:#666; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; cursor:pointer; display:flex; align-items:center; gap:6px; user-select:none;">
        <span id="da-roi-arrow" style="transition:transform 0.2s; display:inline-block;">▼</span>
        <span>Return on Investment (Year 1)</span>
      </div>
      <div id="da-roi-content">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          <div class="da-result-box" style="border-left-color: #e67e22; margin-top:0;">
            <div class="da-result-title">Cash-on-Cash Return</div>
            <div class="da-result-value" id="da-coc-return" style="font-size:18px;">0%</div>
            <div style="font-size:9px; color:#999; margin-top:1px;">Annual return on equity</div>
          </div>
          <div class="da-result-box" style="border-left-color: #9b59b6; margin-top:0;">
            <div class="da-result-title">Payback Period</div>
            <div class="da-result-value" id="da-payback" style="font-size:18px;">0 yrs</div>
            <div style="font-size:9px; color:#999; margin-top:1px;">Time to recover equity</div>
          </div>
        </div>
    </div>
  </div>
  
  <!-- TARGET OFFER CALCULATOR -->
  <div style="margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #ddd;">
    <div id="da-target-offer-header" style="font-size:10px; font-weight:700; color:#666; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; cursor:pointer; display:flex; align-items:center; gap:6px; user-select:none;">
      <span id="da-target-offer-arrow" style="transition:transform 0.2s; display:inline-block;">▼</span>
      <span>🎯 Target Offer Calculator</span>
    </div>
    <div id="da-target-offer-content">
      <div style="background:#f0f8ff; border:1px solid #3498db; border-radius:4px; padding:10px; margin-bottom:8px;">
        <div style="font-size:11px; color:#2c3e50; margin-bottom:8px;">
          <strong>Calculate the maximum price you should offer</strong> to hit your target returns based on your settings (COC: <span id="da-target-coc-display">25</span>%, Payback: <span id="da-target-payback-display">4</span>yr)
        </div>
        <button id="da-calculate-target-offer-btn" class="da-btn" style="width:100%; background:#3498db; font-weight:600;">🎯 Calculate Target Offer Price</button>
      </div>
      
      <div id="da-target-offer-results" style="display:none;">
        <div class="da-result-box" style="border-left-color:#3498db; background:#f0f8ff;">
          <div class="da-result-title" style="font-weight:700; color:#2c3e50;">🎯 Recommended Offer Price</div>
          <div class="da-result-value" id="da-target-offer-price" style="font-size:20px; font-weight:700; color:#3498db;">$0</div>
          <div style="font-size:10px; color:#666; margin-top:4px; line-height:1.4;" id="da-target-offer-subtitle">
            To achieve your <span id="da-target-coc-result">25</span>% COC return in <span id="da-target-payback-result">4</span> years
          </div>
        </div>
        
        <div id="da-target-comparison" style="margin-top:8px; padding:8px; border-radius:4px; font-size:11px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-weight:600;">vs. Asking Price:</span>
            <span id="da-target-diff-amount" style="font-weight:700;">$0</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>Difference:</span>
            <span id="da-target-diff-percent" style="font-weight:700;">0%</span>
          </div>
        </div>
        
        <div style="margin-top:8px; padding:8px; background:#f8f9fa; border-radius:4px; font-size:10px; color:#666;">
          <div style="font-weight:600; margin-bottom:4px;">Financing Assumptions:</div>
          <div id="da-target-financing-breakdown" style="line-height:1.6;"></div>
        </div>
        
        <div style="margin-top:8px;">
          <div style="font-size:10px; font-weight:600; color:#666; margin-bottom:4px;">Projected Metrics at Target Price:</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <div style="background:#f8f9fa; padding:6px; border-radius:3px;">
              <div style="font-size:9px; color:#999;">Free Cash Flow</div>
              <div id="da-target-fcf" style="font-size:12px; font-weight:700; color:#27ae60;">$0</div>
            </div>
            <div style="background:#f8f9fa; padding:6px; border-radius:3px;">
              <div style="font-size:9px; color:#999;">Total Take-Home</div>
              <div id="da-target-takehome" style="font-size:12px; font-weight:700; color:#2c3e50;">$0</div>
            </div>
          </div>
        </div>
        
        <button id="da-use-target-offer-btn" class="da-btn" style="width:100%; margin-top:8px; background:#27ae60; font-size:11px;">✓ Use This as Actual Price</button>
      </div>
    </div>
  </div>
  
  <!-- ACTUAL SCENARIO -->
  <div style="margin-bottom:10px;">
    <div id="da-actual-header" style="font-size:10px; font-weight:700; color:#666; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; cursor:pointer; display:flex; align-items:center; gap:6px; user-select:none;">
      <span id="da-actual-arrow" style="transition:transform 0.2s; display:inline-block;">▼</span>
      <span>Actual Deal Scenario</span>
    </div>
      <div id="da-actual-content">
        <div class="da-result-box" style="border-left-color: #e67e22;">
          <div class="da-result-title">Offer Price <span style="font-weight:400; color:#999; font-size:9px;">(Click to Edit)</span></div>
          <input type="text" id="da-actual-price" class="da-input" value="$0" readonly style="font-size:16px; font-weight:700; color:#2c3e50; border:none; background:transparent; padding:3px 0; cursor:pointer;">
        </div>
        <div class="da-result-box" style="border-left-color: #9b59b6;">
          <div class="da-result-title">Total Debt Service</div>
          <div class="da-result-value" id="da-total-debt" style="font-size:16px;">$0</div>
        </div>
        <div class="da-result-box" style="border-left-color: #27ae60;">
          <div class="da-result-title">Free Cash Flow (Annual)</div>
          <div class="da-result-value" id="da-fcf-annual" style="font-size:16px;">$0</div>
          <div style="font-size:10px; color:#666; margin-top:3px;">Monthly: <span id="da-fcf-monthly">$0</span></div>
        </div>
        <div class="da-result-box" style="border-left-color: #3498db;">
          <div class="da-result-title">Total Owner Take-Home</div>
          <div class="da-result-value" id="da-owner-salary" style="font-size:16px;">$0</div>
          <div style="font-size:9px; color:#999; margin-top:3px;" id="da-owner-subtitle">Salary + FCF (max available: <span id="da-max-available">$0</span>)</div>
        </div>
      </div>
    </div>
    
    <div style="display:flex; gap:6px; margin-top:6px;">
      <button id="da-recalc-btn" class="da-btn" style="flex:1;">↺ Refresh Data</button>
      <button id="da-share-btn" class="da-btn" style="flex:1; background:#3498db;">📤 Share Deal</button>
    </div>
  </div>
  
  <!-- Deal Notes Section (Bottom) -->
  <div class="da-section" style="background:#fafbfc; border-top:2px solid #ddd;">
    <div class="da-label" style="font-weight:600; color:#444; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
      📝 Deal Notes
      <span style="font-size:10px; color:#999; font-weight:400;">(Included in all exports)</span>
    </div>
    <textarea id="da-deal-notes" class="da-input" placeholder="Add notes: questions for seller, red flags, follow-ups, pros/cons..." style="width:100%; min-height:60px; font-size:11px; padding:8px; resize:vertical; font-family:inherit; border:1px solid #ddd;"></textarea>
    <div style="display:flex; gap:6px; margin-top:6px;">
      <input type="text" id="da-deal-name" class="da-input" placeholder="Deal name (for saving)" style="flex:1; font-size:11px; padding:6px 8px;">
      <select id="da-saved-deals-list" class="da-select" style="flex:1; font-size:11px; padding:6px 8px;">
        <option value="">Load saved deal...</option>
      </select>
    </div>
  </div>
</div>
`;

// Share Modal HTML
const shareModalHTML = `
<div id="da-share-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2147483646; align-items:center; justify-content:center;">
  <div style="background:white; border-radius:8px; padding:24px; max-width:400px; width:90%; box-shadow:0 4px 20px rgba(0,0,0,0.3);">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h3 style="margin:0; font-size:18px; color:#2c3e50;">Share Deal Analysis</h3>
      <span id="da-share-close" style="cursor:pointer; font-size:24px; color:#999; line-height:1;">&times;</span>
    </div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      <button id="da-share-pdf" class="da-btn" style="background:#e74c3c;">📄 Export as PDF</button>
      <button id="da-share-email" class="da-btn" style="background:#3498db;">📧 Email</button>
      <button id="da-share-sms" class="da-btn" style="background:#27ae60;">💬 SMS</button>
      <button id="da-share-native" class="da-btn" style="background:#9b59b6;">📱 Share (AirDrop)</button>
      <button id="da-share-copy" class="da-btn" style="background:#95a5a6;">📋 Copy to Clipboard</button>
    </div>
  </div>
</div>
`;

// Settings Modal HTML
const settingsModalHTML = `
<div id="da-settings-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2147483646; align-items:center; justify-content:center;">
  <div style="background:white; border-radius:8px; padding:24px; max-width:450px; width:90%; box-shadow:0 4px 20px rgba(0,0,0,0.3);">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h3 style="margin:0; font-size:18px; color:#2c3e50;">⚙️ Settings & Targets</h3>
      <span id="da-settings-close" style="cursor:pointer; font-size:24px; color:#999; line-height:1;">&times;</span>
    </div>
    
    <div style="margin-bottom:20px;">
      <h4 style="font-size:14px; color:#2c3e50; margin:0 0 12px 0; border-bottom:1px solid #eee; padding-bottom:6px;">Deal Quality Targets</h4>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:12px; color:#666; margin-bottom:4px; font-weight:600;">Target Cash-on-Cash Return (%)</label>
        <input type="number" id="da-target-coc" class="da-input" value="25" step="1" min="0" max="200" style="width:100%;">
        <div style="font-size:10px; color:#999; margin-top:2px;">Your minimum acceptable annual return on equity investment</div>
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:12px; color:#666; margin-bottom:4px; font-weight:600;">Target Payback Period (Years)</label>
        <input type="number" id="da-target-payback" class="da-input" value="4" step="0.5" min="1" max="20" style="width:100%;">
        <div style="font-size:10px; color:#999; margin-top:2px;">Maximum years to recover your initial equity investment</div>
      </div>
    </div>
    
    <div style="margin-bottom:20px;">
      <h4 style="font-size:14px; color:#2c3e50; margin:0 0 12px 0; border-bottom:1px solid #eee; padding-bottom:6px;">Display Preferences</h4>
      <div style="margin-bottom:12px;">
        <label style="display:flex; align-items:center; cursor:pointer; gap:8px;">
          <input type="checkbox" id="da-format-compact" style="cursor:pointer;">
          <span style="font-size:12px; color:#666; font-weight:600;">Use compact number format (1.2M instead of 1,200,000)</span>
        </label>
      </div>
    </div>
    
    <div style="display:flex; gap:8px;">
      <button id="da-settings-save" class="da-btn" style="flex:1; background:#27ae60;">💾 Save Settings</button>
      <button id="da-settings-reset" class="da-btn" style="flex:1; background:#95a5a6;">↺ Reset Defaults</button>
    </div>
  </div>
</div>
`;

// Debug/Diagnostics Modal HTML
const debugModalHTML = `
<div id="da-debug-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2147483646; align-items:center; justify-content:center;">
  <div style="background:white; border-radius:8px; padding:24px; max-width:650px; width:90%; max-height:80vh; overflow-y:auto; box-shadow:0 4px 20px rgba(0,0,0,0.3);">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <h3 style="margin:0; font-size:18px; color:#2c3e50;">🔍 Scraping Diagnostics</h3>
      <span id="da-debug-close" style="cursor:pointer; font-size:24px; color:#999; line-height:1;">&times;</span>
    </div>
    
    <div style="margin-bottom:20px;">
      <div style="background:#f8f9fa; border-radius:6px; padding:12px; margin-bottom:12px;">
        <div style="font-size:12px; color:#666; margin-bottom:8px; font-weight:600;">CURRENT PAGE</div>
        <div id="da-debug-url" style="font-size:11px; color:#333; word-break:break-all; margin-bottom:6px;"></div>
        <div style="display:flex; gap:12px; align-items:center;">
          <div><span style="font-size:11px; color:#666;">Platform:</span> <strong id="da-debug-platform" style="font-size:12px; color:#3498db;">Unknown</strong></div>
          <div><span style="font-size:11px; color:#666;">Status:</span> <span id="da-debug-status" style="font-size:12px; font-weight:600;">Not scraped</span></div>
        </div>
      </div>
      
      <div style="background:#fff3cd; border-left:4px solid #f39c12; padding:12px; margin-bottom:12px; border-radius:4px;">
        <div style="font-size:12px; color:#856404; font-weight:600; margin-bottom:4px;">💡 TIP</div>
        <div style="font-size:11px; color:#856404;">Open your browser's console (F12) to see detailed scraping logs with all attempts and strategies used.</div>
      </div>
    </div>
    
    <div style="margin-bottom:20px;">
      <h4 style="font-size:14px; color:#2c3e50; margin:0 0 12px 0; border-bottom:1px solid #eee; padding-bottom:6px;">Scraped Data</h4>
      <div style="display:grid; gap:10px;">
        <div style="background:#f8f9fa; padding:10px; border-radius:4px;">
          <div style="font-size:11px; color:#666; margin-bottom:4px;">Asking Price</div>
          <div id="da-debug-price" style="font-size:14px; font-weight:600; color:#2c3e50;">Not found</div>
        </div>
        <div style="background:#f8f9fa; padding:10px; border-radius:4px;">
          <div style="font-size:11px; color:#666; margin-bottom:4px;">EBITDA / SDE</div>
          <div id="da-debug-ebitda" style="font-size:14px; font-weight:600; color:#2c3e50;">Not found</div>
        </div>
      </div>
    </div>
    
    <div style="margin-bottom:20px;">
      <h4 style="font-size:14px; color:#2c3e50; margin:0 0 12px 0; border-bottom:1px solid #eee; padding-bottom:6px;">Actions</h4>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="da-debug-rescrape" class="da-btn" style="background:#3498db; font-size:12px; padding:8px 16px;">🔄 Re-scrape Page</button>
        <button id="da-debug-console" class="da-btn" style="background:#95a5a6; font-size:12px; padding:8px 16px;">📋 Open Console (F12)</button>
      </div>
    </div>
    
    <div style="background:#e7f3ff; border-left:4px solid #3498db; padding:12px; border-radius:4px; margin-bottom:12px;">
      <div style="font-size:12px; color:#1e5a8e; font-weight:600; margin-bottom:6px;">🛠️ Troubleshooting</div>
      <div style="font-size:11px; color:#1e5a8e; line-height:1.5;">
        <strong>No data found?</strong> Try these steps:<br>
        1. Make sure you're on a listing detail page (not search results)<br>
        2. Wait for the page to fully load before opening Deal Analyzer<br>
        3. Check if financial data is visible on the page<br>
        4. Some sites require login to view financial details<br>
        5. Open console (F12) for detailed scraping logs
      </div>
    </div>
    
    <div style="text-align:center; margin-top:16px;">
      <button id="da-debug-done" class="da-btn" style="background:#27ae60; font-size:12px; padding:10px 24px;">✅ Done</button>
    </div>
  </div>
</div>
`;

// Inject the UI
try {
  const div = document.createElement('div');
  div.innerHTML = uiHTML;
  document.body.appendChild(div);
} catch (error) {
  console.error('Error injecting main UI:', error);
}

// Inject the share modal
try {
  const shareDiv = document.createElement('div');
  shareDiv.innerHTML = shareModalHTML;
  document.body.appendChild(shareDiv);
} catch (error) {
  console.error('Error injecting share modal:', error);
}

// Inject the settings modal
try {
  const settingsDiv = document.createElement('div');
  settingsDiv.innerHTML = settingsModalHTML;
  document.body.appendChild(settingsDiv);
} catch (error) {
  console.error('Error injecting settings modal:', error);
}

// Inject the debug/diagnostics modal
try {
  const debugDiv = document.createElement('div');
  debugDiv.innerHTML = debugModalHTML;
  document.body.appendChild(debugDiv);
} catch (error) {
  console.error('Error injecting debug modal:', error);
}

// --- 2. DRAGGABLE WINDOW LOGIC ---
const container = document.getElementById('deal-analyzer-container');
const header = document.getElementById('deal-analyzer-header');

// Check if elements exist
if (!container || !header) {
  console.error('Deal Analyzer UI elements not found. Extension may not work properly.');
}

// START HIDDEN BY DEFAULT - only show when user clicks extension icon
if (container) {
  container.style.display = 'none';
}

// User preferences with defaults
let userPreferences = {
  targetCOC: 25, // 25% Cash-on-Cash return
  targetPayback: 4, // 4 years payback period
  compactFormat: false
};
let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

if (header && container) {
  header.addEventListener("mousedown", dragStart);
  document.addEventListener("mouseup", dragEnd);
  document.addEventListener("mousemove", drag);
}

function dragStart(e) {
  initialX = e.clientX - xOffset;
  initialY = e.clientY - yOffset;
  if (e.target === header) isDragging = true;
}
function dragEnd() { isDragging = false; }
function drag(e) {
  if (isDragging && container) {
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    
    // Prevent dragging above the top of the viewport (min 10px from top)
    const containerRect = container.getBoundingClientRect();
    const minTop = 10;
    const maxBottom = window.innerHeight - 50; // Keep at least 50px of header visible at bottom
    
    // Calculate what the new top position would be
    const newTop = 120 + currentY; // 120 is the initial top position from CSS
    
    // Constrain the Y position
    if (newTop < minTop) {
      currentY = minTop - 120;
      yOffset = currentY;
    } else if (newTop > maxBottom) {
      currentY = maxBottom - 120;
      yOffset = currentY;
    } else {
      xOffset = currentX;
      yOffset = currentY;
    }
    
    container.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
  }
}

const closeBtn = document.getElementById('da-close');
if (closeBtn && container) {
  closeBtn.onclick = () => container.style.display = 'none';
}

// Coffee button - opens Venmo with suggested amount
const coffeeBtn = document.getElementById('da-coffee-btn');
if (coffeeBtn) {
  coffeeBtn.onclick = () => {
    if (confirm('☕ Buy me a coffee?\n\nSuggested amount: $10\n\nThis will open Venmo (@amco-digital)')) {
      window.open('https://venmo.com/u/amco-digital', '_blank');
    }
  };
}

// Listen for messages from background script to toggle window
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "toggleWindow") {
      const container = document.getElementById('deal-analyzer-container');
      if (container) {
        if (container.style.display === 'none') {
          container.style.display = 'flex';
        } else {
          container.style.display = 'none';
        }
      }
      // Send response to acknowledge message received
      sendResponse({ status: "toggled" });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ status: "error", message: error.message });
  }
  // Return true to indicate we'll send a response asynchronously (though we send it synchronously above)
  return true;
});

// --- 3. IMPROVED "SMART" SCRAPING LOGIC ---

// Helper: Converts "$3,000,000" string to 3000000 number
// --- PLATFORM DETECTION & SCRAPING ---

// Detect which platform we're on
function detectPlatform() {
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes('bizquest.com')) return 'bizquest';
  if (hostname.includes('bizbuysell.com')) return 'bizbuysell';
  if (hostname.includes('crexi.com')) return 'crexi';
  if (hostname.includes('loopnet.com')) return 'loopnet';
  if (hostname.includes('zillow.com')) return 'zillow';
  if (hostname.includes('redfin.com')) return 'redfin';
  if (hostname.includes('realtor.com')) return 'realtor';
  if (hostname.includes('costar.com')) return 'costar';
  
  return 'generic';
}

// Wait for element to appear (for dynamic content)
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    // Check if already exists
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }
    
    // Set up observer
    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

// Platform-specific scrapers
const platformScrapers = {
  bizquest: function() {
    console.log('🏢 Using BizQuest-specific scraper');
    let data = { askingPrice: 0, ebitda: 0, isSDE: false };
    
    // BizQuest uses specific CSS classes and data attributes
    // Try multiple strategies
    
    // Strategy 1: Look for data-qa attributes (common in React apps)
    const priceEl = document.querySelector('[data-qa*="price"], [data-testid*="price"]');
    if (priceEl) {
      data.askingPrice = parseCurrency(priceEl.innerText);
      console.log('  ✅ Found price via data attribute:', data.askingPrice);
    }
    
    // Strategy 2: Look in detail cards/sections
    const detailSections = document.querySelectorAll('.details-card, .detail-section, .listing-details, [class*="detail"]');
    let sdeValue = 0;
    let ebitdaValue = 0;
    
    for (const section of detailSections) {
      const text = section.innerText || '';
      
      // Check for asking price
      if (!data.askingPrice && /asking price/i.test(text)) {
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (/asking price/i.test(lines[i]) && lines[i + 1]) {
            data.askingPrice = parseCurrency(lines[i + 1]);
            if (data.askingPrice > 0) {
              console.log('  ✅ Found asking price in details:', data.askingPrice);
              break;
            }
          }
        }
      }
      
      // Check for EBITDA specifically
      if (/\bebitda\b/i.test(text)) {
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/\bebitda\b/i.test(line) && lines[i + 1]) {
            ebitdaValue = parseCurrency(lines[i + 1]);
            if (ebitdaValue > 0) {
              console.log('  ✅ Found EBITDA in details:', ebitdaValue);
              break;
            }
          }
        }
      }
      
      // Check for SDE/Cash Flow
      if (/cash flow|sde|discretionary earnings/i.test(text)) {
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if ((/cash flow|sde|discretionary earnings/i.test(line)) && lines[i + 1]) {
            sdeValue = parseCurrency(lines[i + 1]);
            if (sdeValue > 0) {
              console.log('  ✅ Found SDE/Cash Flow in details:', sdeValue);
              break;
            }
          }
        }
      }
    }
    
    // Prefer EBITDA over SDE when both are present
    if (ebitdaValue > 0) {
      data.ebitda = ebitdaValue;
      data.isSDE = false;
      console.log('  ℹ️ Using EBITDA (preferred):', ebitdaValue);
      if (sdeValue > 0) {
        console.log('  ℹ️ Also found SDE (' + sdeValue + ') but using EBITDA');
      }
    } else if (sdeValue > 0) {
      data.ebitda = sdeValue;
      data.isSDE = true;
      console.log('  ℹ️ Using SDE (no EBITDA found):', sdeValue);
    }
    
    // Strategy 3: Try JSON-LD structured data (many listing sites use this)
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        const data_ld = JSON.parse(jsonLd.textContent);
        if (data_ld.offers && data_ld.offers.price) {
          data.askingPrice = parseCurrency(String(data_ld.offers.price));
          console.log('  ✅ Found price in JSON-LD:', data.askingPrice);
        }
      } catch (e) {
        console.log('  ⚠️ Could not parse JSON-LD');
      }
    }
    
    return data;
  },
  
  bizbuysell: function() {
    console.log('🏢 Using BizBuySell-specific scraper');
    let data = { askingPrice: 0, ebitda: 0, isSDE: false };
    
    // BizBuySell typically has clean labeled fields
    const labels = document.querySelectorAll('.profile-label, .data-label, dt, th');
    for (const label of labels) {
      const text = label.innerText?.trim().toLowerCase();
      const valueEl = label.nextElementSibling || label.parentElement;
      
      if (text && valueEl) {
        if (text.includes('asking price') || text === 'price') {
          data.askingPrice = parseCurrency(valueEl.innerText);
          if (data.askingPrice > 0) {
            console.log('  ✅ Found asking price:', data.askingPrice);
          }
        }
        
        if (text.includes('ebitda')) {
          data.ebitda = parseCurrency(valueEl.innerText);
          data.isSDE = false;
          if (data.ebitda > 0) {
            console.log('  ✅ Found EBITDA:', data.ebitda);
          }
        }
        
        if (text.includes('cash flow') || text.includes('sde') || text.includes('discretionary')) {
          data.ebitda = parseCurrency(valueEl.innerText);
          data.isSDE = true;
          if (data.ebitda > 0) {
            console.log('  ✅ Found SDE/Cash Flow:', data.ebitda);
          }
        }
      }
    }
    
    return data;
  },
  
  crexi: function() {
    console.log('🏢 Using Crexi-specific scraper');
    let data = { askingPrice: 0, ebitda: 0, isSDE: false };
    
    // Crexi is a commercial real estate platform
    // Look for price in header or summary section
    const priceSelectors = [
      '[class*="price"]',
      '[class*="Price"]',
      '.listing-price',
      '.property-price'
    ];
    
    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el && !data.askingPrice) {
        const price = parseCurrency(el.innerText);
        if (price > 10000) { // Sanity check
          data.askingPrice = price;
          console.log('  ✅ Found price via selector', selector, ':', price);
          break;
        }
      }
    }
    
    // Look for financials in details/metrics section
    const metricSections = document.querySelectorAll('[class*="metric"], [class*="financial"], [class*="detail"]');
    for (const section of metricSections) {
      const text = section.innerText || '';
      const lines = text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        
        // NOI (Net Operating Income) is common in commercial real estate
        if (line.includes('noi') || line.includes('net operating income')) {
          const value = parseCurrency(lines[i + 1] || lines[i]);
          if (value > 0 && !data.ebitda) {
            data.ebitda = value;
            data.isSDE = false;
            console.log('  ✅ Found NOI (using as EBITDA):', value);
          }
        }
        
        if (line.includes('ebitda')) {
          const value = parseCurrency(lines[i + 1] || lines[i]);
          if (value > 0) {
            data.ebitda = value;
            data.isSDE = false;
            console.log('  ✅ Found EBITDA:', value);
          }
        }
        
        if (line.includes('cash flow') || line.includes('sde')) {
          const value = parseCurrency(lines[i + 1] || lines[i]);
          if (value > 0 && !data.ebitda) {
            data.ebitda = value;
            data.isSDE = true;
            console.log('  ✅ Found Cash Flow/SDE:', value);
          }
        }
      }
    }
    
    return data;
  },
  
  loopnet: function() {
    console.log('🏢 Using LoopNet-specific scraper');
    let data = { askingPrice: 0, ebitda: 0, isSDE: false };
    
    // LoopNet is owned by CoStar - commercial real estate
    // Look for price in prominent display
    const priceSelectors = [
      '[data-testid="price"]',
      '.price-section',
      '[class*="asking-price"]',
      '[class*="AskingPrice"]'
    ];
    
    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el && !data.askingPrice) {
        const price = parseCurrency(el.innerText);
        if (price > 10000) {
          data.askingPrice = price;
          console.log('  ✅ Found price via selector', selector, ':', price);
          break;
        }
      }
    }
    
    // Look for financial details
    const detailRows = document.querySelectorAll('.property-detail-row, [class*="detail-row"], tr');
    for (const row of detailRows) {
      const text = row.innerText?.toLowerCase() || '';
      
      if (text.includes('asking price') && !data.askingPrice) {
        data.askingPrice = parseCurrency(row.innerText);
        if (data.askingPrice > 0) {
          console.log('  ✅ Found asking price:', data.askingPrice);
        }
      }
      
      if (text.includes('noi') || text.includes('net operating income')) {
        const value = parseCurrency(row.innerText);
        if (value > 0 && !data.ebitda) {
          data.ebitda = value;
          data.isSDE = false;
          console.log('  ✅ Found NOI:', value);
        }
      }
      
      if (text.includes('ebitda')) {
        const value = parseCurrency(row.innerText);
        if (value > 0) {
          data.ebitda = value;
          data.isSDE = false;
          console.log('  ✅ Found EBITDA:', value);
        }
      }
    }
    
    return data;
  },
  
  zillow: function() {
    console.log('🏢 Using Zillow-specific scraper');
    let data = { askingPrice: 0, ebitda: 0, isSDE: false };
    
    // Zillow is primarily residential, but has commercial listings
    // Price is usually prominent in header
    const priceSelectors = [
      '[data-testid="price"]',
      '.ds-summary-row span',
      '[class*="price"]'
    ];
    
    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el && !data.askingPrice) {
        const price = parseCurrency(el.innerText);
        if (price > 10000) {
          data.askingPrice = price;
          console.log('  ✅ Found price via selector', selector, ':', price);
          break;
        }
      }
    }
    
    // Zillow doesn't typically show EBITDA for residential
    // But may have it for commercial/business properties
    const facts = document.querySelectorAll('.ds-home-fact-list li, [class*="fact"]');
    for (const fact of facts) {
      const text = fact.innerText?.toLowerCase() || '';
      if (text.includes('annual income') || text.includes('gross income')) {
        const value = parseCurrency(fact.innerText);
        if (value > 0) {
          data.ebitda = value;
          data.isSDE = false;
          console.log('  ✅ Found annual income:', value);
        }
      }
    }
    
    return data;
  },
  
  redfin: function() {
    console.log('🏢 Using Redfin-specific scraper');
    let data = { askingPrice: 0, ebitda: 0, isSDE: false };
    
    // Redfin structure - price in header
    const priceSelectors = [
      '.home-main-stats .statsValue',
      '[data-rf-test-name="abp-price"]',
      '.price'
    ];
    
    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el && !data.askingPrice) {
        const price = parseCurrency(el.innerText);
        if (price > 10000) {
          data.askingPrice = price;
          console.log('  ✅ Found price via selector', selector, ':', price);
          break;
        }
      }
    }
    
    return data;
  }
};

function parseCurrency(str) {
  if (!str) return 0;
  
  // Check for "Not Disclosed", "N/A", "Undisclosed", etc.
  if (/not\s+disclosed|undisclosed|n\/a|not\s+available|confidential/i.test(str)) {
    console.log('  ⚠️ Value is not disclosed:', str);
    return 0;
  }
  
  // Handle abbreviated formats like "1.5M", "500K", "2.3B"
  const abbrevMatch = str.match(/([\d,.]+)\s*([MmKkBb])\b/);
  if (abbrevMatch) {
    const num = parseFloat(abbrevMatch[1].replace(/,/g, ''));
    const multiplier = abbrevMatch[2].toUpperCase();
    if (multiplier === 'K') return Math.round(num * 1000);
    if (multiplier === 'M') return Math.round(num * 1000000);
    if (multiplier === 'B') return Math.round(num * 1000000000);
  }
  
  // Handle standard formats: $1,000 or 100,000 or $1000000
  const match = str.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
  return match ? parseInt(match[0].replace(/,/g, '')) : 0;
}

// Helper: Finds a value on the page by looking for its label
function findValueByLabel(keywords) {
  // We look at all common text containers
  const candidates = document.querySelectorAll('b, strong, span, p, div, td, dt, h4, h5, h3, h2, label, [class*="label"], [class*="field"]');

  console.log(`🔍 Searching for keywords:`, keywords);
  let foundElements = [];

  for (const el of candidates) {
    const text = el.innerText?.trim().toLowerCase();
    if (!text) continue;
    
    const labelFound = keywords.some(k => {
      const keyword = k.toLowerCase();
      // Match: exact match, starts with keyword, or contains keyword (if short enough)
      return text === keyword || 
             text.startsWith(keyword + ":") || 
             text.startsWith(keyword + " ") ||
             text === keyword + ":" ||
             (text.includes(keyword) && text.length < keyword.length + 100);
    });

    if (labelFound) {
      console.log(`✅ Found label "${text}" matching keywords:`, keywords);
      foundElements.push(el);
      
      // STRATEGY A: The value is in the next sibling element (e.g., <b>Price:</b> <span>$100</span>)
      let sibling = el.nextElementSibling;
      if (sibling) {
        const siblingText = sibling.innerText?.trim();
        console.log(`  → Checking next sibling: "${siblingText}"`);
        if (siblingText && siblingText.match(/\$|[\d,]+/)) {
          const value = parseCurrency(siblingText);
          console.log(`  → Strategy A (next sibling): "${siblingText}" = ${value}`);
          if (value > 0) return value;
        }
      }

      // STRATEGY B: The value is inside the parent's text (e.g., <p><b>Price:</b> $100</p>)
      if (el.parentElement) {
        const parentText = el.parentElement.innerText;
        console.log(`  → Parent element text (first 200 chars): "${parentText.substring(0, 200)}..."`);
        // Remove the label itself to isolate the number
        const cleanParent = parentText.replace(el.innerText, "");
        if (cleanParent.match(/\$|[\d,]+/)) {
          const value = parseCurrency(cleanParent);
          console.log(`  → Strategy B (parent text): first $ value found = ${value}`);
          if (value > 0) return value;
        }
      }

      // STRATEGY C: The value is in the same element? (e.g. <div>Price: $100</div>)
      if (el.innerText.match(/\$|[\d,]+/)) {
        const value = parseCurrency(el.innerText);
        console.log(`  → Strategy C (same element): "${el.innerText}" = ${value}`);
        if (value > 0) return value;
      }
      
      // STRATEGY D: Check for data attributes (React/Vue apps often use these)
      if (el.dataset) {
        for (const [key, val] of Object.entries(el.dataset)) {
          if (val && typeof val === 'string' && val.match(/\d/)) {
            const value = parseCurrency(val);
            console.log(`  → Strategy D (data-${key}): "${val}" = ${value}`);
            if (value > 0) return value;
          }
        }
      }
      
      // STRATEGY E: Check next <td> if in a table
      if (el.tagName === 'TD' || el.tagName === 'TH') {
        const nextTd = el.nextElementSibling;
        if (nextTd && (nextTd.tagName === 'TD' || nextTd.tagName === 'TH')) {
          const value = parseCurrency(nextTd.innerText);
          console.log(`  → Strategy E (next table cell): "${nextTd.innerText}" = ${value}`);
          if (value > 0) return value;
        }
      }
      
      console.log(`  ⚠️ Label found but no dollar value extracted`);
    }
  }
  
  console.log(`❌ No match found for keywords:`, keywords);
  console.log(`   Found ${foundElements.length} elements with matching labels but no valid values`);
  return 0; // Not found
}

function scrapeData() {
  try {
    console.log('🔄 Starting scrapeData...');
    console.log('📍 Current URL:', window.location.href);
    
    // Detect platform
    const platform = detectPlatform();
    console.log('🏢 Platform detected:', platform);
    
    let askingPrice = 0;
    let ebitdaVal = 0;
    let isSDE = false;
    
    // Try platform-specific scraper first
    if (platformScrapers[platform]) {
      console.log(`🎯 Attempting ${platform}-specific scraper...`);
      const platformData = platformScrapers[platform]();
      
      if (platformData.askingPrice > 0) {
        askingPrice = platformData.askingPrice;
        console.log('✅ Platform scraper found asking price:', askingPrice);
      }
      
      if (platformData.ebitda > 0) {
        ebitdaVal = platformData.ebitda;
        isSDE = platformData.isSDE;
        console.log('✅ Platform scraper found EBITDA/SDE:', ebitdaVal, isSDE ? '(SDE)' : '(EBITDA)');
      }
    }
    
    // Fallback to generic scraper if platform scraper didn't find values
    if (askingPrice === 0) {
      console.log('\n💰 Platform scraper didn\'t find price, trying generic scraper...');
      askingPrice = findValueByLabel(["Asking Price", "Price", "Purchase Price", "Sale Price", "List Price"]);
      console.log('💰 Generic scraper - Asking Price found:', askingPrice);
    }
    
    if (ebitdaVal === 0) {
      console.log('\n📊 Platform scraper didn\'t find EBITDA, trying generic scraper...');
      
      // ALWAYS prefer EBITDA over SDE when both are present
      // Priority 1: Look for explicit "EBITDA" first (most accurate for M&A)
      const ebitdaValue = findValueByLabel(["EBITDA"]);
      
      // Priority 2: Look for Cash Flow / SDE as backup
      const sdeValue = findValueByLabel(["Cash Flow", "SDE", "Seller Discretionary Earnings", "Discretionary Earnings", "Seller's Discretionary Earnings", "Net Operating Income", "NOI"]);
      
      // Prefer EBITDA if found, otherwise use SDE
      if (ebitdaValue > 0) {
        ebitdaVal = ebitdaValue;
        isSDE = false;
        console.log('✅ Found EBITDA (preferred):', ebitdaVal);
        if (sdeValue > 0) {
          console.log('   ℹ️ Also found SDE (' + sdeValue + ') but using EBITDA instead');
        }
      } else if (sdeValue > 0) {
        ebitdaVal = sdeValue;
        isSDE = true;
        console.log('✅ Found SDE/Cash Flow (no EBITDA available):', ebitdaVal);
      } else {
        console.log('⚠️ No EBITDA or SDE found');
      }
    }
    
    // Store results for diagnostics
    lastScrapeData = {
      platform: platform,
      askingPrice: askingPrice,
      ebitda: ebitdaVal,
      isSDE: isSDE,
      timestamp: new Date().toISOString()
    };

    // 3. Update Inputs with formatted numbers (with $ for currency fields)
    const askingField = document.getElementById('da-asking');
    if (askingPrice > 0 && askingField) {
        askingField.value = '$' + formatNumber(askingPrice);
        console.log('✅ Updated Asking Price field:', askingField.value);
    } else {
        console.log('⚠️ No asking price to update');
    }

    const ebitdaField = document.getElementById('da-ebitda');
    const sdeWarning = document.getElementById('da-sde-warning');
    if (ebitdaVal > 0 && ebitdaField) {
        if (isSDE) {
            console.log('⚠️ SDE detected, subtracting $200k for owner salary');
            if (sdeWarning) sdeWarning.classList.add('visible');
            // Apply $200k subtraction rule for SDE
            const originalVal = ebitdaVal;
            ebitdaVal = Math.max(0, ebitdaVal - 200000);
            console.log(`   Original SDE: $${formatNumber(originalVal)}`);
            console.log(`   After -$200k: $${formatNumber(ebitdaVal)}`);
        } else {
            if (sdeWarning) sdeWarning.classList.remove('visible');
        }
        ebitdaField.value = '$' + formatNumber(ebitdaVal);
        console.log('✅ Updated EBITDA field:', ebitdaField.value);
    } else {
        console.log('⚠️ No EBITDA/SDE value to update');
        // If we found nothing, clear the warning so it doesn't confuse user
        if (sdeWarning) sdeWarning.classList.remove('visible');
    }
    
    // Log scraping summary
    console.log('\n📋 SCRAPING SUMMARY:');
    console.log('   Platform:', platform);
    console.log('   Asking Price:', askingPrice > 0 ? '$' + formatNumber(askingPrice) : 'Not found');
    console.log('   EBITDA/SDE:', ebitdaVal > 0 ? '$' + formatNumber(ebitdaVal) + (isSDE ? ' (SDE)' : ' (EBITDA)') : 'Not found');

    console.log('🏁 Scraping complete, triggering calculation...\n');
    calculate();
  } catch (error) {
    console.error('❌ Error in scrapeData:', error);
  }
}

// Helper: Parse number from formatted string (removes commas and $)
function parseNumber(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[,$]/g, '');
  return parseFloat(cleaned) || 0;
}

// Helper: Safely get element value (handles null/undefined)
function safeGetValue(id, defaultValue = '') {
  const element = document.getElementById(id);
  return element ? (element.value || defaultValue) : defaultValue;
}

// Helper: Safely get element text content (handles null/undefined)
function safeGetText(id, defaultValue = '') {
  const element = document.getElementById(id);
  return element ? (element.innerText || defaultValue) : defaultValue;
}

// Helper: Format number with commas
function formatNumber(n) {
  if (userPreferences.compactFormat) {
    return formatCompact(n);
  }
  return n.toLocaleString(undefined, {maximumFractionDigits:0});
}

// Helper: Format number in compact form (1.2M, 500K, etc.)
function formatCompact(n) {
  if (n >= 1000000) {
    return (n / 1000000).toFixed(1) + 'M';
  } else if (n >= 1000) {
    return (n / 1000).toFixed(0) + 'K';
  }
  return n.toFixed(0);
}

// Helper: Format currency with commas (handles negative numbers)
function fmt(n) {
  if (n < 0) {
    return "-$" + formatNumber(Math.abs(n));
  }
  return "$" + formatNumber(n);
}

// Helper: Calculate Deal Quality Score (0-100)
function calculateDealQualityScore(askingPrice, maxPrice, cocReturn, paybackPeriod) {
  let score = 0;
  
  // Component 1: Price Score (40 points)
  // Perfect score if asking <= max, lose points as asking exceeds max
  if (maxPrice > 0) {
    const priceRatio = askingPrice / maxPrice;
    if (priceRatio <= 1.0) {
      score += 40; // Perfect score if at or below max
    } else if (priceRatio <= 1.1) {
      score += 30; // 10% above max = 30 points
    } else if (priceRatio <= 1.2) {
      score += 20; // 20% above max = 20 points
    } else if (priceRatio <= 1.3) {
      score += 10; // 30% above max = 10 points
    }
    // else 0 points if >30% above max
  }
  
  // Component 2: Cash-on-Cash Return Score (35 points)
  // Compare to target COC
  const targetCOC = userPreferences.targetCOC;
  if (cocReturn >= targetCOC * 1.5) {
    score += 35; // 50% above target = perfect
  } else if (cocReturn >= targetCOC) {
    score += 30; // At or above target = great
  } else if (cocReturn >= targetCOC * 0.75) {
    score += 20; // 75% of target = okay
  } else if (cocReturn >= targetCOC * 0.5) {
    score += 10; // 50% of target = poor
  }
  // else 0 points if < 50% of target
  
  // Component 3: Payback Period Score (25 points)
  // Compare to target payback
  const targetPayback = userPreferences.targetPayback;
  if (paybackPeriod > 0 && paybackPeriod < 100) {
    if (paybackPeriod <= targetPayback * 0.75) {
      score += 25; // 25% faster than target = perfect
    } else if (paybackPeriod <= targetPayback) {
      score += 20; // At or better than target = great
    } else if (paybackPeriod <= targetPayback * 1.5) {
      score += 15; // Within 50% of target = okay
    } else if (paybackPeriod <= targetPayback * 2) {
      score += 5; // Within 2x target = poor
    }
  }
  // else 0 points if no valid payback
  
  return Math.round(score);
}

// Helper: Update Deal Quality Banner
function updateDealQualityBanner(score, askingPrice, maxPrice, cocReturn, paybackPeriod) {
  const badge = document.getElementById('da-quality-badge');
  const text = document.getElementById('da-quality-text');
  const scoreDisplay = document.getElementById('da-quality-score');
  const banner = document.getElementById('da-quality-banner');
  
  if (!badge || !text || !scoreDisplay || !banner) return;
  
  scoreDisplay.innerText = score;
  
  if (score >= 80) {
    badge.innerText = '🟢';
    text.innerText = 'Excellent Deal';
    text.style.color = '#27ae60';
    scoreDisplay.style.color = '#27ae60';
    banner.style.borderBottomColor = '#27ae60';
  } else if (score >= 60) {
    badge.innerText = '🟡';
    text.innerText = 'Good Deal';
    text.style.color = '#f39c12';
    scoreDisplay.style.color = '#f39c12';
    banner.style.borderBottomColor = '#f39c12';
  } else if (score >= 40) {
    badge.innerText = '🟠';
    text.innerText = 'Fair Deal';
    text.style.color = '#e67e22';
    scoreDisplay.style.color = '#e67e22';
    banner.style.borderBottomColor = '#e67e22';
  } else {
    badge.innerText = '🔴';
    text.innerText = 'Weak Deal';
    text.style.color = '#e74c3c';
    scoreDisplay.style.color = '#e74c3c';
    banner.style.borderBottomColor = '#e74c3c';
  }
}

// Track which fields have been manually overridden
const overrides = {
  sbaLoan: false,
  downPayment: false,
  sellerNote: false,
  actualPrice: false
};

// --- UPDATE FINANCING SUMMARIES ---
function updateFinancingSummaries() {
  // Update SBA summary
  const sbaPercent = parseFloat(document.getElementById('da-sba-percent').value) || 0;
  const bankRate = parseFloat(document.getElementById('da-bank-rate').value) || 0;
  const bankTerm = parseFloat(document.getElementById('da-bank-term').value) || 0;
  const dscr = parseFloat(document.getElementById('da-dscr').value) || 0;
  document.getElementById('da-sba-summary').innerText = `${sbaPercent}% • ${bankRate}% • ${bankTerm}yr • ${dscr}x DSCR`;
  
  // Update Buyer Equity summary
  const downPercent = parseFloat(document.getElementById('da-down-percent').value) || 0;
  const targetSalary = parseNumber(document.getElementById('da-target-salary').value) || 0;
  const salaryFormatted = targetSalary >= 1000 ? '$' + Math.round(targetSalary / 1000) + 'k' : '$' + targetSalary;
  document.getElementById('da-buyer-equity-summary').innerText = `${downPercent}% • ${salaryFormatted} salary`;
  
  // Update Seller Note summary
  const sellerNoteEnabled = document.getElementById('da-seller-note-enabled').checked;
  const sellerPercent = parseFloat(document.getElementById('da-seller-percent').value) || 0;
  const sellerRate = parseFloat(document.getElementById('da-seller-rate').value) || 0;
  const sellerPaymentType = document.getElementById('da-seller-payment-type').value;
  const sellerStandby = document.getElementById('da-seller-standby').value;
  
  if (sellerNoteEnabled) {
    let summary = `${sellerPercent}% • ${sellerRate}% • ${sellerPaymentType === 'interest-only' ? 'Interest Only' : 'Amortizing'}`;
    if (sellerStandby === 'yes') {
      summary += ' • Standby';
    }
    document.getElementById('da-seller-note-summary').innerText = summary;
    document.getElementById('da-seller-note-summary').style.opacity = '1';
  } else {
    document.getElementById('da-seller-note-summary').innerText = 'Not enabled';
    document.getElementById('da-seller-note-summary').style.opacity = '0.4';
  }
}

// --- 4. FINANCIAL MATH ---
function calculate() {
  // Update financing summaries first
  updateFinancingSummaries();
  
  // Get Inputs
  const ebitda = parseNumber(document.getElementById('da-ebitda').value) || 0;
  const targetDSCR = parseFloat(document.getElementById('da-dscr').value) || 1.25;
  const bankRate = (parseFloat(document.getElementById('da-bank-rate').value) || 0) / 100;
  const bankYears = parseFloat(document.getElementById('da-bank-term').value) || 10;
  
  // 1. Calculate Max Annual Debt Service the business can afford
  const maxAnnualDebtService = ebitda / targetDSCR;

  // 2. Get percentages
  const sbaPercent = parseFloat(document.getElementById('da-sba-percent').value) || 0;
  const downPercent = parseFloat(document.getElementById('da-down-percent').value) || 0;
  const sellerNoteEnabled = document.getElementById('da-seller-note-enabled').checked;
  const sellerPercent = sellerNoteEnabled ? (parseFloat(document.getElementById('da-seller-percent').value) || 0) : 0;
  
  // Validate that percentages total 100%
  const totalPercent = sbaPercent + downPercent + sellerPercent;
  const percentError = document.getElementById('da-percent-error');
  if (Math.abs(totalPercent - 100) > 0.01) {
    percentError.style.display = 'block';
    percentError.innerHTML = `⚠️ Total percentages must equal 100% (currently ${totalPercent.toFixed(1)}%)`;
  } else {
    percentError.style.display = 'none';
  }
  
  const sellerRate = (parseFloat(document.getElementById('da-seller-rate').value) || 0) / 100;
  const sellerPaymentType = document.getElementById('da-seller-payment-type').value;
  const sellerStandby = document.getElementById('da-seller-standby').value;
  
  // 3. Calculate Debt Service per $1 of Loan for each component
  // Using PMT formula: DS per $1 = -PMT(rate, periods, 1)
  
  // SBA Debt Service per $1
  let sbaDebtServicePer1 = 0;
  if (bankRate > 0 && bankYears > 0) {
    const r = bankRate / 12;
    const n = bankYears * 12;
    // Monthly payment per $1 of loan
    const monthlyPer1 = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    sbaDebtServicePer1 = monthlyPer1 * 12; // Annual
  } else if (bankYears > 0) {
    sbaDebtServicePer1 = 1 / bankYears;
  }
  
  // Seller Note Debt Service per $1 (if enabled)
  let sellerDebtServicePer1 = 0;
  if (sellerNoteEnabled && sellerPercent > 0) {
    if (sellerPaymentType === 'interest-only') {
      sellerDebtServicePer1 = sellerRate;
    } else {
      // Amortizing - assume 5 year term
      const sellerYears = 5;
      const r = sellerRate / 12;
      const n = sellerYears * 12;
      if (r === 0) {
        sellerDebtServicePer1 = 1 / sellerYears;
      } else {
        const monthlyPer1 = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        sellerDebtServicePer1 = monthlyPer1 * 12;
      }
    }
  }
  
  // 4. Calculate Total Debt Service per $1 of Purchase Price
  // Formula: (SBA % × DS per $1 of SBA) + (Seller % × DS per $1 of Seller)
  // NOTE: If seller note is on standby, exclude it from DSCR calculation per SBA lender treatment
  const sellerDebtServiceForDSCR = (sellerStandby === 'yes') ? 0 : sellerDebtServicePer1;
  const totalDebtServicePer1OfPrice = 
    (sbaPercent / 100) * sbaDebtServicePer1 + 
    (sellerPercent / 100) * sellerDebtServiceForDSCR;
  
  // 5. Calculate Max Purchase Price using DSCR methodology
  // Formula: Max Price = EBITDA ÷ (DSCR × Total DS per $1 of Price)
  // Simplified: Max Price = Max Annual Debt Service ÷ Total DS per $1 of Price
  let maxPurchasePrice = 0;
  if (totalDebtServicePer1OfPrice > 0) {
    maxPurchasePrice = maxAnnualDebtService / totalDebtServicePer1OfPrice;
  }
  
  // 5a. Determine Actual Purchase Price
  const askingPrice = parseNumber(document.getElementById('da-asking').value) || 0;
  let actualPurchasePrice;
  let isDealOpportunity = false;
  
  // Check if user has manually overridden the actual price
  if (overrides.actualPrice) {
    actualPurchasePrice = parseNumber(document.getElementById('da-actual-price').value) || maxPurchasePrice;
  } else {
    // Auto-calculate: use lower of asking or max
    if (askingPrice > 0 && askingPrice < maxPurchasePrice) {
      actualPurchasePrice = askingPrice;
      isDealOpportunity = true;
    } else {
      actualPurchasePrice = maxPurchasePrice;
    }
    // Update the field
    document.getElementById('da-actual-price').value = fmt(actualPurchasePrice);
  }
  
  // 6. Calculate component amounts from Actual Purchase Price and percentages
  let sbaLoanSize, downPayment, sellerNoteAmt;
  
  // When actual price is overridden, always recalculate components based on it
  const shouldRecalcComponents = overrides.actualPrice;
  
  if (!overrides.sbaLoan || shouldRecalcComponents) {
    sbaLoanSize = (sbaPercent / 100) * actualPurchasePrice;
    document.getElementById('da-sba-loan').value = fmt(sbaLoanSize);
  } else {
    sbaLoanSize = parseNumber(document.getElementById('da-sba-loan').value) || 0;
  }
  
  if (!overrides.downPayment || shouldRecalcComponents) {
    downPayment = (downPercent / 100) * actualPurchasePrice;
    document.getElementById('da-down').value = fmt(downPayment);
  } else {
    downPayment = parseNumber(document.getElementById('da-down').value) || 0;
  }
  
  if (sellerNoteEnabled) {
    if (!overrides.sellerNote || shouldRecalcComponents) {
      sellerNoteAmt = (sellerPercent / 100) * actualPurchasePrice;
      document.getElementById('da-seller-amt').value = fmt(sellerNoteAmt);
    } else {
      sellerNoteAmt = parseNumber(document.getElementById('da-seller-amt').value) || 0;
    }
  } else {
    sellerNoteAmt = 0;
  }

  // 7. Calculate SBA Annual Debt Service (actual payment based on loan size)
  let sbaAnnualDebtService = 0;
  if (sbaLoanSize > 0 && bankRate > 0) {
    const r = bankRate / 12;
    const n = bankYears * 12;
    const monthlyPayment = sbaLoanSize * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    sbaAnnualDebtService = monthlyPayment * 12;
  } else if (sbaLoanSize > 0) {
    sbaAnnualDebtService = sbaLoanSize / bankYears;
  }

  // 8. Calculate Seller Note Annual Debt Service (actual payment based on note amount)
  let sellerAnnualDebtService = 0;
  if (sellerNoteAmt > 0) {
    if (sellerPaymentType === 'interest-only') {
      sellerAnnualDebtService = sellerNoteAmt * sellerRate;
    } else {
      // Amortizing - assume 5 year term
      const sellerYears = 5;
      const r = sellerRate / 12;
      const n = sellerYears * 12;
      if (r === 0) {
        sellerAnnualDebtService = sellerNoteAmt / sellerYears;
      } else {
        const monthly = sellerNoteAmt * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        sellerAnnualDebtService = monthly * 12;
      }
    }
  }

  // 9. Total Debt Service (SBA + Seller Note, unless seller note is standby)
  const totalDebtService = sbaAnnualDebtService + (sellerStandby === 'yes' ? 0 : sellerAnnualDebtService);

  // 10. Get Target Salary first
  const targetSalary = parseNumber(document.getElementById('da-target-salary').value) || 0;
  
  // 11. Calculate Free Cash Flow AFTER salary
  // Available Cash Flow = EBITDA - Total Debt Service
  const availableCashFlow = ebitda - totalDebtService;
  
  // Free Cash Flow = Available Cash Flow - Target Salary (can be negative)
  const freeCashFlowAnnual = availableCashFlow - targetSalary;
  const freeCashFlowMonthly = freeCashFlowAnnual / 12;
  
  // Validate that target salary doesn't exceed available cash flow
  const salaryWarning = document.getElementById('da-salary-warning');
  if (targetSalary > availableCashFlow && availableCashFlow > 0) {
    salaryWarning.style.display = 'block';
    salaryWarning.innerHTML = `⚠️ Warning: Target salary ($${formatNumber(targetSalary)}) exceeds available cash flow ($${formatNumber(availableCashFlow)})!`;
  } else {
    salaryWarning.style.display = 'none';
  }
  
  // Total Owner Take-Home = Salary + Remaining Free Cash Flow (can show cash shortfall if negative)
  const totalOwnerTakeHome = targetSalary + freeCashFlowAnnual;

  // 12. Calculate ROI Metrics
  const totalEquityInvested = downPayment;
  
  // Cash-on-Cash Return = Total Owner Take-Home / Total Equity Invested
  // This includes both salary and free cash flow as return on investment
  let cashOnCashReturn = 0;
  if (totalEquityInvested > 0) {
    cashOnCashReturn = (totalOwnerTakeHome / totalEquityInvested) * 100;
  }
  
  // Payback Period = Total Equity Invested / Total Owner Take-Home
  // How long to recover the initial equity investment
  let paybackPeriod = 0;
  if (totalOwnerTakeHome > 0) {
    paybackPeriod = totalEquityInvested / totalOwnerTakeHome;
  }

  // Debug logging
  console.log('=== DSCR Calculation Debug ===');
  console.log('EBITDA:', fmt(ebitda));
  console.log('Target DSCR:', targetDSCR);
  console.log('Max Annual Debt Service:', fmt(maxAnnualDebtService));
  console.log('SBA DS per $1:', sbaDebtServicePer1.toFixed(6));
  console.log('Seller DS per $1:', sellerDebtServicePer1.toFixed(6));
  console.log('Seller Note Standby:', sellerStandby);
  console.log('Seller DS per $1 (for DSCR):', sellerDebtServiceForDSCR.toFixed(6));
  console.log('Total DS per $1 of Price:', totalDebtServicePer1OfPrice.toFixed(6));
  console.log('Max Purchase Price:', fmt(maxPurchasePrice));
  console.log('Asking Price:', fmt(askingPrice));
  console.log('Actual Purchase Price:', fmt(actualPurchasePrice));
  console.log('Deal Opportunity:', isDealOpportunity);
  console.log('SBA Loan Size:', fmt(sbaLoanSize));
  console.log('Down Payment:', fmt(downPayment));
  console.log('Seller Note:', fmt(sellerNoteAmt));
  console.log('SBA Annual Debt Service:', fmt(sbaAnnualDebtService));
  console.log('Seller Annual Debt Service:', fmt(sellerAnnualDebtService));
  console.log('Total Debt Service:', fmt(totalDebtService));
  console.log('Available Cash Flow (EBITDA - Debt):', fmt(availableCashFlow));
  console.log('Target Salary:', fmt(targetSalary));
  console.log('Free Cash Flow AFTER Salary:', fmt(freeCashFlowAnnual));
  console.log('Free Cash Flow Monthly:', fmt(freeCashFlowMonthly));
  console.log('Total Owner Take-Home:', fmt(totalOwnerTakeHome));
  console.log('=== ROI Metrics ===');
  console.log('Total Equity Invested:', fmt(totalEquityInvested));
  console.log('Total Owner Take-Home (Year 1):', fmt(totalOwnerTakeHome));
  console.log('Cash-on-Cash Return:', cashOnCashReturn.toFixed(2) + '%');
  console.log('Payback Period:', paybackPeriod.toFixed(2) + ' years');

  // Display Deal Opportunity Banner
  const dealOpportunityDiv = document.getElementById('da-deal-opportunity');
  const dealSavingsSpan = document.getElementById('da-deal-savings');
  if (isDealOpportunity && dealOpportunityDiv && dealSavingsSpan) {
    const savings = maxPurchasePrice - askingPrice;
    dealOpportunityDiv.style.display = 'block';
    dealSavingsSpan.innerText = `Asking price is ${fmt(savings)} below your max allowable price!`;
  } else if (dealOpportunityDiv) {
    dealOpportunityDiv.style.display = 'none';
  }

  // Display Results
  const maxPriceEl = document.getElementById('da-max-price');
  const maxDebtEl = document.getElementById('da-max-debt');
  const totalDebtEl = document.getElementById('da-total-debt');
  const fcfAnnualEl = document.getElementById('da-fcf-annual');
  const fcfMonthlyEl = document.getElementById('da-fcf-monthly');
  const ownerSalaryEl = document.getElementById('da-owner-salary');
  const maxAvailableEl = document.getElementById('da-max-available');
  
  if (maxPriceEl) maxPriceEl.innerText = fmt(maxPurchasePrice);
  if (maxDebtEl) maxDebtEl.innerText = fmt(maxAnnualDebtService);
  if (totalDebtEl) totalDebtEl.innerText = fmt(totalDebtService);
  
  // Free Cash Flow - color red if negative
  if (fcfAnnualEl) {
    fcfAnnualEl.innerText = fmt(freeCashFlowAnnual);
    fcfAnnualEl.style.color = freeCashFlowAnnual < 0 ? '#e74c3c' : '#2c3e50';
  }
  if (fcfMonthlyEl) {
    fcfMonthlyEl.innerText = fmt(freeCashFlowMonthly);
    fcfMonthlyEl.style.color = freeCashFlowMonthly < 0 ? '#e74c3c' : '#666';
  }
  
  // Total Owner Take-Home - color red if negative
  if (ownerSalaryEl) {
    ownerSalaryEl.innerText = fmt(totalOwnerTakeHome);
    ownerSalaryEl.style.color = totalOwnerTakeHome < 0 ? '#e74c3c' : '#2c3e50';
  }
  
  if (maxAvailableEl) maxAvailableEl.innerText = fmt(availableCashFlow);
  
  // Display ROI Metrics
  const cocElement = document.getElementById('da-coc-return');
  if (cocElement) {
    cocElement.innerText = cashOnCashReturn.toFixed(1) + '%';
    // Color code based on return quality
    if (cashOnCashReturn >= 100) {
      cocElement.style.color = '#27ae60'; // Green for excellent (100%+)
    } else if (cashOnCashReturn >= 50) {
      cocElement.style.color = '#16a085'; // Teal for good (50%+)
    } else if (cashOnCashReturn >= 25) {
      cocElement.style.color = '#f39c12'; // Orange for okay (25%+)
    } else {
      cocElement.style.color = '#e74c3c'; // Red for poor (<25%)
    }
  }
  
  const paybackEl = document.getElementById('da-payback');
  if (paybackEl) {
    paybackEl.innerText = paybackPeriod > 0 && paybackPeriod < 100 
      ? paybackPeriod.toFixed(1) + ' yrs' 
      : (paybackPeriod >= 100 ? '∞' : 'N/A');
  }

  // Calculate and Update Deal Quality Score
  const dealScore = calculateDealQualityScore(
    askingPrice || actualPurchasePrice, 
    maxPurchasePrice, 
    cashOnCashReturn, 
    paybackPeriod
  );
  updateDealQualityBanner(
    dealScore, 
    askingPrice || actualPurchasePrice, 
    maxPurchasePrice, 
    cashOnCashReturn, 
    paybackPeriod
  );

  saveState();
}

// Check if input field should have $ prefix
function isCurrencyField(id) {
  const currencyFields = ['da-ebitda', 'da-asking', 'da-target-salary', 'da-actual-price', 'da-sba-loan', 'da-down', 'da-seller-amt'];
  return currencyFields.includes(id);
}

// Make readonly field editable when clicked
function makeEditable(fieldId, overrideKey) {
  const field = document.getElementById(fieldId);
  if (field && field.hasAttribute('readonly')) {
    field.removeAttribute('readonly');
    overrides[overrideKey] = true;
    field.focus();
    // Select all text for easy replacement
    field.select();
  }
}

// Format input on blur (add commas and $ for currency fields)
function formatInputOnBlur(e) {
  const val = parseNumber(e.target.value);
  if (val > 0) {
    const formatted = formatNumber(val);
    if (isCurrencyField(e.target.id)) {
      e.target.value = '$' + formatted;
    } else {
      e.target.value = formatted;
    }
  } else if (e.target.value === '' || e.target.value === '0') {
    e.target.value = '';
  }
}

// Remove commas and $ on focus for easier editing
function unformatInputOnFocus(e) {
  e.target.value = e.target.value.replace(/[,$]/g, '');
}

// --- TARGET OFFER CALCULATOR ---
function calculateTargetOffer() {
  console.log('=== TARGET OFFER CALCULATOR ===');
  
  // Get all inputs
  const ebitda = parseNumber(document.getElementById('da-ebitda').value) || 0;
  const targetSalary = parseNumber(document.getElementById('da-target-salary').value) || 0;
  const askingPrice = parseNumber(document.getElementById('da-asking').value) || 0;
  
  // Get target metrics from user preferences
  const targetCOC = userPreferences.targetCOC || 25; // %
  const targetPaybackYears = userPreferences.targetPayback || 4; // years
  
  // Get financing structure
  const sbaPercent = parseFloat(document.getElementById('da-sba-percent').value) || 0;
  const downPercent = parseFloat(document.getElementById('da-down-percent').value) || 0;
  const sellerNoteEnabled = document.getElementById('da-seller-note-enabled').checked;
  const sellerPercent = sellerNoteEnabled ? (parseFloat(document.getElementById('da-seller-percent').value) || 0) : 0;
  
  const bankRate = (parseFloat(document.getElementById('da-bank-rate').value) || 0) / 100;
  const bankYears = parseFloat(document.getElementById('da-bank-term').value) || 10;
  const targetDSCR = parseFloat(document.getElementById('da-dscr').value) || 1.25;
  
  const sellerRate = (parseFloat(document.getElementById('da-seller-rate').value) || 0) / 100;
  const sellerPaymentType = document.getElementById('da-seller-payment-type').value;
  const sellerStandby = document.getElementById('da-seller-standby').value;
  
  // Validate inputs
  if (ebitda <= 0) {
    alert('Please enter a valid EBITDA value first.');
    return;
  }
  
  if (Math.abs((sbaPercent + downPercent + sellerPercent) - 100) > 0.01) {
    alert('Total financing percentages must equal 100% before calculating target offer.');
    return;
  }
  
  // Update display with current targets
  document.getElementById('da-target-coc-display').innerText = targetCOC;
  document.getElementById('da-target-payback-display').innerText = targetPaybackYears;
  document.getElementById('da-target-coc-result').innerText = targetCOC;
  document.getElementById('da-target-payback-result').innerText = targetPaybackYears;
  
  // CALCULATION STRATEGY:
  // COC = Total Take-Home / Equity Investment
  // Total Take-Home = EBITDA - Debt Service (all available cash)
  // Equity Investment = downPercent% * P
  // 
  // targetCOC/100 = (EBITDA - P * debtServicePer1) / (downPercent/100 * P)
  // Solving for P:
  // P = EBITDA / (targetCOC/100 * downPercent/100 + debtServicePer1)
  
  // Calculate debt service coefficients (DS per $1 of price)
  let sbaDebtServicePer1 = 0;
  if (bankRate > 0 && bankYears > 0) {
    const r = bankRate / 12;
    const n = bankYears * 12;
    const monthlyPer1 = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    sbaDebtServicePer1 = monthlyPer1 * 12;
  } else if (bankYears > 0) {
    sbaDebtServicePer1 = 1 / bankYears;
  }
  
  let sellerDebtServicePer1 = 0;
  if (sellerNoteEnabled && sellerPercent > 0) {
    if (sellerPaymentType === 'interest-only') {
      sellerDebtServicePer1 = sellerRate;
    } else {
      const sellerYears = 5;
      const r = sellerRate / 12;
      const n = sellerYears * 12;
      if (r === 0) {
        sellerDebtServicePer1 = 1 / sellerYears;
      } else {
        const monthlyPer1 = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        sellerDebtServicePer1 = monthlyPer1 * 12;
      }
    }
  }
  
  // Adjust for standby
  const sellerDebtServiceForCalc = (sellerStandby === 'yes') ? 0 : sellerDebtServicePer1;
  
  // Total debt service per $1 of price
  const totalDebtServicePer1 = 
    (sbaPercent / 100) * sbaDebtServicePer1 + 
    (sellerPercent / 100) * sellerDebtServiceForCalc;
  
  console.log('SBA DS per $1:', sbaDebtServicePer1);
  console.log('Seller DS per $1:', sellerDebtServicePer1);
  console.log('Total DS per $1:', totalDebtServicePer1);
  
  // Solve for price P
  const E = ebitda;
  const d = downPercent / 100;
  const ds = totalDebtServicePer1;
  const c = targetCOC / 100;
  
  if (E <= 0) {
    alert('EBITDA must be greater than 0 to calculate target offer.');
    return;
  }
  
  if (d <= 0) {
    alert('Equity percentage must be greater than 0 to calculate target offer.');
    return;
  }
  
  const denominator = (c * d + ds);
  
  if (denominator <= 0) {
    alert('Unable to calculate target offer with current financing structure. Try adjusting your financing mix.');
    return;
  }
  
  const targetOfferPrice = E / denominator;
  
  console.log('E (EBITDA):', E);
  console.log('d (equity %):', d);
  console.log('ds (total debt service per $1):', ds);
  console.log('c (target COC):', c);
  console.log('Denominator:', denominator);
  console.log('TARGET OFFER PRICE:', targetOfferPrice);
  
  // Validate result
  if (targetOfferPrice <= 0 || !isFinite(targetOfferPrice)) {
    alert('Unable to calculate a valid target offer price. Please check your inputs and financing structure.');
    return;
  }
  
  // Calculate actual metrics at this price
  const equity = targetOfferPrice * d;
  const sbaLoan = targetOfferPrice * (sbaPercent / 100);
  const sellerNote = targetOfferPrice * (sellerPercent / 100);
  
  const totalDebtService = targetOfferPrice * totalDebtServicePer1;
  const freeCashFlow = ebitda - totalDebtService - targetSalary;
  const totalTakeHome = ebitda - totalDebtService;
  
  const actualCOC = (totalTakeHome / equity) * 100;
  const actualPayback = equity / totalTakeHome;
  
  console.log('At target price:');
  console.log('  Equity:', equity);
  console.log('  SBA Loan:', sbaLoan);
  console.log('  Seller Note:', sellerNote);
  console.log('  Total Debt Service:', totalDebtService);
  console.log('  Free Cash Flow (after salary):', freeCashFlow);
  console.log('  Total Take-Home:', totalTakeHome);
  console.log('  Actual COC:', actualCOC);
  console.log('  Actual Payback:', actualPayback);
  
  // Display results
  document.getElementById('da-target-offer-price').innerText = fmt(targetOfferPrice);
  document.getElementById('da-target-fcf').innerText = fmt(freeCashFlow);
  document.getElementById('da-target-takehome').innerText = fmt(totalTakeHome);
  
  // Compare to asking price
  if (askingPrice > 0) {
    const diff = targetOfferPrice - askingPrice;
    const diffPercent = (diff / askingPrice) * 100;
    
    document.getElementById('da-target-diff-amount').innerText = fmt(Math.abs(diff));
    document.getElementById('da-target-diff-percent').innerText = Math.abs(diffPercent).toFixed(1) + '%';
    
    const comparisonDiv = document.getElementById('da-target-comparison');
    if (diff < 0) {
      // Target is below asking - good!
      comparisonDiv.style.background = '#d4edda';
      comparisonDiv.style.border = '1px solid #28a745';
      document.getElementById('da-target-diff-amount').style.color = '#e74c3c';
      document.getElementById('da-target-diff-amount').innerText = '-' + fmt(Math.abs(diff)) + ' (below asking)';
    } else {
      // Target is above asking - acceptable
      comparisonDiv.style.background = '#fff3cd';
      comparisonDiv.style.border = '1px solid #ffc107';
      document.getElementById('da-target-diff-amount').style.color = '#27ae60';
      document.getElementById('da-target-diff-amount').innerText = '+' + fmt(diff) + ' (above asking)';
    }
  } else {
    document.getElementById('da-target-diff-amount').innerText = 'N/A (no asking price)';
    document.getElementById('da-target-diff-percent').innerText = 'N/A';
  }
  
  // Display financing breakdown
  let breakdownHTML = `
    • SBA Loan (${sbaPercent}%): ${fmt(sbaLoan)}<br>
    • Buyer Equity (${downPercent}%): ${fmt(equity)}<br>
  `;
  if (sellerNoteEnabled) {
    breakdownHTML += `• Seller Note (${sellerPercent}%): ${fmt(sellerNote)} `;
    breakdownHTML += `[${sellerPaymentType}, ${(sellerRate * 100).toFixed(1)}%${sellerStandby === 'yes' ? ', standby' : ''}]<br>`;
  }
  breakdownHTML += `• Target DSCR: ${targetDSCR}x<br>`;
  breakdownHTML += `• Target Owner Salary: ${fmt(targetSalary)}`;
  
  document.getElementById('da-target-financing-breakdown').innerHTML = breakdownHTML;
  
  // Show results section
  document.getElementById('da-target-offer-results').style.display = 'block';
  
  // Store the calculated target offer price for use later
  window.calculatedTargetOffer = targetOfferPrice;
}

// Event listener for Calculate Target Offer button
const calculateTargetOfferBtn = document.getElementById('da-calculate-target-offer-btn');
if (calculateTargetOfferBtn) {
  calculateTargetOfferBtn.addEventListener('click', calculateTargetOffer);
}

// Event listener for Use Target Offer button
const useTargetOfferBtn = document.getElementById('da-use-target-offer-btn');
if (useTargetOfferBtn) {
  useTargetOfferBtn.addEventListener('click', () => {
    if (window.calculatedTargetOffer) {
      // Set the actual price field to the calculated target offer
      const actualPriceField = document.getElementById('da-actual-price');
      actualPriceField.value = fmt(window.calculatedTargetOffer);
      
      // Mark as overridden so it doesn't auto-recalculate
      overrides.actualPrice = true;
      actualPriceField.removeAttribute('readonly');
      
      // Recalculate everything with this new price
      calculate();
      
      // Visual feedback
      useTargetOfferBtn.innerHTML = '✓ Applied!';
      setTimeout(() => {
        useTargetOfferBtn.innerHTML = '✓ Use This as Actual Price';
      }, 2000);
    }
  });
}

// --- 5. SAVE SETTINGS ---
function saveState() {
    const state = {
        targetSalary: document.getElementById('da-target-salary').value,
        actualPrice: document.getElementById('da-actual-price').value,
        sbaPercent: document.getElementById('da-sba-percent').value,
        sbaLoan: document.getElementById('da-sba-loan').value,
        bankRate: document.getElementById('da-bank-rate').value,
        bankTerm: document.getElementById('da-bank-term').value,
        downPercent: document.getElementById('da-down-percent').value,
        down: document.getElementById('da-down').value,
        sellerNoteEnabled: document.getElementById('da-seller-note-enabled').checked,
        sellerPercent: document.getElementById('da-seller-percent').value,
        sellerAmt: document.getElementById('da-seller-amt').value,
        sellerRate: document.getElementById('da-seller-rate').value,
        sellerStandby: document.getElementById('da-seller-standby').value,
        sellerPaymentType: document.getElementById('da-seller-payment-type').value,
        dscr: document.getElementById('da-dscr').value,
        dealName: document.getElementById('da-deal-name').value,
        dealNotes: document.getElementById('da-deal-notes').value,
        overrides: overrides
    };
    chrome.storage.local.set({daState: state});
}

function loadState() {
    chrome.storage.local.get(['daState'], function(result) {
        if (result.daState) {
            const state = result.daState;
            
            // Restore overrides
            if (state.overrides) {
                Object.assign(overrides, state.overrides);
            }
            
            // Target Salary
            document.getElementById('da-target-salary').value = state.targetSalary || '150000';
            
            // Actual Price
            const actualPriceVal = state.actualPrice ? parseNumber(state.actualPrice) : 0;
            const actualPriceField = document.getElementById('da-actual-price');
            if (overrides.actualPrice && actualPriceVal > 0) {
                actualPriceField.value = '$' + formatNumber(actualPriceVal);
                actualPriceField.removeAttribute('readonly');
            } else {
                actualPriceField.setAttribute('readonly', 'readonly');
            }
            
            // SBA
            document.getElementById('da-sba-percent').value = state.sbaPercent || 80;
            const sbaLoanVal = state.sbaLoan ? parseNumber(state.sbaLoan) : 0;
            const sbaLoanField = document.getElementById('da-sba-loan');
            if (overrides.sbaLoan && sbaLoanVal > 0) {
                sbaLoanField.value = '$' + formatNumber(sbaLoanVal);
                sbaLoanField.removeAttribute('readonly');
            } else {
                sbaLoanField.setAttribute('readonly', 'readonly');
            }
            
            document.getElementById('da-bank-rate').value = state.bankRate || 11.5;
            document.getElementById('da-bank-term').value = state.bankTerm || 10;
            
            // Buyer Equity
            document.getElementById('da-down-percent').value = state.downPercent || 10;
            const downVal = state.down ? parseNumber(state.down) : 0;
            const downField = document.getElementById('da-down');
            if (overrides.downPayment && downVal > 0) {
                downField.value = '$' + formatNumber(downVal);
                downField.removeAttribute('readonly');
            } else {
                downField.setAttribute('readonly', 'readonly');
            }
            
            // Seller Note
            const sellerNoteEnabled = state.sellerNoteEnabled || false;
            document.getElementById('da-seller-note-enabled').checked = sellerNoteEnabled;
            document.getElementById('da-seller-note-section').style.display = sellerNoteEnabled ? 'block' : 'none';
            document.getElementById('da-seller-percent').value = state.sellerPercent || 10;
            const sellerAmtVal = state.sellerAmt ? parseNumber(state.sellerAmt) : 0;
            const sellerAmtField = document.getElementById('da-seller-amt');
            if (overrides.sellerNote && sellerAmtVal > 0) {
                sellerAmtField.value = '$' + formatNumber(sellerAmtVal);
                sellerAmtField.removeAttribute('readonly');
            } else {
                sellerAmtField.setAttribute('readonly', 'readonly');
            }
            
            document.getElementById('da-seller-rate').value = state.sellerRate || 6.0;
            document.getElementById('da-seller-standby').value = state.sellerStandby || 'no';
            document.getElementById('da-seller-payment-type').value = state.sellerPaymentType || 'amortizing';
            document.getElementById('da-dscr').value = state.dscr || 1.25;
            
            // Deal Name & Notes
            document.getElementById('da-deal-name').value = state.dealName || '';
            document.getElementById('da-deal-notes').value = state.dealNotes || '';
        }
        scrapeData();
    });
}

// Set up event listeners
try {
  document.querySelectorAll('input, select').forEach(el => {
    // Skip SBA percent - it has its own handler to reset overrides first
    if (el.id !== 'da-sba-percent') {
      el.addEventListener('input', calculate);
    }
    if (el.type === 'text') {
      el.addEventListener('blur', formatInputOnBlur);
      el.addEventListener('focus', unformatInputOnFocus);
    }
  });
} catch (error) {
  console.error('Error setting up input event listeners:', error);
}

// Make auto-calculated fields editable on click
const actualPriceField = document.getElementById('da-actual-price');
if (actualPriceField) {
  actualPriceField.addEventListener('click', () => {
    makeEditable('da-actual-price', 'actualPrice');
  });
}

const sbaLoanField = document.getElementById('da-sba-loan');
if (sbaLoanField) {
  sbaLoanField.addEventListener('click', () => {
    makeEditable('da-sba-loan', 'sbaLoan');
  });
}

const downField = document.getElementById('da-down');
if (downField) {
  downField.addEventListener('click', () => {
    makeEditable('da-down', 'downPayment');
  });
}

const sellerAmtField = document.getElementById('da-seller-amt');
if (sellerAmtField) {
  sellerAmtField.addEventListener('click', () => {
    makeEditable('da-seller-amt', 'sellerNote');
  });
}

// Seller note checkbox - enables/disables the seller note
const sellerNoteCheckbox = document.getElementById('da-seller-note-enabled');
if (sellerNoteCheckbox) {
  sellerNoteCheckbox.addEventListener('change', (e) => {
    const sellerAmtField = document.getElementById('da-seller-amt');
    if (!e.target.checked && sellerAmtField) {
      sellerAmtField.value = '';
      overrides.sellerNote = false;
    }
    calculate();
  });
}

// Seller note arrow - collapses/expands the section
let sellerNoteCollapsed = false;
const sellerNoteArrow = document.getElementById('da-seller-note-arrow');
const sellerNoteSection = document.getElementById('da-seller-note-section');

if (sellerNoteArrow && sellerNoteSection && sellerNoteCheckbox) {
  sellerNoteArrow.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering checkbox
    
    // Only allow collapse/expand if checkbox is checked
    if (!sellerNoteCheckbox.checked) {
      return;
    }
    
    sellerNoteCollapsed = !sellerNoteCollapsed;
    if (sellerNoteCollapsed) {
      sellerNoteSection.style.display = 'none';
      sellerNoteArrow.style.transform = 'rotate(-90deg)';
    } else {
      sellerNoteSection.style.display = 'block';
      sellerNoteArrow.style.transform = 'rotate(0deg)';
    }
    
    // Save state
    chrome.storage.local.set({ sellerNoteCollapsed: sellerNoteCollapsed });
  });
}

// When checkbox is checked, show section and reset arrow
if (sellerNoteCheckbox && sellerNoteSection && sellerNoteArrow) {
  sellerNoteCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      sellerNoteSection.style.display = 'block';
      sellerNoteArrow.style.transform = 'rotate(0deg)';
      sellerNoteCollapsed = false;
    } else {
      sellerNoteSection.style.display = 'none';
      sellerNoteArrow.style.transform = 'rotate(-90deg)';
    }
  });
}

// Restore seller note collapsed state
if (sellerNoteCheckbox && sellerNoteSection && sellerNoteArrow) {
  chrome.storage.local.get(['sellerNoteCollapsed'], (result) => {
    if (result.sellerNoteCollapsed && sellerNoteCheckbox.checked) {
      sellerNoteCollapsed = true;
      sellerNoteSection.style.display = 'none';
      sellerNoteArrow.style.transform = 'rotate(-90deg)';
    }
  });
}

// Reset overrides when key inputs change
const askingField = document.getElementById('da-asking');
if (askingField) {
  askingField.addEventListener('input', () => {
    // When asking price changes, reset actual price override
    overrides.actualPrice = false;
    const actualPriceField = document.getElementById('da-actual-price');
    if (actualPriceField) {
      actualPriceField.setAttribute('readonly', 'readonly');
    }
    calculate();
  });
}

const sbaPercentField = document.getElementById('da-sba-percent');
if (sbaPercentField) {
  sbaPercentField.addEventListener('input', () => {
    // When SBA % changes, reset the loan size override so it recalculates
    overrides.sbaLoan = false;
    const sbaLoanField = document.getElementById('da-sba-loan');
    if (sbaLoanField) {
      sbaLoanField.setAttribute('readonly', 'readonly');
    }
    calculate();
  });
}

const downPercentField = document.getElementById('da-down-percent');
if (downPercentField) {
  downPercentField.addEventListener('input', () => {
    if (!overrides.downPayment) {
      calculate();
    }
  });
}

const sellerPercentField = document.getElementById('da-seller-percent');
if (sellerPercentField) {
  sellerPercentField.addEventListener('input', () => {
    if (!overrides.sellerNote) {
      calculate();
    }
  });
}

// Contact Me button - opens email (only if element exists)
const contactBtn = document.getElementById('da-contact-btn');
if (contactBtn) {
  contactBtn.addEventListener('click', () => {
    const subject = encodeURIComponent('Deal Analyzer - Ideas, Bug Reports, Suggestions, Issues, Praise');
    window.open(`mailto:jamiemetzger@gmail.com?subject=${subject}`, '_blank');
  });
}

// --- 6. COLLAPSIBLE SECTIONS ---
// Helper function to create collapsible section
function setupCollapsible(headerId, contentId, arrowId, storageKey) {
  const header = document.getElementById(headerId);
  const content = document.getElementById(contentId);
  const arrow = document.getElementById(arrowId);
  let collapsed = false;

  header.addEventListener('click', () => {
    collapsed = !collapsed;
    if (collapsed) {
      content.style.display = 'none';
      arrow.style.transform = 'rotate(-90deg)';
    } else {
      content.style.display = 'block';
      arrow.style.transform = 'rotate(0deg)';
    }
    // Save state
    const saveObj = {};
    saveObj[storageKey] = collapsed;
    chrome.storage.local.set(saveObj);
  });

  // Restore collapsed state
  chrome.storage.local.get([storageKey], (result) => {
    if (result[storageKey]) {
      collapsed = true;
      content.style.display = 'none';
      arrow.style.transform = 'rotate(-90deg)';
    }
  });
}

// Setup all collapsible sections
setupCollapsible('da-max-header', 'da-max-content', 'da-max-arrow', 'maxCollapsed');
setupCollapsible('da-roi-header', 'da-roi-content', 'da-roi-arrow', 'roiCollapsed');
setupCollapsible('da-target-offer-header', 'da-target-offer-content', 'da-target-offer-arrow', 'targetOfferCollapsed');
setupCollapsible('da-actual-header', 'da-actual-content', 'da-actual-arrow', 'actualCollapsed');
setupCollapsible('da-sba-header', 'da-sba-section', 'da-sba-arrow', 'sbaCollapsed');
setupCollapsible('da-buyer-equity-header', 'da-buyer-equity-section', 'da-buyer-equity-arrow', 'buyerEquityCollapsed');

// --- 7. SHARE FUNCTIONALITY ---
const shareModal = document.getElementById('da-share-modal');
const shareBtn = document.getElementById('da-share-btn');
const shareClose = document.getElementById('da-share-close');

// Open share modal
if (shareBtn && shareModal) {
  shareBtn.addEventListener('click', () => {
    shareModal.style.display = 'flex';
  });
}

// Close share modal
if (shareClose && shareModal) {
  shareClose.addEventListener('click', () => {
    shareModal.style.display = 'none';
  });
}

// Close modal when clicking outside
if (shareModal) {
  shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) {
      shareModal.style.display = 'none';
    }
  });
}

// --- 8. SETTINGS FUNCTIONALITY ---
const settingsModal = document.getElementById('da-settings-modal');
const settingsBtn = document.getElementById('da-settings-btn');
const settingsClose = document.getElementById('da-settings-close');
const settingsSave = document.getElementById('da-settings-save');
const settingsReset = document.getElementById('da-settings-reset');

// Open settings modal
if (settingsBtn && settingsModal) {
  settingsBtn.addEventListener('click', () => {
    // Load current preferences into modal fields
    const targetCocField = document.getElementById('da-target-coc');
    const targetPaybackField = document.getElementById('da-target-payback');
    const formatCompactField = document.getElementById('da-format-compact');
    
    // Ensure preferences are loaded (in case page just loaded)
    chrome.storage.local.get(['userPreferences'], (result) => {
      if (result.userPreferences) {
        userPreferences = result.userPreferences;
      }
      
      // Set field values from preferences
      if (targetCocField) targetCocField.value = userPreferences.targetCOC;
      if (targetPaybackField) targetPaybackField.value = userPreferences.targetPayback;
      if (formatCompactField) formatCompactField.checked = userPreferences.compactFormat;
      
      settingsModal.style.display = 'flex';
    });
  });
}

// Close settings modal
if (settingsClose && settingsModal) {
  settingsClose.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
}

// Close modal when clicking outside
if (settingsModal) {
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });
}

// Save settings
if (settingsSave && settingsModal) {
  settingsSave.addEventListener('click', () => {
    // Update preferences
    const targetCocField = document.getElementById('da-target-coc');
    const targetPaybackField = document.getElementById('da-target-payback');
    const formatCompactField = document.getElementById('da-format-compact');
    
    // Validate and parse values
    const newTargetCOC = targetCocField ? (parseFloat(targetCocField.value) || 25) : 25;
    const newTargetPayback = targetPaybackField ? (parseFloat(targetPaybackField.value) || 4) : 4;
    const newCompactFormat = formatCompactField ? formatCompactField.checked : false;
    
    // Update preferences object
    userPreferences.targetCOC = newTargetCOC;
    userPreferences.targetPayback = newTargetPayback;
    userPreferences.compactFormat = newCompactFormat;
    
    // Save to chrome storage (persistent)
    chrome.storage.local.set({ userPreferences: userPreferences }, () => {
      console.log('✅ Settings saved successfully:', userPreferences);
      
      // Verify save by reading back
      chrome.storage.local.get(['userPreferences'], (result) => {
        console.log('✅ Verified saved settings:', result.userPreferences);
      });
    });
    
    // Recalculate with new targets immediately
    calculate();
    
    // Close modal with success feedback
    const saveBtn = document.getElementById('da-settings-save');
    if (saveBtn) {
      const originalText = saveBtn.innerHTML;
      const originalBg = saveBtn.style.background;
      saveBtn.innerHTML = '✅ Saved!';
      saveBtn.style.background = '#27ae60';
      setTimeout(() => {
        settingsModal.style.display = 'none';
        saveBtn.innerHTML = originalText;
        saveBtn.style.background = originalBg || '#27ae60';
      }, 1000);
    } else {
      // If button not found, just close modal
      settingsModal.style.display = 'none';
    }
  });
}

// Reset to defaults
if (settingsReset) {
  settingsReset.addEventListener('click', () => {
    const targetCocField = document.getElementById('da-target-coc');
    const targetPaybackField = document.getElementById('da-target-payback');
    const formatCompactField = document.getElementById('da-format-compact');
    
    if (targetCocField) targetCocField.value = 25;
    if (targetPaybackField) targetPaybackField.value = 4;
    if (formatCompactField) formatCompactField.checked = false;
  });
}

// Load user preferences on startup
function loadUserPreferences() {
  chrome.storage.local.get(['userPreferences'], (result) => {
    if (result.userPreferences) {
      userPreferences = result.userPreferences;
      console.log('Loaded preferences:', userPreferences);
      
      // Apply preferences immediately after loading
      // This ensures the UI is updated with saved preferences
      calculate(); // Recalculate with loaded preferences
    }
  });
}

// --- DEBUG/DIAGNOSTICS MODAL HANDLERS ---

// Global variable to store last scrape results for diagnostics
let lastScrapeData = {
  platform: 'unknown',
  askingPrice: 0,
  ebitda: 0,
  isSDE: false,
  timestamp: null
};

const debugModal = document.getElementById('da-debug-modal');
const debugBtn = document.getElementById('da-debug-btn');
const debugClose = document.getElementById('da-debug-close');
const debugDone = document.getElementById('da-debug-done');
const debugRescrape = document.getElementById('da-debug-rescrape');
const debugConsole = document.getElementById('da-debug-console');

// Update debug modal with scrape data
function updateDebugModal() {
  const debugUrl = document.getElementById('da-debug-url');
  const debugPlatform = document.getElementById('da-debug-platform');
  const debugStatus = document.getElementById('da-debug-status');
  const debugPrice = document.getElementById('da-debug-price');
  const debugEbitda = document.getElementById('da-debug-ebitda');
  
  if (debugUrl) debugUrl.innerText = window.location.href;
  if (debugPlatform) {
    debugPlatform.innerText = lastScrapeData.platform || 'generic';
    debugPlatform.style.color = lastScrapeData.platform !== 'generic' ? '#27ae60' : '#3498db';
  }
  
  const hasData = lastScrapeData.askingPrice > 0 || lastScrapeData.ebitda > 0;
  if (debugStatus) {
    debugStatus.innerText = hasData ? '✅ Data Found' : '⚠️ No Data Found';
    debugStatus.style.color = hasData ? '#27ae60' : '#e67e22';
  }
  
  if (debugPrice) {
    if (lastScrapeData.askingPrice > 0) {
      debugPrice.innerText = '$' + formatNumber(lastScrapeData.askingPrice);
      debugPrice.style.color = '#27ae60';
    } else {
      debugPrice.innerText = '❌ Not found';
      debugPrice.style.color = '#e74c3c';
    }
  }
  
  if (debugEbitda) {
    if (lastScrapeData.ebitda > 0) {
      const type = lastScrapeData.isSDE ? 'SDE' : 'EBITDA';
      debugEbitda.innerText = '$' + formatNumber(lastScrapeData.ebitda) + ' (' + type + ')';
      debugEbitda.style.color = '#27ae60';
    } else {
      debugEbitda.innerText = '❌ Not found';
      debugEbitda.style.color = '#e74c3c';
    }
  }
}

// Open debug modal
if (debugBtn && debugModal) {
  debugBtn.addEventListener('click', () => {
    updateDebugModal();
    debugModal.style.display = 'flex';
  });
}

// Close debug modal
if (debugClose && debugModal) {
  debugClose.addEventListener('click', () => {
    debugModal.style.display = 'none';
  });
}

if (debugDone && debugModal) {
  debugDone.addEventListener('click', () => {
    debugModal.style.display = 'none';
  });
}

// Close modal when clicking outside
if (debugModal) {
  debugModal.addEventListener('click', (e) => {
    if (e.target === debugModal) {
      debugModal.style.display = 'none';
    }
  });
}

// Re-scrape button
if (debugRescrape) {
  debugRescrape.addEventListener('click', () => {
    console.log('🔄 Manual re-scrape triggered from diagnostics panel');
    scrapeData();
    setTimeout(() => {
      updateDebugModal();
    }, 500);
  });
}

// Open console button (info only - can't programmatically open devtools)
if (debugConsole) {
  debugConsole.addEventListener('click', () => {
    alert('Press F12 (or Cmd+Option+I on Mac) to open the browser console and view detailed scraping logs.');
  });
}

// Generate PDF-ready HTML
function generatePDFHTML() {
  try {
    const listingUrl = window.location.href;
    const ebitda = safeGetValue('da-ebitda', '$0');
    const askingPrice = safeGetValue('da-asking', '$0');
    const maxPrice = safeGetText('da-max-price', '$0');
    const offerPrice = safeGetValue('da-actual-price', '$0');
    const maxDebt = safeGetText('da-max-debt', '$0');
    const totalDebt = safeGetText('da-total-debt', '$0');
    const fcfAnnual = safeGetText('da-fcf-annual', '$0');
    const fcfMonthly = safeGetText('da-fcf-monthly', '$0');
    const ownerTakeHome = safeGetText('da-owner-salary', '$0');
    const targetSalary = safeGetValue('da-target-salary', '$0');
    const maxAvailable = safeGetText('da-max-available', '$0');
    
    const sbaPercent = safeGetValue('da-sba-percent', '0');
    const sbaLoan = safeGetValue('da-sba-loan', '$0');
    const downPercent = safeGetValue('da-down-percent', '0');
    const downPayment = safeGetValue('da-down', '$0');
    const bankRate = safeGetValue('da-bank-rate', '0');
    const bankTerm = safeGetValue('da-bank-term', '0');
    const dscr = safeGetValue('da-dscr', '0');
    
    const cocReturn = safeGetText('da-coc-return', '0%');
    const payback = safeGetText('da-payback', '0 yrs');
    
    const sellerNoteCheckbox = document.getElementById('da-seller-note-enabled');
    const sellerNoteEnabled = sellerNoteCheckbox ? sellerNoteCheckbox.checked : false;
    let sellerNoteHTML = '';
    if (sellerNoteEnabled) {
      const sellerPercent = safeGetValue('da-seller-percent', '0');
      const sellerAmt = safeGetValue('da-seller-amt', '$0');
      const sellerRate = safeGetValue('da-seller-rate', '0');
      const sellerStandby = safeGetValue('da-seller-standby', 'no') === 'yes' ? ' (Standby)' : '';
      const sellerPaymentType = safeGetValue('da-seller-payment-type', 'amortizing') === 'interest-only' ? 'Interest Only' : 'Amortizing';
      sellerNoteHTML = `
        <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Seller Note:</strong></td><td style="padding:8px; border-bottom:1px solid #eee;">${sellerPercent}% (${sellerAmt}) @ ${sellerRate}%${sellerStandby} - ${sellerPaymentType}</td></tr>
      `;
    }
  
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Deal Analysis Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #0d2e4e; border-bottom: 3px solid #0d2e4e; padding-bottom: 10px; }
    h2 { color: #0d2e4e; margin-top: 30px; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
    .section { margin: 20px 0; }
    .metric-box { background: #f8f9fa; border-left: 4px solid #27ae60; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .metric-box.orange { border-left-color: #e67e22; }
    .metric-box.purple { border-left-color: #9b59b6; }
    .metric-box.blue { border-left-color: #3498db; }
    .metric-box.teal { border-left-color: #16a085; }
    .metric-box.red { border-left-color: #e74c3c; }
    .metric-box.gray { border-left-color: #95a5a6; }
    .metric-title { font-size: 11px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
    .metric-value { font-size: 24px; font-weight: 700; color: #2c3e50; margin-top: 5px; }
    .metric-subtitle { font-size: 12px; color: #999; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    .url { color: #3498db; word-break: break-all; font-size: 12px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 11px; color: #999; text-align: center; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  </style>
</head>
<body>
  <h1>Deal Analysis Report</h1>
  <p><strong>Listing URL:</strong><br><span class="url">${listingUrl}</span></p>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  
  <h2>Financial Overview</h2>
  <table>
    <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Business EBITDA:</strong></td><td style="padding:8px; border-bottom:1px solid #eee;">${ebitda}</td></tr>
    <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Asking Price:</strong></td><td style="padding:8px; border-bottom:1px solid #eee;">${askingPrice}</td></tr>
  </table>
  
  <h2>Maximum Allowable (DSCR-Based)</h2>
  <div class="grid">
    <div class="metric-box">
      <div class="metric-title">Max Allowable Purchase Price</div>
      <div class="metric-value">${maxPrice}</div>
    </div>
    <div class="metric-box gray">
      <div class="metric-title">Max Annual Debt Service</div>
      <div class="metric-value">${maxDebt}</div>
    </div>
  </div>
  
  <h2>Return on Investment (Year 1)</h2>
  <div class="grid">
    <div class="metric-box orange">
      <div class="metric-title">Cash-on-Cash Return</div>
      <div class="metric-value">${cocReturn}</div>
      <div class="metric-subtitle">Annual return on equity</div>
    </div>
    <div class="metric-box purple">
      <div class="metric-title">Payback Period</div>
      <div class="metric-value">${payback}</div>
      <div class="metric-subtitle">Time to recover equity</div>
    </div>
  </div>
  
  <h2>Financing Structure</h2>
  <table>
    <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>SBA Loan:</strong></td><td style="padding:8px; border-bottom:1px solid #eee;">${sbaPercent}% (${sbaLoan}) @ ${bankRate}% for ${bankTerm} years</td></tr>
    <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Target DSCR:</strong></td><td style="padding:8px; border-bottom:1px solid #eee;">${dscr}</td></tr>
    <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Buyer Equity:</strong></td><td style="padding:8px; border-bottom:1px solid #eee;">${downPercent}% (${downPayment})</td></tr>
    ${sellerNoteHTML}
  </table>
  
  <h2>Actual Deal Scenario</h2>
  <div class="metric-box orange">
    <div class="metric-title">Offer Price</div>
    <div class="metric-value">${offerPrice}</div>
  </div>
  <div class="grid">
    <div class="metric-box purple">
      <div class="metric-title">Total Debt Service</div>
      <div class="metric-value">${totalDebt}</div>
    </div>
    <div class="metric-box">
      <div class="metric-title">Free Cash Flow (Annual)</div>
      <div class="metric-value">${fcfAnnual}</div>
      <div class="metric-subtitle">Monthly: ${fcfMonthly}</div>
    </div>
  </div>
  <div class="metric-box blue">
    <div class="metric-title">Total Owner Take-Home</div>
    <div class="metric-value">${ownerTakeHome}</div>
    <div class="metric-subtitle">Target Salary: ${targetSalary} + Free Cash Flow (max available: ${maxAvailable})</div>
  </div>
  
  <div class="footer">
    Generated by Max Price Deal Analyzer ${VERSION}
  </div>
</body>
</html>`;
  } catch (error) {
    console.error('Error in generatePDFHTML:', error);
    return '<html><body>Error generating PDF HTML</body></html>';
  }
}

// Generate share text
function generateShareText() {
  try {
    const listingUrl = window.location.href;
    const ebitda = safeGetValue('da-ebitda', '$0');
    const askingPrice = safeGetValue('da-asking', '$0');
    const maxPrice = safeGetText('da-max-price', '$0');
    const offerPrice = safeGetValue('da-actual-price', '$0');
    const totalDebt = safeGetText('da-total-debt', '$0');
    const fcfAnnual = safeGetText('da-fcf-annual', '$0');
    const ownerTakeHome = safeGetText('da-owner-salary', '$0');
    const targetSalary = safeGetValue('da-target-salary', '$0');
    
    const sbaPercent = safeGetValue('da-sba-percent', '0');
    const sbaLoan = safeGetValue('da-sba-loan', '$0');
    const downPercent = safeGetValue('da-down-percent', '0');
    const downPayment = safeGetValue('da-down', '$0');
    const bankRate = safeGetValue('da-bank-rate', '0');
    const bankTerm = safeGetValue('da-bank-term', '0');
    const dscr = safeGetValue('da-dscr', '0');
    
    // ROI Metrics
    const cocReturn = safeGetText('da-coc-return', '0%');
    const payback = safeGetText('da-payback', '0 yrs');
    const qualityScore = safeGetText('da-quality-score', '--');
    
    // Deal notes
    const dealNotes = safeGetValue('da-deal-notes', '').trim();
    const dealName = safeGetValue('da-deal-name', '').trim();
    
    const sellerNoteCheckbox = document.getElementById('da-seller-note-enabled');
    const sellerNoteEnabled = sellerNoteCheckbox ? sellerNoteCheckbox.checked : false;
    let sellerNoteText = '';
    if (sellerNoteEnabled) {
      const sellerPercent = safeGetValue('da-seller-percent', '0');
      const sellerAmt = safeGetValue('da-seller-amt', '$0');
      const sellerRate = safeGetValue('da-seller-rate', '0');
      const sellerStandby = safeGetValue('da-seller-standby', 'no') === 'yes' ? ' (Standby)' : '';
      sellerNoteText = `\n• Seller Note: ${sellerPercent}% (${sellerAmt}) @ ${sellerRate}%${sellerStandby}`;
    }
  
  let notesSection = '';
  if (dealNotes) {
    notesSection = `\n\n📝 DEAL NOTES:\n${dealNotes}`;
  }
  
  let nameHeader = dealName ? `${dealName}\n\n` : '';
  
  return `📊 DEAL ANALYSIS SUMMARY
${nameHeader}🔗 Listing: ${listingUrl}

💰 FINANCIALS:
• Business EBITDA: ${ebitda}
• Asking Price: ${askingPrice}
• Max Allowable Price: ${maxPrice}
• Offer Price: ${offerPrice}

🎯 DEAL QUALITY SCORE: ${qualityScore}/100

💵 FINANCING STRUCTURE:
• SBA Loan: ${sbaPercent}% (${sbaLoan}) @ ${bankRate}% (${bankTerm} years)
• Buyer Equity: ${downPercent}% (${downPayment})${sellerNoteText}
• Target DSCR: ${dscr}

📈 CASH FLOW:
• Annual Debt Service: ${totalDebt}
• Target Owner Salary: ${targetSalary}
• Free Cash Flow: ${fcfAnnual}
• Total Owner Take-Home: ${ownerTakeHome}

📊 RETURN ON INVESTMENT (Year 1):
• Cash-on-Cash Return: ${cocReturn}
• Payback Period: ${payback}${notesSection}

---
Generated by Max Price Deal Analyzer ${VERSION}`;
  } catch (error) {
    console.error('Error in generateShareText:', error);
    return 'Error generating share text. Please try again.';
  }
}

// Helper function to get business name from page
function getBusinessName() {
  // Try multiple strategies to find the business name
  
  // Strategy 1: Look for page title (most reliable)
  const pageTitle = document.title;
  console.log('Page title:', pageTitle);
  
  if (pageTitle && pageTitle !== 'Business For Sale') {
    // Clean up the title - remove common suffixes
    let cleanTitle = pageTitle
      .replace(/\s*-\s*BizQuest.*$/i, '')
      .replace(/\s*\|\s*BizBuySell.*$/i, '')
      .replace(/\s*-\s*Business For Sale.*$/i, '')
      .replace(/\s*\|\s*Crexi.*$/i, '')
      .replace(/\s*-\s*BizBuySell.*$/i, '')
      .replace(/\s*\|\s*Business.*$/i, '')
      .trim();
    
    console.log('Cleaned title:', cleanTitle);
    
    if (cleanTitle.length > 0 && cleanTitle.length < 150) {
      return cleanTitle;
    }
  }
  
  // Strategy 2: Look for h1 heading
  const h1 = document.querySelector('h1');
  if (h1 && h1.innerText && h1.innerText.trim().length > 0 && h1.innerText.trim().length < 150) {
    console.log('Found h1:', h1.innerText.trim());
    return h1.innerText.trim();
  }
  
  // Strategy 3: Look for specific business name selectors
  const selectors = [
    '[data-testid="listing-title"]',
    '.listing-title',
    '.business-name',
    'h1.title',
    '[class*="title"]',
    '[class*="heading"]'
  ];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText && el.innerText.trim().length > 0 && el.innerText.trim().length < 150) {
      console.log('Found via selector', selector, ':', el.innerText.trim());
      return el.innerText.trim();
    }
  }
  
  console.log('No business name found, using fallback');
  // Fallback: Use generic name
  return 'Deal-Analysis';
}

// Helper function to sanitize filename
function sanitizeFilename(filename) {
  // Remove or replace invalid filename characters
  let sanitized = filename
    .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dash
    .replace(/\s+/g, ' ')             // Normalize whitespace
    .replace(/--+/g, '-')             // Replace multiple dashes with single dash
    .replace(/\.+$/, '')              // Remove trailing dots
    .trim();
  
  // Limit length but try to keep whole words
  if (sanitized.length > 80) {
    sanitized = sanitized.substring(0, 80).trim();
    // Remove partial word at end
    const lastSpace = sanitized.lastIndexOf(' ');
    if (lastSpace > 50) {
      sanitized = sanitized.substring(0, lastSpace);
    }
  }
  
  console.log('Sanitized filename:', sanitized);
  return sanitized;
}

// Generate actual PDF file with colors and formatting
function generatePDFFile() {
  try {
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
      throw new Error('jsPDF library not loaded. Please reload the page.');
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Get all the data
    const listingUrl = window.location.href;
    const ebitda = safeGetValue('da-ebitda', '$0');
    const askingPrice = safeGetValue('da-asking', '$0');
    const maxPrice = safeGetText('da-max-price', '$0');
    const offerPrice = safeGetValue('da-actual-price', '$0');
    const maxDebt = safeGetText('da-max-debt', '$0');
    const totalDebt = safeGetText('da-total-debt', '$0');
    const fcfAnnual = safeGetText('da-fcf-annual', '$0');
    const fcfMonthly = safeGetText('da-fcf-monthly', '$0');
    const ownerTakeHome = safeGetText('da-owner-salary', '$0');
    const targetSalary = safeGetValue('da-target-salary', '$0');
    const maxAvailable = safeGetText('da-max-available', '$0');
    
    const sbaPercent = safeGetValue('da-sba-percent', '0');
    const sbaLoan = safeGetValue('da-sba-loan', '$0');
    const downPercent = safeGetValue('da-down-percent', '0');
    const downPayment = safeGetValue('da-down', '$0');
    const bankRate = safeGetValue('da-bank-rate', '0');
    const bankTerm = safeGetValue('da-bank-term', '0');
    const dscr = safeGetValue('da-dscr', '0');
    
    const cocReturn = safeGetText('da-coc-return', '0%');
    const payback = safeGetText('da-payback', '0 yrs');
    const qualityScore = safeGetText('da-quality-score', '--');
    
    // Deal notes and name
    const dealNotes = safeGetValue('da-deal-notes', '').trim();
    const dealName = safeGetValue('da-deal-name', '').trim();
  
  // Helper function to draw a colored box
  const drawBox = (x, y, width, height, borderColor, bgColor) => {
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(x, y, width, height, 'F');
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.8);
    doc.line(x, y, x, y + height);
  };
  
  let y = 15;
  
  // Header with background
  doc.setFillColor(13, 46, 78); // Navy blue
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  const headerTitle = dealName || 'DEAL ANALYSIS REPORT';
  doc.text(headerTitle, 15, 16);
  
  y = 30;
  
  // Deal Quality Score & Date
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Quality Score: ${qualityScore}/100`, 15, y);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 100, y);
  y += 6;
  
  // Clickable URL
  doc.setTextColor(52, 152, 219); // Blue
  doc.setFont(undefined, 'italic');
  doc.textWithLink('View Listing', 15, y, { url: listingUrl });
  doc.setTextColor(0, 0, 0);
  y += 10;
  
  // Financial Overview Section
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(102, 102, 102);
  doc.text('FINANCIAL OVERVIEW', 15, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Business EBITDA: ${ebitda}`, 20, y);
  y += 5;
  doc.text(`Asking Price: ${askingPrice}`, 20, y);
  y += 10;
  
  // Maximum Allowable Section with colored boxes
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(102, 102, 102);
  doc.text('MAXIMUM ALLOWABLE (DSCR-BASED)', 15, y);
  y += 6;
  
  // Green box for Max Price
  drawBox(15, y - 3, 3, 16, [39, 174, 96], [248, 249, 250]);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(85, 85, 85);
  doc.text('MAX ALLOWABLE PURCHASE PRICE', 22, y);
  y += 4;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(maxPrice, 22, y);
  y += 10;
  
  // Gray box for Max Debt
  drawBox(15, y - 3, 3, 16, [149, 165, 166], [248, 249, 250]);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(85, 85, 85);
  doc.text('MAX ANNUAL DEBT SERVICE', 22, y);
  y += 4;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(maxDebt, 22, y);
  y += 12;
  
  // ROI Section with colored boxes
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(102, 102, 102);
  doc.text('RETURN ON INVESTMENT (YEAR 1)', 15, y);
  y += 6;
  
  // Orange box - Cash on Cash
  drawBox(15, y - 3, 3, 16, [230, 126, 34], [248, 249, 250]);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(85, 85, 85);
  doc.text('CASH-ON-CASH RETURN', 22, y);
  y += 4;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(cocReturn, 22, y);
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(153, 153, 153);
  y += 4;
  doc.text('Annual return on equity', 22, y);
  y += 8;
  
  // Purple box - Payback
  drawBox(15, y - 3, 3, 16, [155, 89, 182], [248, 249, 250]);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(85, 85, 85);
  doc.text('PAYBACK PERIOD', 22, y);
  y += 4;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(payback, 22, y);
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(153, 153, 153);
  y += 4;
  doc.text('Time to recover equity', 22, y);
  y += 12;
  
  // Financing Structure
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(102, 102, 102);
  doc.text('FINANCING STRUCTURE', 15, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`SBA Loan: ${sbaPercent}% (${sbaLoan}) @ ${bankRate}% for ${bankTerm} years`, 20, y);
  y += 5;
  doc.text(`Target DSCR: ${dscr}`, 20, y);
  y += 5;
  doc.text(`Buyer Equity: ${downPercent}% (${downPayment})`, 20, y);
  y += 5;
  
  // Seller Note if enabled
  const sellerNoteCheckbox = document.getElementById('da-seller-note-enabled');
  const sellerNoteEnabled = sellerNoteCheckbox ? sellerNoteCheckbox.checked : false;
  if (sellerNoteEnabled) {
    const sellerPercent = safeGetValue('da-seller-percent', '0');
    const sellerAmt = safeGetValue('da-seller-amt', '$0');
    const sellerRate = safeGetValue('da-seller-rate', '0');
    const sellerStandby = safeGetValue('da-seller-standby', 'no') === 'yes' ? ' (Standby)' : '';
    const sellerPaymentType = safeGetValue('da-seller-payment-type', 'amortizing') === 'interest-only' ? 'Interest Only' : 'Amortizing';
    doc.text(`Seller Note: ${sellerPercent}% (${sellerAmt}) @ ${sellerRate}%${sellerStandby} - ${sellerPaymentType}`, 20, y);
    y += 5;
  }
  y += 5;
  
  // Actual Deal Scenario with colored boxes
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(102, 102, 102);
  doc.text('ACTUAL DEAL SCENARIO', 15, y);
  y += 6;
  
  // Orange box - Offer Price
  drawBox(15, y - 3, 3, 16, [230, 126, 34], [248, 249, 250]);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(85, 85, 85);
  doc.text('OFFER PRICE', 22, y);
  y += 4;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(offerPrice, 22, y);
  y += 10;
  
  // Purple box - Total Debt Service
  drawBox(15, y - 3, 3, 16, [155, 89, 182], [248, 249, 250]);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(85, 85, 85);
  doc.text('TOTAL DEBT SERVICE', 22, y);
  y += 4;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(totalDebt, 22, y);
  y += 10;
  
  // Green box - Free Cash Flow
  drawBox(15, y - 3, 3, 20, [39, 174, 96], [248, 249, 250]);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(85, 85, 85);
  doc.text('FREE CASH FLOW (ANNUAL)', 22, y);
  y += 4;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(fcfAnnual, 22, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(102, 102, 102);
  doc.text(`Monthly: ${fcfMonthly}`, 22, y);
  y += 9;
  
  // Blue box - Total Owner Take-Home
  drawBox(15, y - 3, 3, 20, [52, 152, 219], [248, 249, 250]);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(85, 85, 85);
  doc.text('TOTAL OWNER TAKE-HOME', 22, y);
  y += 4;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(ownerTakeHome, 22, y);
  y += 5;
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(153, 153, 153);
  doc.text(`Salary: ${targetSalary} + FCF (max available: ${maxAvailable})`, 22, y);
  y += 15;
  
  // Deal Notes Section (if present)
  if (dealNotes) {
    // Add page break if needed
    if (y > 250) {
      doc.addPage();
      y = 15;
    }
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(102, 102, 102);
    doc.text('DEAL NOTES', 15, y);
    y += 6;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    
    // Split notes into lines (max ~85 chars per line)
    const noteLines = doc.splitTextToSize(dealNotes, 180);
    noteLines.forEach(line => {
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
      doc.text(line, 15, y);
      y += 5;
    });
    y += 5;
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated by Max Price Deal Analyzer ${VERSION}`, 15, y);
  
  return doc;
  } catch (error) {
    console.error('Error in generatePDFFile:', error);
    throw error; // Re-throw so calling code can handle it
  }
}

// PDF Export
const sharePdfBtn = document.getElementById('da-share-pdf');
if (sharePdfBtn && shareModal) {
  sharePdfBtn.addEventListener('click', () => {
    try {
      const doc = generatePDFFile();
      const businessName = sanitizeFilename(getBusinessName());
      const filename = `${businessName}.pdf`;
      doc.save(filename);
      shareModal.style.display = 'none';
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF generation failed: ' + err.message + '\n\nPlease reload the extension and try again.');
    }
  });
}

// Email share
const shareEmailBtn = document.getElementById('da-share-email');
if (shareEmailBtn && shareModal) {
  shareEmailBtn.addEventListener('click', () => {
    try {
      const subject = encodeURIComponent('Deal Analysis - Business Acquisition Opportunity');
      const body = encodeURIComponent(generateShareText());
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      shareModal.style.display = 'none';
    } catch (err) {
      console.error('Email share error:', err);
      alert('Email share failed: ' + err.message);
    }
  });
}

// SMS share
const shareSmsBtn = document.getElementById('da-share-sms');
if (shareSmsBtn && shareModal) {
  shareSmsBtn.addEventListener('click', () => {
    try {
      const body = encodeURIComponent(generateShareText());
      window.open(`sms:?&body=${body}`, '_blank');
      shareModal.style.display = 'none';
    } catch (err) {
      console.error('SMS share error:', err);
      alert('SMS share failed: ' + err.message);
    }
  });
}

// Native share (includes AirDrop on Apple devices) - Share as actual PDF
const shareNativeBtn = document.getElementById('da-share-native');
if (shareNativeBtn && shareModal) {
  shareNativeBtn.addEventListener('click', async () => {
    if (navigator.share) {
      try {
        // Generate the actual PDF file
        const doc = generatePDFFile();
        const pdfBlob = doc.output('blob');
        const businessName = sanitizeFilename(getBusinessName());
        const filename = `${businessName}.pdf`;
        
        // Check if we can share files (better for AirDrop)
        if (navigator.canShare) {
          try {
            const file = new File([pdfBlob], filename, { type: 'application/pdf' });
            const fileShareData = {
              title: 'Deal Analysis - Business Acquisition',
              files: [file]
            };
            
            if (navigator.canShare(fileShareData)) {
              await navigator.share(fileShareData);
              shareModal.style.display = 'none';
              return;
            }
          } catch (fileErr) {
            console.log('PDF file sharing not supported:', fileErr);
          }
        }
        
        // Fallback to text-only sharing
        const shareText = generateShareText();
        await navigator.share({
          title: 'Deal Analysis - Business Acquisition',
          text: shareText
        });
        shareModal.style.display = 'none';
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share error:', err);
          alert('Share failed: ' + err.message + '\n\nTry the "Export as PDF" button to download, then AirDrop the file.');
        }
      }
    } else {
      alert('Native sharing not supported on this browser. Try the "Export as PDF" button instead.');
    }
  });
}

// Copy to clipboard
const shareCopyBtn = document.getElementById('da-share-copy');
if (shareCopyBtn) {
  shareCopyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      const btn = document.getElementById('da-share-copy');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        btn.style.background = '#27ae60';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '#95a5a6';
        }, 2000);
      }
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = generateShareText();
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      const btn = document.getElementById('da-share-copy');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        btn.style.background = '#27ae60';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '#95a5a6';
        }, 2000);
      }
    }
  });
}

loadUserPreferences();
loadState();

// Debug: Log current preferences after 1 second to verify persistence
setTimeout(() => {
  console.log('🔍 Current user preferences after load:', userPreferences);
  chrome.storage.local.get(['userPreferences'], (result) => {
    console.log('🔍 User preferences in storage:', result.userPreferences);
  });
}, 1000);

// --- 9. KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', (e) => {
  // Cmd/Ctrl + E: Toggle extension
  if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
    e.preventDefault();
    if (container.style.display === 'none') {
      container.style.display = 'flex';
    } else {
      container.style.display = 'none';
    }
  }
  
  // Cmd/Ctrl + S: Save deal (only when extension is visible)
  if ((e.metaKey || e.ctrlKey) && e.key === 's' && container.style.display === 'flex') {
    e.preventDefault();
    saveDeal();
  }
});

// --- 10. SAVE & LOAD DEALS ---
function saveDeal() {
  // Get or generate deal name
  let dealName = safeGetValue('da-deal-name', '').trim();
  if (!dealName) {
    // Auto-generate name from URL or business name
    const urlParts = window.location.pathname.split('/');
    dealName = `Deal ${new Date().toLocaleDateString()}`;
  }
  
  // Gather all deal data
  const dealData = {
    name: dealName,
    url: window.location.href,
    savedAt: new Date().toISOString(),
    notes: safeGetValue('da-deal-notes', ''),
    inputs: {
      ebitda: safeGetValue('da-ebitda', ''),
      asking: safeGetValue('da-asking', ''),
      sbaPercent: safeGetValue('da-sba-percent', ''),
      sbaLoan: safeGetValue('da-sba-loan', ''),
      bankRate: safeGetValue('da-bank-rate', ''),
      bankTerm: safeGetValue('da-bank-term', ''),
      dscr: safeGetValue('da-dscr', ''),
      downPercent: safeGetValue('da-down-percent', ''),
      down: safeGetValue('da-down', ''),
      targetSalary: safeGetValue('da-target-salary', ''),
      sellerNoteEnabled: document.getElementById('da-seller-note-enabled')?.checked || false,
      sellerPercent: safeGetValue('da-seller-percent', ''),
      sellerAmt: safeGetValue('da-seller-amt', ''),
      sellerRate: safeGetValue('da-seller-rate', ''),
      sellerStandby: safeGetValue('da-seller-standby', ''),
      sellerPaymentType: safeGetValue('da-seller-payment-type', ''),
      actualPrice: safeGetValue('da-actual-price', '')
    },
    results: {
      maxPrice: safeGetText('da-max-price', ''),
      totalDebt: safeGetText('da-total-debt', ''),
      fcfAnnual: safeGetText('da-fcf-annual', ''),
      ownerTakeHome: safeGetText('da-owner-salary', ''),
      cocReturn: safeGetText('da-coc-return', ''),
      payback: safeGetText('da-payback', ''),
      qualityScore: safeGetText('da-quality-score', '')
    }
  };
  
  // Load existing saved deals
  chrome.storage.local.get(['savedDeals'], (result) => {
    let savedDeals = result.savedDeals || [];
    
    // Check if deal with this name already exists
    const existingIndex = savedDeals.findIndex(d => d.name === dealName);
    if (existingIndex >= 0) {
      // Update existing deal
      savedDeals[existingIndex] = dealData;
    } else {
      // Add new deal
      savedDeals.push(dealData);
    }
    
    // Save to storage
    chrome.storage.local.set({ savedDeals: savedDeals }, () => {
      console.log('Deal saved:', dealName);
      updateSavedDealsList();
      
      // Visual feedback
      const saveBtn = document.getElementById('da-save-deal-btn');
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = '✅ Saved!';
      setTimeout(() => {
        saveBtn.innerHTML = originalText;
      }, 2000);
    });
  });
}

function loadDeal(dealName) {
  chrome.storage.local.get(['savedDeals'], (result) => {
    const savedDeals = result.savedDeals || [];
    const deal = savedDeals.find(d => d.name === dealName);
    
    if (!deal) return;
    
    // Load all inputs
    document.getElementById('da-deal-name').value = deal.name;
    document.getElementById('da-deal-notes').value = deal.notes || '';
    document.getElementById('da-ebitda').value = deal.inputs.ebitda;
    document.getElementById('da-asking').value = deal.inputs.asking;
    document.getElementById('da-sba-percent').value = deal.inputs.sbaPercent;
    document.getElementById('da-sba-loan').value = deal.inputs.sbaLoan;
    document.getElementById('da-bank-rate').value = deal.inputs.bankRate;
    document.getElementById('da-bank-term').value = deal.inputs.bankTerm;
    document.getElementById('da-dscr').value = deal.inputs.dscr;
    document.getElementById('da-down-percent').value = deal.inputs.downPercent;
    document.getElementById('da-down').value = deal.inputs.down;
    document.getElementById('da-target-salary').value = deal.inputs.targetSalary;
    document.getElementById('da-seller-note-enabled').checked = deal.inputs.sellerNoteEnabled;
    document.getElementById('da-seller-percent').value = deal.inputs.sellerPercent;
    document.getElementById('da-seller-amt').value = deal.inputs.sellerAmt;
    document.getElementById('da-seller-rate').value = deal.inputs.sellerRate;
    document.getElementById('da-seller-standby').value = deal.inputs.sellerStandby;
    document.getElementById('da-seller-payment-type').value = deal.inputs.sellerPaymentType;
    document.getElementById('da-actual-price').value = deal.inputs.actualPrice;
    
    // Show seller note section if enabled
    if (deal.inputs.sellerNoteEnabled) {
      document.getElementById('da-seller-note-section').style.display = 'block';
    }
    
    // Recalculate
    calculate();
    
    console.log('Deal loaded:', dealName);
  });
}

function updateSavedDealsList() {
  chrome.storage.local.get(['savedDeals'], (result) => {
    const savedDeals = result.savedDeals || [];
    const select = document.getElementById('da-saved-deals-list');
    
    // Clear existing options except first
    select.innerHTML = '<option value="">Load saved deal...</option>';
    
    // Add saved deals
    savedDeals.forEach(deal => {
      const option = document.createElement('option');
      option.value = deal.name;
      option.textContent = `${deal.name} (${new Date(deal.savedAt).toLocaleDateString()})`;
      select.appendChild(option);
    });
  });
}

// Event listeners for save/load
const saveDealBtn = document.getElementById('da-save-deal-btn');
if (saveDealBtn) {
  saveDealBtn.addEventListener('click', saveDeal);
}

const savedDealsList = document.getElementById('da-saved-deals-list');
if (savedDealsList) {
  savedDealsList.addEventListener('change', (e) => {
    if (e.target.value) {
      loadDeal(e.target.value);
    }
  });
}

// Auto-save notes as user types (debounced)
let notesTimeout;
const dealNotesField = document.getElementById('da-deal-notes');
if (dealNotesField) {
  dealNotesField.addEventListener('input', () => {
    clearTimeout(notesTimeout);
    notesTimeout = setTimeout(() => {
      saveState(); // Save notes with current state
    }, 1000);
  });
}

// Load saved deals list on startup
updateSavedDealsList();

// Recalc button - refreshes data from page
const recalcBtn = document.getElementById('da-recalc-btn');
if (recalcBtn) {
  recalcBtn.addEventListener('click', () => {
    scrapeData();
  });
}

// Deal opportunity close button - dismisses the banner
const dealOpportunityClose = document.getElementById('da-deal-opportunity-close');
const dealOpportunityDiv = document.getElementById('da-deal-opportunity');
if (dealOpportunityClose && dealOpportunityDiv) {
  dealOpportunityClose.addEventListener('click', () => {
    dealOpportunityDiv.style.display = 'none';
  });
  
  // Add hover effect
  dealOpportunityClose.addEventListener('mouseenter', () => {
    dealOpportunityClose.style.opacity = '1';
  });
  dealOpportunityClose.addEventListener('mouseleave', () => {
    dealOpportunityClose.style.opacity = '0.7';
  });
}
