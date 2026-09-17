function getElement(id) {
  return document.getElementById(id);
}

/* ----------------------------------------------------------------------- *
 * COMPANY CONSTANTS — identical on every letter
 * ----------------------------------------------------------------------- */
const COMPANY = {
  name: 'UXINTERFACELY IT SOLUTIONS LLP',
  tagline: 'THE DIGITAL ENGINEERING',
  hqCity: 'Hyderabad',
  pfMonthlyCap: 1800,   // this letter deducts a flat ₹1,800 employee + ₹1,800 employer PF
  professionalTaxMonthly: 200,
  // Signature/stamp image shown under "Regards" on the final page.
  stampImage: 'signature.png',
};

/* ----------------------------------------------------------------------- *
 * FORMATTING HELPERS
 * ----------------------------------------------------------------------- */
function formatRupees(amount) {
  return Math.round(amount).toLocaleString('en-IN');
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDaySuffix(day) {
  const isTeen = (day % 100 >= 11 && day % 100 <= 13);
  if (isTeen) return 'th';
  const lastDigit = day % 10;
  if (lastDigit === 1) return 'st';
  if (lastDigit === 2) return 'nd';
  if (lastDigit === 3) return 'rd';
  return 'th';
}

/** "Aug 3rd, 2026" — used for Date of Joining */
function formatDateMonthFirst(isoDateString) {
  if (!isoDateString) return '';
  const date = new Date(isoDateString + 'T00:00:00');
  const day = date.getDate();
  return `${MONTH_NAMES[date.getMonth()]} ${day}${getDaySuffix(day)}, ${date.getFullYear()}`;
}

/** "1st Aug, 2026" — used for the "This statement dated ..." line */
function formatDateDayFirst(isoDateString) {
  if (!isoDateString) return '';
  const date = new Date(isoDateString + 'T00:00:00');
  const day = date.getDate();
  return `${day}${getDaySuffix(day)} ${MONTH_NAMES[date.getMonth()]}, ${date.getFullYear()}`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function numberToWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : '');
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    return `${ONES[hundreds]} Hundred` + (remainder ? ` ${numberToWords(remainder)}` : '');
  }
  return String(n); // fallback for 1000+, not expected for a notice period
}

/** "2 Lakh" for 200000; falls back to a plain rupee figure otherwise */
function toLakhsPhrase(amount) {
  if (amount % 100000 === 0) return `${amount / 100000} Lakh`;
  return `₹${formatRupees(amount)}`;
}

/* ----------------------------------------------------------------------- *
 * SALARY CALCULATION — flat PF policy used in this letter
 * ----------------------------------------------------------------------- */
function calculateSalaryBreakdown(annualCtc) {
  const ctcPerMonth = annualCtc / 12;

  // Basic salary = 50% of Monthly salary
  const basic = Math.round(ctcPerMonth * 0.5);

  // HRA = 40% of Basic
  const hra = Math.round(basic * 0.4);

  // PF share formula — used for BOTH employer + employee contribution
  const pfShare = basic > 15000
    ? COMPANY.pfMonthlyCap
    : Math.round(basic * 0.12);

  const employeePf = pfShare;
  const employerPf = pfShare;

  // Special allowance = Basic - HRA - (employer PF share)
  const specialAllowance = Math.round(basic - hra - employerPf);

  // Auto-fill PF fields on the form if present
  const pfEmployeeInput = getElement('pfEmployee');
  if (pfEmployeeInput) {
    pfEmployeeInput.value = employeePf;
  }
  const pfEmployerInput = getElement('pfEmployer');
  if (pfEmployerInput) {
    pfEmployerInput.value = employerPf;
  }

  const professionalTax = COMPANY.professionalTaxMonthly;

  // Toggle states — Variable Pay / Provident Fund / TDS
  const variableIncluded = document.querySelector('input[name="variablePayToggleRadio"]:checked')?.value === 'yes';
  const variableAmount = variableIncluded ? (Number(getElement('variablePayToggleAmount').value) || 0) : 0;

  const pfIncluded = document.querySelector('input[name="pfRadio"]:checked')?.value === 'yes';
  const pfDeduction = pfIncluded ? employeePf : 0;

  const tdsIncluded = document.querySelector('input[name="tdsRadio"]:checked')?.value === 'yes';
  const tdsAmount = tdsIncluded ? (Number(getElement('tdsAmount').value) || 0) : 0;

  // Gross monthly earnings used for Take Home = Basic + HRA + Special Allowance only.
  const grossPerMonth = basic + hra + specialAllowance;

  // Total deductions used for Take Home = Professional Tax + PF (if on) + TDS (if on).
  const totalDeductions = professionalTax + pfDeduction + tdsAmount;

  const takeHomePerMonth = grossPerMonth - totalDeductions;

  return {
    ctcPerMonth,
    basic,
    hra,
    specialAllowance,
    employeePf,
    employerPf,
    professionalTax,
    totalDeductions,
    takeHomePerMonth,
    variableIncluded,
    variableAmount,
    pfIncluded,
    pfDeduction,
    tdsIncluded,
    tdsAmount,
    grossPerMonth,
  };
}

/* ----------------------------------------------------------------------- *
 * FORM WIRING
 * ----------------------------------------------------------------------- */
function safeSetup(label, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`Setup step "${label}" failed — this element/feature may not work:`, err);
  }
}

function toLocalISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const todayISO = toLocalISO(new Date());

function addDaysISO(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toLocalISO(dt);
}

safeSetup('default letterDate', () => {
  getElement('letterDate').value = todayISO;
});
safeSetup('default doj', () => {
  getElement('doj').value = addDaysISO(todayISO, 1);
});
safeSetup('bondToggle change listener', () => {
  getElement('bondToggle').addEventListener('change', function () {
    const includeBond = getElement('bondToggle').checked;
    getElement('bondFields').classList.toggle('show', includeBond);
  });
});

function readFormValues() {
  let workLocation = getElement('workLocation').value;
  if (workLocation === '__custom') {
    workLocation = getElement('customLocation').value.trim();
  }
  return {
    name: getElement('empName').value.trim(),
    doj: getElement('doj').value,
    letterDate: getElement('letterDate').value,
    jobTitle: getElement('jobTitle').value.trim(),
    department: getElement('department').value.trim(),
    workLocation: workLocation,
    roleDesc: getElement('roleDesc').value.trim(),
    annualCtc: parseFloat(getElement('annualCtc').value) || 0,
    noticePeriodDays: (() => {
      const parsed = parseInt(getElement('noticePeriod').value, 10);
      return Number.isNaN(parsed) ? 90 : parsed;
    })(),
    includeBond: getElement('bondToggle').checked,
    bondYears: parseInt(getElement('bondYears').value) || 1,
    bondAmount: parseFloat(getElement('bondAmount').value) || 0
  };
}

function formValuesAreValid(values) {
  if (!values.name || !values.doj || !values.annualCtc) {
    alert('Please fill in at least Name, Date of Joining, and Annual CTC.');
    return false;
  }
  return true;
}

/* ----------------------------------------------------------------------- *
 * PAGE BUILDERS — one function per page.
 * ----------------------------------------------------------------------- */

function pageFooterHtml(pageNumber, totalPages) {
  return `
    <div class="letter-footer">
      <span class="page-number">Page ${pageNumber} of ${totalPages}</span>
    </div>
  `;
}

function pageWrapper(innerHtml, isFirstPage, pageNumber, totalPages) {
  const letterhead = isFirstPage ? `
    <div class="letterhead">
      <img class="logo-img" src="logonew.png" alt="Logo" />
    </div>
  ` : '';
  return `<div class="page">${letterhead}<div class="page-body">${innerHtml}</div>${pageFooterHtml(pageNumber, totalPages)}</div>`;
}

function buildPage1(values, salary) {
  const roleLine = values.roleDesc ? ` ${values.roleDesc}` : '';
  const remunerationLine = salary && salary.variableIncluded
    ? `Your annual remuneration will be <strong>INR ${formatRupees(values.annualCtc + salary.variableAmount)}/-</strong> per annum, which includes a variable pay component of <strong>INR ${formatRupees(salary.variableAmount)}/-</strong> that is completely dependent on your performance.`
    : `Your annual remuneration will be <strong>INR ${formatRupees(values.annualCtc)}/-</strong> per annum.`;

  return pageWrapper(`
    <div class="letter-title">OFFER LETTER</div>
    <p><strong>Dear ${values.name}</strong>,</p>
    <p><strong>Date of Joining:</strong> <strong>${formatDateMonthFirst(values.doj)}</strong></p>
    <p>This statement dated <strong>${formatDateDayFirst(values.letterDate)}</strong> sets out details of the main terms of your employment with <strong>${COMPANY.name}, ${COMPANY.hqCity}.</strong></p>
    <p><strong>${COMPANY.name}</strong> is pleased to offer you appointment as <strong>${values.jobTitle}</strong>. We trust that your knowledge, skills and experience will be among our most valuable assets.</p>

    <h3>Job Title:</h3>
    <p>The title of the job that you are employed to do is <strong>${values.jobTitle}</strong>. This position will be in the Company's <strong>${values.department}</strong> department.${roleLine}</p>
    <p>The Company may amend your duties from time to time, and in addition to your normal duties you may from time to time be required to undertake additional or other duties as necessary to meet the needs of the business. This may involve a change in department also.</p>
    <p>Please note that during the course of employment with us, you are able to work at any place in the world.</p>

    <h3>HOURS AND PLACE OF WORK:</h3>
    <p>You shall be based at <strong>${values.workLocation}</strong>, but may be required to serve the Company in any place within or outside India, as required.</p>
    <p>You may be required to travel nationally and internationally on the business of the Company.</p>
    <p>You will be required to work such hours as may reasonably be expected of you and as is consistent with an appointment of this nature.</p>
    <p>You may, at the discretion of the Company, be transferred to any of the divisions, departments, in the Company, its subsidiaries, branches or associate companies and you shall abide by the standing orders and services rules prevailing in such place/entity without entitlement to any extra remuneration.</p>

    <h3>SALARY:</h3>
    <p>${remunerationLine}</p>
    <p>Please note the salary structure of the Company may be altered or modified at any time without prior notice. Your remuneration package is strictly confidential between you and the Company, and should not be discussed with anyone nor divulged to anyone in any manner whatsoever.</p>
  `, true, 1, 4);
}

function buildPage2(values, salary) {
  const noticeWords = numberToWords(values.noticePeriodDays);

  return pageWrapper(`
    <h3>ANNUAL SALARY REVISION:</h3>
    <p>We follow an April to March performance cycle. All salary revisions come up for review in the month of April at the sole discretion of the Company.</p>
    <p>Employees who have joined the organization on or before October 1 in the current calendar year, may be eligible for a proportionate salary review during April of next calendar year. The increment, if any, is dependent on various factors including performance of the employee and would be proportionate to the number of months of service rendered by the employee. Those joining after 1st October will not be eligible for the same.</p>

    <h3>TERMINATION OR RESIGNATION FROM SERVICE:</h3>
    <p>The employment can, subject to the policies of the Company and the terms and conditions of this Employment Letter, be terminated by either party by serving <strong>${values.noticePeriodDays} (${noticeWords}) days</strong> written notice to the other party. The notice period is part of the Employee Separation Policy which is available for your reference on the Company's HRMS.</p>
    <p>The Company reserves the right to accept/reject the notice pay in lieu of the notice period mentioned hereinabove.</p>
    <p>The Company reserves the absolute right to terminate your services at any time, without assigning any reason whatsoever, by giving you notice in writing or pay in lieu of notice period.</p>
    <p>The Company reserves the right, at its discretion and at any time during the notice period, to announce to employees, clients, suppliers and customers of the Company, its subsidiaries or associate companies, your termination/resignation. However, you expressly agree hereby not to make any announcement of your termination/resignation, unless the same has been formally intimated to you or accepted by the Company in writing, as the case may be.</p>

    <h3>LEAVE ENTITLEMENT AND POLICY</h3>
    <p>For the purpose of leave entitlement, the leave year shall be considered as the calendar year commencing from 1 January and ending on 31 December of each year.</p>
    <p>The Employee shall be entitled to a total of fifteen (15) days of leave per leave year, subject to the Company's prevailing Leave Policy and applicable rules. The annual leave entitlement shall consist of:</p>
    <ul>
      <li><strong>Casual Leave (CL): 10 days per leave year</strong></li>
      <li><strong>Sick Leave (SL): 5 days per leave year</strong></li>
    </ul>
    <p>Leave shall be availed with the prior approval of the reporting manager or the authorized person, except in cases of emergency or sudden illness, where the Employee shall inform the Company at the earliest possible opportunity.</p>
    <p>Employees joining during the course of a leave year shall be eligible for leave on a pro-rata basis, as applicable under the Company's Leave Policy.</p>
    <p>The carry-forward, lapse, or encashment of unused leave shall be governed by the Company's prevailing policies and applicable statutory requirements.</p>
    <p>The Company reserves the right to amend or modify the Leave Policy from time to time in accordance with business requirements and applicable laws.</p>
  `, false, 2, 4);
}

function buildPage3(values) {
  const bondYearWord = values.bondYears === 1 ? 'year' : 'years';
  const bondHtml = values.includeBond ? `
    <h3>SERVICE BOND CLAUSE</h3>
    <p>The Employee agrees to remain in the employment of the Company for a minimum period of <strong>${numberToWords(values.bondYears).toLowerCase()} (${values.bondYears}) ${bondYearWord}</strong> from the date of joining. This commitment is made considering the Company's investment in recruitment, training, onboarding, and skill development. In the event that the Employee voluntarily resigns or discontinues employment before completing the agreed service period, the Employee shall reimburse the Company an amount of <strong>${toLakhsPhrase(values.bondAmount)}</strong> towards the costs incurred by the Company for recruitment, training, and related administrative expenses. This provision shall be interpreted and enforced in accordance with applicable laws and regulations governing employment contracts.</p>
  ` : '';

  return pageWrapper(`
    <h3>PERFORMANCE BASED VARIABLE BONUS/ INCENTIVE:</h3>
    <p>You will be eligible to participate in the Company's variable pay programs/incentive schemes. The payment under this program depends on your performance, the Company's performance and other parameters as the Company may decide from time to time. Please note that there is no minimum payment under this program.</p>
    <p>Payment of this amount is subject to your being in the Company's employment and also subject to your not having resigned or being on notice period.</p>
    <p>You will declare your relationship, if any, with any of the directors of the Company as required by the Companies Act, 2013.</p>
    <p>In case you are or become related to any employee of the Company, then, in the former case you will inform the Company immediately, and in the latter case within 7 days of your becoming so.</p>
    <p>You will abide by all the policies and disclosure norms of the Company that are in effect and by any amendments thereto carried out by the Company from time to time.</p>

    <h3>COMPANY POLICIES AND PROCEDURE:</h3>
    <p>You shall be required at all times to comply with the Company's rules, policies and procedures as may be amended by the Company from time to time, and the same are to be considered as part of the terms and conditions of this Employment Letter. You are also required to comply generally with the standards reasonably expected of an appointment of your nature.</p>

    <h3>ADDITIONAL DUTIES</h3>
    <p>You agree and consent that the Company may require you (without additional remuneration) to carry out different or additional duties (including holding any office in the Company, its subsidiaries and associate companies) consistent with your status and position in the Company.</p>

    ${bondHtml}
  `, false, 3, 4);
}

function buildSalaryTableHtml(salary, values) {
  const variableRow = salary.variableIncluded
    ? `<tr><td>Variable Pay</td><td class="num"></td><td class="num">${formatRupees(salary.variableAmount)}</td></tr>`
    : '';

  const pfRow = salary.pfIncluded
    ? `<tr><td>Provident Fund</td><td class="num">${formatRupees(salary.pfDeduction)}</td><td class="num">${formatRupees(salary.pfDeduction * 12)}</td></tr>`
    : '';

  const tdsRow = salary.tdsIncluded
    ? `<tr><td>TDS</td><td class="num">${formatRupees(salary.tdsAmount)}</td><td class="num">${formatRupees(salary.tdsAmount * 12)}</td></tr>`
    : '';

  return `
    <table class="salary-table">
      <thead>
        <tr><th>Component</th><th class="num">Monthly</th><th class="num">Yearly</th></tr>
      </thead>
      <tbody>
        <tr><td>Basic</td><td class="num">${formatRupees(salary.basic)}</td><td class="num">${formatRupees(salary.basic * 12)}</td></tr>
        <tr><td>House Rent Allowance(HRA)</td><td class="num">${formatRupees(salary.hra)}</td><td class="num">${formatRupees(salary.hra * 12)}</td></tr>
        <tr><td>Special Allowance</td><td class="num">${formatRupees(salary.specialAllowance)}</td><td class="num">${formatRupees(salary.specialAllowance * 12)}</td></tr>
        <tr class="subhead"><td>Gross Pay</td><td class="num">${formatRupees(salary.grossPerMonth)}</td><td class="num">${formatRupees(salary.grossPerMonth * 12)}</td></tr>
        ${variableRow}
        <tr class="subhead"><td>Deductions</td><td class="num"></td><td class="num"></td></tr>
        ${pfRow}
        <tr><td>Professional Tax</td><td class="num">${formatRupees(salary.professionalTax)}</td><td class="num">${formatRupees(salary.professionalTax * 12)}</td></tr>
        ${tdsRow}
        <tr class="subhead"><td>Total Deductions</td><td class="num">${formatRupees(salary.totalDeductions)}</td><td class="num">${formatRupees(salary.totalDeductions * 12)}</td></tr>
        <tr class="total"><td>Take Home</td><td class="num">${formatRupees(salary.takeHomePerMonth)}</td><td class="num">${formatRupees(salary.takeHomePerMonth * 12)}</td></tr>
      </tbody>
    </table>
    <p class="letter-foot-note">#The Indicative Performance Pay amount as per the current performance pay policy may vary depending upon the performance of individual and of the company. The management reserves the rights to amend policy at any point of time.</p>
    <p class="letter-foot-note">* The exact sum of all elements may mismatch up to Rs.10/-. In the event there is any enhancement in the total emoluments to be paid to you on account of change in any statute or notification, then the said enhanced payment will be adjusted from the total CTC payable to you as shown here in above. In such a case the company will have the right to restructure your emoluments within the specific CTC.</p>
  `;
}

function buildPage4(values, salary) {
  return pageWrapper(`
    <h3>Detailed Salary Structure:</h3>
    <p>Name: <strong>${values.name}</strong></p>
    ${buildSalaryTableHtml(salary, values)}

    <div class="sign-block">
      <p class="sign-caption">Name and Signature, confirming acceptance of the above terms and conditions</p>
      <div class="sign-line"><span class="lbl"><strong>Signature</strong></span><span class="fill"></span></div>
      <div class="sign-line"><span class="lbl"><strong>Name</strong></span><span class="fill"></span></div>
      <div class="sign-line"><span class="lbl"><strong>Date</strong></span><span class="fill"></span></div>
    </div>

    <p class="regards-line"><span class="regards-label">Regards</span><br><strong>${COMPANY.name}</strong></p>
    <img class="stamp-img" src="${COMPANY.stampImage}" alt="Company stamp and signature">
  `, false, 4, 4);
}

function buildLetterPages(values, salary) {
  return [
    buildPage1(values, salary),
    buildPage2(values, salary),
    buildPage3(values),
    buildPage4(values, salary),
  ].join('');
}

/* ----------------------------------------------------------------------- *
 * GENERATE / DISPLAY
 * ----------------------------------------------------------------------- */
function exitEditMode() {
  getElement('letterOutput').classList.remove('editing');
  getElement('editHint').classList.remove('show');
  const editBtn = getElement('editBtn');
  editBtn.classList.remove('active');
  editBtn.innerHTML = '&#9998; Edit Letter';
  document.querySelectorAll('#letterOutput .page-body').forEach((el) => {
    el.setAttribute('contenteditable', 'false');
  });
}

function displayLetter(letterHtml) {
  getElement('letterOutput').innerHTML = letterHtml;
  getElement('letterOutput').classList.add('show');
  getElement('letterEmpty').style.display = 'none';
  getElement('previewStatus').textContent = 'Generated ✓ (4 pages)';
  exitEditMode();
  getElement('editBtn').disabled = false;
  getElement('emailBtn').disabled = false;
  getElement('saveBtn').disabled = false;
}

function handleGenerateClick() {
  if (!checkRequiredFieldsInSequence()) return;
  const values = readFormValues();
  if (!formValuesAreValid(values)) return;
  const salary = calculateSalaryBreakdown(values.annualCtc);
  const letterHtml = buildLetterPages(values, salary);
  displayLetter(letterHtml);
}

function checkRequiredFieldsInSequence() {
  const requiredFieldIdsInOrder = [
    'empName', 'doj', 'letterDate', 'jobTitle',
    'department', 'annualCtc', 'noticePeriod',
  ];
  for (let i = 0; i < requiredFieldIdsInOrder.length; i++) {
    const el = getElement(requiredFieldIdsInOrder[i]);
    if (!el) continue;
    if (!el.value || !el.value.trim()) {
      el.setCustomValidity('Please fill this field');
      el.reportValidity();
      el.focus();
      return false;
    }
    el.setCustomValidity('');
  }
  return true;
}

/* ----------------------------------------------------------------------- *
 * PDF EXPORT
 * ----------------------------------------------------------------------- */
const PX_TO_MM = 25.4 / 96;

async function handlePrintClick() {
  const letterHasBeenGenerated = getElement('letterOutput').classList.contains('show');
  if (!letterHasBeenGenerated) {
    alert('Generate the offer letter first.');
    return;
  }
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    alert('The PDF library failed to load — check your internet connection and reload the page, then try again.');
    return;
  }

  const printButton = getElement('printBtn');
  const nameForFile = (getElement('empName').value.trim() || 'Offer_Letter').replace(/\s+/g, '_');
  const pageEls = Array.from(document.querySelectorAll('#letterOutput .page'));

  if (pageEls.length === 0) {
    alert('Nothing to export — generate the letter first.');
    return;
  }

  printButton.disabled = true;
  printButton.textContent = 'Preparing PDF...';

  const RENDER_SCALE = 1;
  const { jsPDF } = window.jspdf;
  let pdf = null;

  try {
    for (let i = 0; i < pageEls.length; i++) {
      const pageEl = pageEls[i];
      const canvas = await html2canvas(pageEl, {
        scale: RENDER_SCALE,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      const widthMm = (canvas.width / RENDER_SCALE) * PX_TO_MM;
      const heightMm = (canvas.height / RENDER_SCALE) * PX_TO_MM;
      const imgData = canvas.toDataURL('image/png', 0.7);

      if (!pdf) {
        pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [widthMm, heightMm] });
        pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
      } else {
        pdf.addPage([widthMm, heightMm], 'portrait');
        pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
      }
    }
    pdf.save(`${nameForFile}_Offer_Letter.pdf`);
  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('Something went wrong generating the PDF.\n\nDetails: ' + (err && err.message ? err.message : err) + '\n\n(Full error also logged to the browser console — F12.)');
  } finally {
    printButton.disabled = false;
    printButton.textContent = 'Download as PDF';
  }
}

/* ----------------------------------------------------------------------- *
 * EDIT LETTER
 * ----------------------------------------------------------------------- */
function handleEditClick() {
  const letterHasBeenGenerated = getElement('letterOutput').classList.contains('show');
  if (!letterHasBeenGenerated) {
    alert('Generate the offer letter first.');
    return;
  }

  const output = getElement('letterOutput');
  const editBtn = getElement('editBtn');
  const nowEditing = !output.classList.contains('editing');

  output.classList.toggle('editing', nowEditing);
  getElement('editHint').classList.toggle('show', nowEditing);
  document.querySelectorAll('#letterOutput .page-body').forEach((el) => {
    el.setAttribute('contenteditable', nowEditing ? 'true' : 'false');
  });

  editBtn.classList.toggle('active', nowEditing);
  editBtn.innerHTML = nowEditing ? '&#10003; Done Editing' : '&#9998; Edit Letter';
}

/* ----------------------------------------------------------------------- *
 * EMAIL LETTER
 * ----------------------------------------------------------------------- */
async function handleEmailClick() {
  const letterHasBeenGenerated = getElement('letterOutput').classList.contains('show');
  if (!letterHasBeenGenerated) {
    alert('Generate the offer letter first.');
    return;
  }
  const emailInput = getElement('emailInput');
  const recipient = emailInput.value.trim();
  if (!recipient || !emailInput.checkValidity()) {
    alert('Enter a valid recipient email address.');
    emailInput.focus();
    return;
  }
  const name = getElement('empName').value.trim() || 'Candidate';
  const jobTitle = getElement('jobTitle').value.trim() || 'the offered role';
  const dojFormatted = formatDateMonthFirst(getElement('doj').value);
  let workLocation = getElement('workLocation').value;
  if (workLocation === '__custom') {
    workLocation = getElement('customLocation').value.trim();
  }

  const emailBtn = getElement('emailBtn');
  emailBtn.disabled = true;
  const originalLabel = emailBtn.innerHTML;
  emailBtn.innerHTML = 'Sending...';

  try {
    const pdfBlob = await buildLetterPdfBlob();

    const formData = new FormData();
    formData.append('recipient', recipient);
    formData.append('candidateName', name);
    formData.append('jobTitle', jobTitle);
    formData.append('doj', dojFormatted);
    formData.append('workLocation', workLocation);
    formData.append('pdf', pdfBlob, `${name.replace(/\s+/g, '_')}_Offer_Letter.pdf`);

    const response = await fetch('https://offerletter-generator-1.onrender.com/api/send-offer', {
      method: 'POST',
      headers: {
        'x-api-key': 'uxinterfacely 01',
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    alert(`Offer letter sent to ${recipient}.`);
  } catch (err) {
    console.error('Email send failed:', err);
    alert('Could not send the email.\n\nDetails: ' + (err && err.message ? err.message : err));
  } finally {
    emailBtn.disabled = false;
    emailBtn.innerHTML = originalLabel;
  }
}

async function handleSaveClick() {
  const name = getElement('empName').value.trim() || 'Candidate';
  const jobTitle = getElement('jobTitle').value.trim() || 'the offered role';
  const recipientEmail = getElement('emailInput').value.trim();

  const saveBtn = getElement('saveBtn');
  saveBtn.disabled = true;
  const originalLabel = saveBtn.innerHTML;
  saveBtn.innerHTML = 'Saving...';

  try {
    const pdfBlob = await buildLetterPdfBlob();

    const formData = new FormData();
    formData.append('candidateName', name);
    formData.append('jobTitle', jobTitle);
    if (recipientEmail) {
      formData.append('recipientEmail', recipientEmail);
    }
    formData.append('pdf', pdfBlob, `${name.replace(/\s+/g, '_')}_Offer_Letter.pdf`);

    const response = await fetch('https://offerletter-generator-1.onrender.com/api/save-offer', {
      method: 'POST',
      headers: {
        'x-api-key': 'uxinterfacely 01',
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to save offer letter');
    }

    alert(`Offer letter saved for ${name}.`);
  } catch (err) {
    console.error('Save failed:', err);
    alert('Could not save the offer letter.\n\nDetails: ' + (err && err.message ? err.message : err));
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalLabel;
  }
}

async function buildLetterPdfBlob() {
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    throw new Error('The PDF library failed to load — check your internet connection and reload the page.');
  }
  const pageEls = Array.from(document.querySelectorAll('#letterOutput .page'));
  if (pageEls.length === 0) {
    throw new Error('Nothing to export — generate the letter first.');
  }
  const RENDER_SCALE = 1;
  const { jsPDF } = window.jspdf;
  let pdf = null;
  for (let i = 0; i < pageEls.length; i++) {
    const pageEl = pageEls[i];
    const canvas = await html2canvas(pageEl, {
      scale: RENDER_SCALE,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });
    const widthMm = (canvas.width / RENDER_SCALE) * PX_TO_MM;
    const heightMm = (canvas.height / RENDER_SCALE) * PX_TO_MM;
    const imgData = canvas.toDataURL('image/jpeg', 0.7);
    if (!pdf) {
      pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [widthMm, heightMm] });
      pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm);
    } else {
      pdf.addPage([widthMm, heightMm], 'portrait');
      pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm);
    }
  }
  return pdf.output('blob');
}

function setupRadioToggle(radioName, fieldsId) {
  const radios = document.querySelectorAll(`input[name="${radioName}"]`);
  const fields = getElement(fieldsId);
  if (!radios.length || !fields) return;

  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked && radio.value === 'yes') {
        fields.classList.add('show');
      } else if (radio.checked && radio.value === 'no') {
        fields.classList.remove('show');
      }
    });
  });
}

safeSetup('variable pay radio toggle', () => setupRadioToggle('variablePayToggleRadio', 'variablePayToggleFields'));
safeSetup('pf radio toggle', () => setupRadioToggle('pfRadio', 'pfFields'));
safeSetup('tds radio toggle', () => setupRadioToggle('tdsRadio', 'tdsFields'));

safeSetup('generateBtn click listener', () => {
  getElement('generateBtn').addEventListener('click', handleGenerateClick);
});
safeSetup('printBtn click listener', () => {
  getElement('printBtn').addEventListener('click', handlePrintClick);
});
safeSetup('editBtn click listener', () => {
  getElement('editBtn').addEventListener('click', handleEditClick);
});
safeSetup('emailBtn click listener', () => {
  getElement('emailBtn').addEventListener('click', handleEmailClick);
});
safeSetup('saveBtn click listener', () => {
  getElement('saveBtn').addEventListener('click', handleSaveClick);
});

safeSetup('live PF auto-calc', () => {
  const recalc = () => {
    const ctc = parseFloat(getElement('annualCtc').value) || 0;
    calculateSalaryBreakdown(ctc);
  };

  const ctcInput = getElement('annualCtc');
  if (ctcInput) ctcInput.addEventListener('input', recalc);

  document.querySelectorAll('input[name="pfRadio"]').forEach((radio) => {
    radio.addEventListener('change', recalc);
  });
});

safeSetup('fill-first validation on blur', () => {
  const requiredFieldIds = [
    'empName', 'doj', 'letterDate', 'jobTitle',
    'department', 'annualCtc', 'noticePeriod',
  ];
  requiredFieldIds.forEach((id) => {
    const el = getElement(id);
    if (!el) return;
    el.addEventListener('blur', () => {
      if (!el.value || !el.value.trim()) {
        el.setCustomValidity('Please fill this first');
        el.reportValidity();
      } else {
        el.setCustomValidity('');
      }
    });
    el.addEventListener('input', () => {
      el.setCustomValidity('');
    });
  });
});

safeSetup('input character restrictions', () => {
  function restrictToAlphabets(elementId) {
    const el = getElement(elementId);
    if (!el) return;
    el.addEventListener('input', () => {
      el.value = el.value.replace(/[^A-Za-z\s]/g, '');
    });
  }
  function restrictToNumbers(elementId) {
    const el = getElement(elementId);
    if (!el) return;
    el.addEventListener('input', () => {
      el.value = el.value.replace(/[^0-9]/g, '');
    });
  }

  restrictToAlphabets('empName');
  restrictToAlphabets('customLocation');

  restrictToNumbers('annualCtc');
  restrictToNumbers('noticePeriod');
  restrictToNumbers('variablePayToggleAmount');
  restrictToNumbers('tdsAmount');
  restrictToNumbers('bondYears');
  restrictToNumbers('bondAmount');
});
