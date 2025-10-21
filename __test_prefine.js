const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('preformonehtml/prefonefinance.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true });
const { window } = dom;
window.firebase = {
  apps: [],
  initializeApp() { this.apps.push({}); },
  database() {
    return {
      ref() {
        return {
          once: () => Promise.resolve({ val: () => ({}) })
        };
      }
    };
  }
};
window.Swal = { fire: (...args) => console.log('Swal', args) };
window.URL.createObjectURL = () => 'blob:';
window.Blob = function(){};
window.Papa = { unparse: data => JSON.stringify(data) };
window.jspdf = { jsPDF: function() { return { text: () => {}, autoTable: () => {}, save: () => {} }; } };
window.document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded triggered');
});
setTimeout(() => {
  console.log('financeData length', window.financeData && window.financeData.length);
  console.log('showingDebtors', window.showingDebtors);
}, 200);
