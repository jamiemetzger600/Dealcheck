// --- VERSION ---
const VERSION = 'v1.1.2';

// --- 1. HTML UI TEMPLATE ---
const uiHTML = `
<div id="deal-analyzer-container">
  <div id="deal-analyzer-header">Deal Analyzer <span style="font-size:11px; opacity:0.8; font-weight:400;">${VERSION}</span> <span id="da-close">✕</span></div>

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
      <div class="da-label" style="font-weight:600; color:#444; margin-bottom:6px;">A. SBA</div>
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

    <div style="margin-bottom:10px;">
      <div class="da-label" style="font-weight:600; color:#444; margin-bottom:6px;">B. Buyer Equity</div>
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

    <div style="margin-bottom:10px;">
      <div class="da-label" style="font-weight:600; color:#444; margin-bottom:6px;">
        <label style="cursor:pointer; display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="da-seller-note-enabled" style="width:auto; cursor:pointer;">
          <span>C. Seller Note <span style="font-weight:400; color:#999;">(Optional)</span></span>
        </label>
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
    <div id="da-deal-opportunity" class="da-warning" style="background:#d4edda; border-left-color:#28a745; color:#155724; display:none; margin-bottom:12px;">
      💰 <strong>DEAL OPPORTUNITY!</strong><br>
      <span id="da-deal-savings"></span>
    </div>
    
    <!-- MAX SCENARIO -->
    <div style="margin-bottom:15px; padding-bottom:12px; border-bottom:2px solid #ddd;">
      <div style="font-size:12px; font-weight:700; color:#666; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Maximum Affordable (DSCR-Based)</div>
      <div class="da-result-box">
        <div class="da-result-title">Max Allowable Purchase Price</div>
        <div class="da-result-value" id="da-max-price">$0</div>
      </div>
      <div class="da-result-box" style="border-left-color: #95a5a6;">
        <div class="da-result-title">Max Annual Debt Service</div>
        <div class="da-result-value" id="da-max-debt">$0</div>
      </div>
    </div>
    
    <!-- ACTUAL SCENARIO -->
    <div style="margin-bottom:15px;">
      <div style="font-size:12px; font-weight:700; color:#666; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Actual Deal Scenario</div>
      <div class="da-result-box" style="border-left-color: #e67e22;">
        <div class="da-result-title">Actual Purchase Price <span style="font-weight:400; color:#999; font-size:11px;">(Click to edit)</span></div>
        <input type="text" id="da-actual-price" class="da-input" value="$0" readonly style="font-size:24px; font-weight:700; color:#2c3e50; border:none; background:transparent; padding:5px 0; cursor:pointer;">
      </div>
      <div class="da-result-box" style="border-left-color: #9b59b6;">
        <div class="da-result-title">Total Debt Service</div>
        <div class="da-result-value" id="da-total-debt">$0</div>
      </div>
      <div class="da-result-box" style="border-left-color: #27ae60;">
        <div class="da-result-title">Free Cash Flow (Annual)</div>
        <div class="da-result-value" id="da-fcf-annual">$0</div>
        <div style="font-size:13px; color:#666; margin-top:5px;">Monthly: <span id="da-fcf-monthly">$0</span></div>
      </div>
      <div class="da-result-box" style="border-left-color: #3498db;">
        <div class="da-result-title">Total Owner Take-Home</div>
        <div class="da-result-value" id="da-owner-salary">$0</div>
        <div style="font-size:11px; color:#999; margin-top:5px;" id="da-owner-subtitle">Salary + FCF (max available: <span id="da-max-available">$0</span>)</div>
      </div>
    </div>
    
    <button id="da-recalc-btn" class="da-btn">↺ Refresh Data</button>
  </div>
</div>
`;

// Inject the UI
const div = document.createElement('div');
div.innerHTML = uiHTML;
document.body.appendChild(div);

// --- 2. DRAGGABLE WINDOW LOGIC ---
const container = document.getElementById('deal-analyzer-container');
const header = document.getElementById('deal-analyzer-header');
let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

header.addEventListener("mousedown", dragStart);
document.addEventListener("mouseup", dragEnd);
document.addEventListener("mousemove", drag);

function dragStart(e) {
  initialX = e.clientX - xOffset;
  initialY = e.clientY - yOffset;
  if (e.target === header) isDragging = true;
}
function dragEnd() { isDragging = false; }
function drag(e) {
  if (isDragging) {
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    xOffset = currentX;
    yOffset = currentY;
    container.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
  }
}
document.getElementById('da-close').onclick = () => container.style.display = 'none';

// --- 3. IMPROVED "SMART" SCRAPING LOGIC ---

// Helper: Converts "$3,000,000" string to 3000000 number
function parseCurrency(str) {
  if (!str) return 0;
  // Looks for numbers with commas, e.g. 1,000 or 100,000
  const match = str.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
  return match ? parseInt(match[0].replace(/,/g, '')) : 0;
}

// Helper: Finds a value on the page by looking for its label
function findValueByLabel(keywords) {
  // We look at all common text containers
  const candidates = document.querySelectorAll('b, strong, span, p, div, td, dt, h4, h5');

  for (const el of candidates) {
    const text = el.innerText.trim().toLowerCase();
    const labelFound = keywords.some(k => text === k.toLowerCase() || text.startsWith(k.toLowerCase() + ":"));

    if (labelFound) {
      // STRATEGY A: The value is in the next sibling element (e.g., <b>Price:</b> <span>$100</span>)
      let sibling = el.nextElementSibling;
      if (sibling && sibling.innerText.match(/\$/)) {
         return parseCurrency(sibling.innerText);
      }

      // STRATEGY B: The value is inside the parent's text (e.g., <p><b>Price:</b> $100</p>)
      if (el.parentElement) {
        const parentText = el.parentElement.innerText;
        // Remove the label itself to isolate the number
        const cleanParent = parentText.replace(el.innerText, "");
        if (cleanParent.match(/\$/)) {
            return parseCurrency(cleanParent);
        }
      }

      // STRATEGY C: The value is in the same element? (e.g. <div>Price: $100</div>)
      if (el.innerText.match(/\$/)) {
          return parseCurrency(el.innerText);
      }
    }
  }
  return 0; // Not found
}

function scrapeData() {
  // 1. Find Asking Price
  // We try specific labels used by BizQuest, BizBuySell, Crexi
  let askingPrice = findValueByLabel(["Asking Price", "Price", "Purchase Price"]);

  // 2. Find EBITDA or SDE
  // Priority 1: Look for explicit "EBITDA" first (cleanest number)
  let ebitdaVal = findValueByLabel(["EBITDA"]);
  let isSDE = false;

  // Priority 2: If no EBITDA, look for Cash Flow / SDE
  if (ebitdaVal === 0) {
      ebitdaVal = findValueByLabel(["Cash Flow", "SDE", "Seller Discretionary Earnings", "Discretionary Earnings"]);
      if (ebitdaVal > 0) {
          isSDE = true;
      }
  }

  // 3. Update Inputs with formatted numbers (with $ for currency fields)
  if (askingPrice > 0) {
      document.getElementById('da-asking').value = '$' + formatNumber(askingPrice);
  }

  if (ebitdaVal > 0) {
      if (isSDE) {
          document.getElementById('da-sde-warning').classList.add('visible');
          // Apply $200k subtraction rule for SDE
          ebitdaVal = Math.max(0, ebitdaVal - 200000);
      } else {
          document.getElementById('da-sde-warning').classList.remove('visible');
      }
      document.getElementById('da-ebitda').value = '$' + formatNumber(ebitdaVal);
  } else {
      // If we found nothing, clear the warning so it doesn't confuse user
      document.getElementById('da-sde-warning').classList.remove('visible');
  }

  calculate();
}

// Helper: Parse number from formatted string (removes commas and $)
function parseNumber(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[,$]/g, '');
  return parseFloat(cleaned) || 0;
}

// Helper: Format number with commas
function formatNumber(n) {
  return n.toLocaleString(undefined, {maximumFractionDigits:0});
}

// Helper: Format currency with commas
function fmt(n) {
  return "$" + formatNumber(n);
}

// Track which fields have been manually overridden
const overrides = {
  sbaLoan: false,
  downPayment: false,
  sellerNote: false,
  actualPrice: false
};

// --- 4. FINANCIAL MATH ---
function calculate() {
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
  
  // Free Cash Flow = Available Cash Flow - Target Salary
  const freeCashFlowAnnual = Math.max(0, availableCashFlow - targetSalary);
  const freeCashFlowMonthly = freeCashFlowAnnual / 12;
  
  // Validate that target salary doesn't exceed available cash flow
  const salaryWarning = document.getElementById('da-salary-warning');
  if (targetSalary > availableCashFlow && availableCashFlow > 0) {
    salaryWarning.style.display = 'block';
    salaryWarning.innerHTML = `⚠️ Warning: Target salary ($${formatNumber(targetSalary)}) exceeds available cash flow ($${formatNumber(availableCashFlow)})!`;
  } else {
    salaryWarning.style.display = 'none';
  }
  
  // Total Owner Take-Home = Salary + Remaining Free Cash Flow
  const totalOwnerTakeHome = targetSalary + freeCashFlowAnnual;

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

  // Display Deal Opportunity Banner
  const dealOpportunityDiv = document.getElementById('da-deal-opportunity');
  const dealSavingsSpan = document.getElementById('da-deal-savings');
  if (isDealOpportunity) {
    const savings = maxPurchasePrice - askingPrice;
    dealOpportunityDiv.style.display = 'block';
    dealSavingsSpan.innerText = `Asking price is ${fmt(savings)} below your max affordable price!`;
  } else {
    dealOpportunityDiv.style.display = 'none';
  }

  // Display Results
  document.getElementById('da-max-price').innerText = fmt(maxPurchasePrice);
  // da-actual-price is now an input field, updated above
  document.getElementById('da-max-debt').innerText = fmt(maxAnnualDebtService);
  document.getElementById('da-total-debt').innerText = fmt(totalDebtService);
  document.getElementById('da-fcf-annual').innerText = fmt(freeCashFlowAnnual);
  document.getElementById('da-fcf-monthly').innerText = fmt(freeCashFlowMonthly);
  document.getElementById('da-owner-salary').innerText = fmt(totalOwnerTakeHome);
  document.getElementById('da-max-available').innerText = fmt(availableCashFlow);

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
        }
        scrapeData();
    });
}

// Set up event listeners
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

// Make auto-calculated fields editable on click
document.getElementById('da-actual-price').addEventListener('click', () => {
  makeEditable('da-actual-price', 'actualPrice');
});
document.getElementById('da-sba-loan').addEventListener('click', () => {
  makeEditable('da-sba-loan', 'sbaLoan');
});
document.getElementById('da-down').addEventListener('click', () => {
  makeEditable('da-down', 'downPayment');
});
document.getElementById('da-seller-amt').addEventListener('click', () => {
  makeEditable('da-seller-amt', 'sellerNote');
});

// Seller note checkbox
document.getElementById('da-seller-note-enabled').addEventListener('change', (e) => {
  const section = document.getElementById('da-seller-note-section');
  section.style.display = e.target.checked ? 'block' : 'none';
  if (!e.target.checked) {
    document.getElementById('da-seller-amt').value = '';
    overrides.sellerNote = false;
  }
  calculate();
});

// Reset overrides when key inputs change
document.getElementById('da-asking').addEventListener('input', () => {
  // When asking price changes, reset actual price override
  overrides.actualPrice = false;
  const actualPriceField = document.getElementById('da-actual-price');
  actualPriceField.setAttribute('readonly', 'readonly');
  calculate();
});

document.getElementById('da-sba-percent').addEventListener('input', () => {
  // When SBA % changes, reset the loan size override so it recalculates
  overrides.sbaLoan = false;
  const sbaLoanField = document.getElementById('da-sba-loan');
  sbaLoanField.setAttribute('readonly', 'readonly');
  calculate();
});
document.getElementById('da-down-percent').addEventListener('input', () => {
  if (!overrides.downPayment) {
    calculate();
  }
});
document.getElementById('da-seller-percent').addEventListener('input', () => {
  if (!overrides.sellerNote) {
    calculate();
  }
});

document.getElementById('da-recalc-btn').addEventListener('click', scrapeData);
loadState();
