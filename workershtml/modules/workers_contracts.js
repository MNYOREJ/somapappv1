import { dbRefs, localTs } from './workers_helpers.js';
import { ensureHtml2Pdf } from './workers_ui.js';

export const CONTRACT_LANGUAGE_BY_ROLE = {
  teacher: 'en',
  accountant: 'en',
  manager: 'en',
  academic: 'en',
  secretary: 'en',
  hr: 'en',
  admin: 'en',
  driver: 'sw',
  cook: 'sw',
  cleaner: 'sw',
  guard: 'sw',
  storekeeper: 'en'
};

const TEMPLATE_BY_ROLE = {
  driver: 'driver',
  cook: 'cook',
  cleaner: 'cleaner',
  guard: 'guard',
  teacher: 'teacher',
  accountant: 'accountant',
  manager: 'manager',
  academic: 'academic',
  secretary: 'secretary',
  hr: 'secretary',
  storekeeper: 'manager'
};

const EN_TEMPLATE = ({ fullName, roleLabel, baseSalary, dayStart = '07:20' }) => `
  <section style="font-family: 'Segoe UI', Arial, sans-serif; padding:24px; max-width:720px; margin:auto; line-height:1.6;">
    <header style="text-align:center; margin-bottom:24px;">
      <h1 style="margin:0; font-size:24px;">SoMAp Workers Contract</h1>
      <p style="margin:4px 0 0; font-size:14px;">Employment Agreement</p>
    </header>
    <article>
      <p>This employment agreement is entered between <strong>SoMAp Schools</strong> and <strong>${fullName}</strong> (the €œWorker€) for the role of <strong>${roleLabel}</strong>.</p>
      <h2 style="font-size:18px;">1. Term & Duties</h2>
      <p>The Worker shall report daily before <strong>${dayStart}</strong> (Africa/Nairobi). Duties include diligent fulfilment of assigned tasks, reporting variances, and safeguarding school resources.</p>
      <h2 style="font-size:18px;">2. Working Hours & Attendance</h2>
      <p>Daily attendance is logged via the SoMAp Workers Hub. Late arrival occurs if check-in happens after <strong>${dayStart}</strong>. The second, fourth, sixth (even) lateness in a month incurs a <strong>0.001 Ã— base salary</strong> deduction.</p>
      <h2 style="font-size:18px;">3. Compensation</h2>
      <p>Monthly base salary: <strong>${Number(baseSalary).toLocaleString('en-US')} TZS</strong>. Deductions include statutory contributions (NSSF, WCF, PAYE as applicable) and approved penalties. Payslips are available through the Workers Hub.</p>
      <h2 style="font-size:18px;">4. Leave & Benefits</h2>
      <p>Sick and general leave are limited to three (3) requests every rolling ninety (90) days unless proof is provided. Additional leave types follow the SoMAp policy and require approval.</p>
      <h2 style="font-size:18px;">5. Conduct & Compliance</h2>
      <p>The Worker agrees to maintain integrity, report incidents immediately, and respect school property. Breaches may lead to disciplinary action, penalties, or contract termination.</p>
      <h2 style="font-size:18px;">6. Acceptance</h2>
      <p>By digitally signing below, the Worker acknowledges reading and accepting the terms, including attendance rules and penalty patterns.</p>
    </article>
    <section style="margin-top:32px;">
      <p>Worker Signature: _____________________________</p>
      <p>Date: ________________________________________</p>
    </section>
  </section>
`;

const SW_TEMPLATE = ({ fullName, roleLabel, baseSalary, dayStart = '07:20' }) => `
  <section style="font-family: 'Segoe UI', Arial, sans-serif; padding:24px; max-width:720px; margin:auto; line-height:1.6;">
    <header style="text-align:center; margin-bottom:24px;">
      <h1 style="margin:0; font-size:24px;">Mkataba wa Mfanyakazi - SoMAp</h1>
      <p style="margin:4px 0 0; font-size:14px;">Makubaliano ya Ajira</p>
    </header>
    <article>
      <p>Mkataba huu ni kati ya <strong>SoMAp Schools</strong> na <strong>${fullName}</strong> (€œMfanyakazi€) kwa kazi ya <strong>${roleLabel}</strong>.</p>
      <h2 style="font-size:18px;">1. Majukumu</h2>
      <p>Mfanyakazi atahudhuria kazini kabla ya <strong>${dayStart}</strong> (saa za Africa/Nairobi) kila siku ya kazi, kutekeleza majukumu kwa bidii na kuripoti tofauti mara moja.</p>
      <h2 style="font-size:18px;">2. Mahudhurio</h2>
      <p>Kuchelewa ni kuingia baada ya <strong>${dayStart}</strong>. Kila uchelewaji wa pili, wa nne, wa sita (sawa) ndani ya mwezi utakata <strong>0.001 Ã— mshahara wa msingi</strong>.</p>
      <h2 style="font-size:18px;">3. Malipo</h2>
      <p>Mshahara wa msingi kwa mwezi: <strong>${Number(baseSalary).toLocaleString('sw-TZ')} TZS</strong>. Punguzo ni michango ya lazima (NSSF, WCF, PAYE) na adhabu zilizoidhinishwa.</p>
      <h2 style="font-size:18px;">4. Likizo</h2>
      <p>Likizo ya ugonjwa na ya kawaida ni hadi mara tatu (3) kwa siku tisini (90) mfululizo bila ushahidi. Likizo nyingine zinahitaji idhini.</p>
      <h2 style="font-size:18px;">5. Nidhamu</h2>
      <p>Mfanyakazi atatunza mali za shule, ataepuka wizi, na atazingatia kanuni za SoMAp. Ukiukaji unaweza kusababisha hatua za nidhamu au kusitisha mkataba.</p>
      <h2 style="font-size:18px;">6. Kukubali</h2>
      <p>Kwa kusaini kidigitali, Mfanyakazi anakubali masharti haya pamoja na kanuni za uchelewaji na makato ya mishahara.</p>
    </article>
    <section style="margin-top:32px;">
      <p>Sahihi ya Mfanyakazi: _____________________________</p>
      <p>Tarehe: _________________________________________</p>
    </section>
  </section>
`;

export function defaultContractLanguage(role) {
  const lang = CONTRACT_LANGUAGE_BY_ROLE[(role || '').toLowerCase()];
  return lang || 'sw';
}

export function templateKeyForRole(role) {
  return TEMPLATE_BY_ROLE[(role || '').toLowerCase()] || 'general';
}

function roleLabel(role) {
  const labels = {
    driver: 'Driver',
    cook: 'Cook',
    cleaner: 'Cleaner',
    guard: 'Security Guard',
    teacher: 'Teacher',
    accountant: 'Accountant',
    manager: 'Manager',
    academic: 'Academic Staff',
    secretary: 'Secretary',
    hr: 'Human Resources',
    storekeeper: 'Storekeeper'
  };
  return labels[(role || '').toLowerCase()] || role || 'Worker';
}

function buildContractHtml(profile, { language }) {
  const templateArgs = {
    fullName: profile.fullNameUpper || `${profile.firstName} ${profile.lastName}`.toUpperCase(),
    roleLabel: roleLabel(profile.role),
    baseSalary: profile.baseSalary || 0,
    dayStart: '07:20'
  };
  return language === 'en' ? EN_TEMPLATE(templateArgs) : SW_TEMPLATE(templateArgs);
}

export async function generateContractPdf(workerId, profile, { language, templateKey }) {
  await ensureHtml2Pdf();
  const lang = language || defaultContractLanguage(profile.role);
  const html = buildContractHtml(profile, { language: lang });

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '-9999px';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  const fileName = `${profile.fullNameUpper || workerId}-contract-${lang}.pdf`;
  const pdfBlob = await window.html2pdf().set({
    margin: 10,
    filename: fileName,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(wrapper).toPdf().output('blob');

  wrapper.remove();

  const storageRef = firebase.storage().ref(`contracts/${workerId}/${fileName}`);
  await storageRef.put(pdfBlob, { contentType: 'application/pdf' });
  const downloadUrl = await storageRef.getDownloadURL();

  await dbRefs.workerContract(workerId).update({
    language: lang,
    templateKey: templateKey || templateKeyForRole(profile.role),
    accepted: true,
    acceptedTs: localTs(),
    contractPdfUrl: downloadUrl
  });

  return downloadUrl;
}

export async function resetContractAcceptance(workerId) {
  await dbRefs.workerContract(workerId).update({
    accepted: false,
    acceptedTs: 0,
    contractPdfUrl: ''
  });
}


