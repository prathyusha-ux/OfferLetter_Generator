function getElement(id) {
  return document.getElementById(id);
}
function formatRupees(amount) {
  const roundedAmount = Math.round(amount);
  return roundedAmount.toLocaleString('en-IN');
}
function formatDate(isoDateString) {
  if (!isoDateString) return '';
  const date = new Date(isoDateString + 'T00:00:00');
  const dayOfMonth = date.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daySuffix = getDaySuffix(dayOfMonth);
  const monthName = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${monthName} ${dayOfMonth}${daySuffix}, ${year}`;
}
function getDaySuffix(day) {
  const isTeen = (day % 100 >= 11 && day % 100 <= 13);
  if (isTeen) return 'th';
  const lastDigit = day % 10;
  if (lastDigit === 1) return 'st';
  if (lastDigit === 2) return 'nd';
  if (lastDigit === 3) return 'rd';
  return 'th';
}

const todayISO = new Date().toISOString().slice(0, 10);
getElement('letterDate').value = todayISO;

getElement('workLocation').addEventListener('change', function () {
  const isCustom = getElement('workLocation').value === '__custom';
  getElement('customLocationField').classList.toggle('show', isCustom);
});
getElement('bondToggle').addEventListener('change', function () {
  const includeBond = getElement('bondToggle').checked;
  getElement('bondFields').classList.toggle('show', includeBond);
});

function calculateSalaryBreakdown(annualCtc, pfPercent, pfMonthlyCap, professionalTaxMonthly) {
  const ctcPerMonth = annualCtc / 12;
  const basic = Math.round(ctcPerMonth * 0.5);
  const hra = Math.round(ctcPerMonth * 0.2);
  const specialAllowance = Math.round(ctcPerMonth - basic - hra);
  const uncappedPf = Math.round(basic * (pfPercent / 100));
  const employeePf = Math.min(uncappedPf, pfMonthlyCap);
  const employerPf = employeePf;
  const totalDeductions = employeePf + employerPf + professionalTaxMonthly;
  const takeHomePerMonth = ctcPerMonth - employeePf - employerPf - professionalTaxMonthly;
  return { ctcPerMonth, basic, hra, specialAllowance, employeePf, employerPf,
           professionalTax: professionalTaxMonthly, totalDeductions, takeHomePerMonth };
}

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
    variablePay: parseFloat(getElement('variablePay').value) || 0,
    pfPercent: parseFloat(getElement('pfPct').value) || 0,
    pfCap: parseFloat(getElement('pfCap').value) || 0,
    professionalTax: parseFloat(getElement('ptMonthly').value) || 0,
    noticePeriod: parseInt(getElement('noticePeriod').value) || 0,
    includeBond: getElement('bondToggle').checked,
    bondYears: getElement('bondYears').value,
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

function buildBondSectionHtml(values) {
  if (!values.includeBond) return '';
  return `
    <h3>Service Bond Clause</h3>
    <p>The Employee agrees to remain in the employment of the Company for a minimum period of ${values.bondYears} year(s) from the date of joining. This commitment is made considering the Company's investment in recruitment, training, onboarding, and skill development. In the event that the Employee voluntarily resigns or discontinues employment before completing the agreed service period, the Employee shall reimburse the Company an amount of ₹${formatRupees(values.bondAmount)} towards the costs incurred by the Company for recruitment, training, and related administrative expenses.</p>
  `;
}

function buildSalaryTableHtml(salary, values) {
  const variableRow = values.variablePay
    ? `<tr><td>Variable Pay</td><td class="num">—</td><td class="num">${formatRupees(values.variablePay)}</td></tr>`
    : '';
  return `
    <table class="salary-table">
      <thead>
        <tr><th>Component</th><th class="num">Monthly (₹)</th><th class="num">Yearly (₹)</th></tr>
      </thead>
      <tbody>
        <tr><td>Basic</td><td class="num">${formatRupees(salary.basic)}</td><td class="num">${formatRupees(salary.basic * 12)}</td></tr>
        <tr><td>House Rent Allowance (HRA)</td><td class="num">${formatRupees(salary.hra)}</td><td class="num">${formatRupees(salary.hra * 12)}</td></tr>
        <tr><td>Special Allowance</td><td class="num">${formatRupees(salary.specialAllowance)}</td><td class="num">${formatRupees(salary.specialAllowance * 12)}</td></tr>
        <tr class="subhead"><td>Total CTC</td><td class="num">${formatRupees(salary.ctcPerMonth)}</td><td class="num">${formatRupees(values.annualCtc)}</td></tr>
        ${variableRow}
        <tr class="subhead"><td colspan="3">Deductions</td></tr>
        <tr><td>PF – Employee</td><td class="num">${formatRupees(salary.employeePf)}</td><td class="num">${formatRupees(salary.employeePf * 12)}</td></tr>
        <tr><td>PF – Employer</td><td class="num">${formatRupees(salary.employerPf)}</td><td class="num">${formatRupees(salary.employerPf * 12)}</td></tr>
        <tr><td>Professional Tax</td><td class="num">${formatRupees(salary.professionalTax)}</td><td class="num">${formatRupees(salary.professionalTax * 12)}</td></tr>
        <tr class="subhead"><td>Total Deductions</td><td class="num">${formatRupees(salary.totalDeductions)}</td><td class="num">${formatRupees(salary.totalDeductions * 12)}</td></tr>
        <tr class="total"><td>Take Home</td><td class="num">${formatRupees(salary.takeHomePerMonth)}</td><td class="num">${formatRupees(salary.takeHomePerMonth * 12)}</td></tr>
      </tbody>
    </table>
    <p class="letter-foot-note">#Indicative Performance Pay may vary depending on individual and company performance. *Totals may mismatch by up to ₹10 due to rounding.</p>
  `;
}

function buildLetterHtml(values, salary) {
  const variableLine = values.variablePay
    ? ` and ₹${formatRupees(values.variablePay)} variable pay, which is entirely performance-dependent`
    : '';
  return `
    <div class="letter-sheet">
      <div class="letter-title">Offer Letter</div>
      <p>Dear <strong>${values.name}</strong>,</p>
      <p><strong>Date of Joining:</strong> ${formatDate(values.doj)}</p>
      <p>This statement dated ${formatDate(values.letterDate)} sets out details of the main terms of your employment with UX Interfacely IT Solutions LLP, Hyderabad.</p>
      <p>UX Interfacely IT Solutions LLP is pleased to offer you appointment as <strong>${values.jobTitle}</strong>. We trust that your knowledge, skills and experience will be among our most valuable assets.</p>
      <h3>Job Title</h3>
      <p>The title of the job that you are employed to do is: <strong>${values.jobTitle}</strong>. This position will be in the Company's ${values.department} department. ${values.roleDesc}</p>
      <h3>Hours and Place of Work</h3>
      <p>You shall be based in our ${values.workLocation}, but may be required to serve the Company in any place within or outside India, as required.</p>
      <h3>Salary</h3>
      <p>Your annual remuneration will be ₹${formatRupees(values.annualCtc)} per annum${variableLine}. Salary structure may be altered or modified at any time without prior notice and is strictly confidential.</p>
      <h3>Detailed Salary Structure</h3>
      ${buildSalaryTableHtml(salary, values)}
      <h3>Termination or Resignation</h3>
      <p>Employment may be terminated by either party by serving ${values.noticePeriod} days' written notice to the other party, subject to the Company's Employee Separation Policy.</p>
      ${buildBondSectionHtml(values)}
      <div class="sign-block">
        <p style="margin-bottom:14px;"><strong>Name and Signature, confirming acceptance of the above terms and conditions</strong></p>
        <div class="sign-line"><span class="lbl">Signature</span><span class="fill"></span></div>
        <div class="sign-line"><span class="lbl">Name</span><span class="fill">${values.name}</span></div>
        <div class="sign-line"><span class="lbl">Date</span><span class="fill"></span></div>
      </div>
      <p style="margin-top:24px;">Regards,<br><strong>UX Interfacely IT Solutions LLP</strong></p>
    </div>
  `;
}

function displayLetter(letterHtml) {
  getElement('letterOutput').innerHTML = letterHtml;
  getElement('letterOutput').classList.add('show');
  getElement('letterEmpty').style.display = 'none';
  getElement('previewStatus').textContent = 'Generated ✓';
}

function handleGenerateClick() {
  const values = readFormValues();
  if (!formValuesAreValid(values)) return;
  const salary = calculateSalaryBreakdown(
    values.annualCtc, values.pfPercent, values.pfCap, values.professionalTax
  );
  const letterHtml = buildLetterHtml(values, salary);
  displayLetter(letterHtml);
}

function handlePrintClick() {
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
  const letterOutput = getElement('letterOutput');

  printButton.disabled = true;
  printButton.textContent = 'Preparing PDF...';

 
  const captureWidth = letterOutput.offsetWidth;
  const clone = letterOutput.cloneNode(true);
  clone.classList.add('show');
  clone.style.width = captureWidth + 'px';

  const offscreenContainer = document.createElement('div');
  offscreenContainer.style.position = 'fixed';
  offscreenContainer.style.top = '0';
  offscreenContainer.style.left = '-10000px';
  offscreenContainer.style.width = captureWidth + 'px';
  offscreenContainer.style.background = '#ffffff';
  offscreenContainer.appendChild(clone);
  document.body.appendChild(offscreenContainer);

  function cleanUp() {
    document.body.removeChild(offscreenContainer);
    printButton.disabled = false;
    printButton.textContent = 'Download as PDF';
  }

  const RENDER_SCALE = 2; 

  html2canvas(clone, {
    scale: RENDER_SCALE,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: true
  }).then(function (canvas) {
    
    const marginMm = 10;
    const imgWidthMm = (canvas.width / RENDER_SCALE) * pxToMm;
    const imgHeightMm = (canvas.height / RENDER_SCALE) * pxToMm;
    const pageWidthMm = imgWidthMm + (marginMm * 2);
    const pageHeightMm = imgHeightMm + (marginMm * 2);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidthMm, pageHeightMm]
    });

    const imgData = canvas.toDataURL('image/png');
    
    pdf.addImage(imgData, 'PNG', marginMm, marginMm, imgWidthMm, imgHeightMm);
    pdf.save(`${nameForFile}_Offer_Letter.pdf`);
    cleanUp();
  }).catch(function (err) {
    console.error('PDF generation failed:', err);
    alert('Something went wrong generating the PDF. Open the browser console (F12) for details.');
    cleanUp();
  });
}

getElement('generateBtn').addEventListener('click', handleGenerateClick);
getElement('printBtn').addEventListener('click', handlePrintClick);

