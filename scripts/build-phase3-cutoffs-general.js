const fs = require('fs');
const path = require('path');

function normalizeBranch(name) {
  return (name || '').toString().trim();
}

function isSpecialCategory(seatcategory = '') {
  const s = seatcategory.toUpperCase();
  return s.includes('PH') || s.includes('NCC') || s.includes('CAP');
}

function getCategory(seatcategory = '', caste = '') {
  const s = seatcategory.toUpperCase();
  if (s.includes('EWS')) return 'EWS';
  const c = (caste || '').toUpperCase();
  if (c.startsWith('BC_')) {
    // BC_A, BC_B, BC_C, BC_D, BC_E
    const code = c.split(/[^A-Z]/)[1] || c.split('_')[1] || '';
    if (['A','B','C','D','E'].includes(code)) return `BC_${code}`;
  }
  if (c.startsWith('SC')) return 'SC';
  if (c.startsWith('ST')) return 'ST';
  return 'OC';
}

function getGender(sex = '') {
  return (sex || '').toUpperCase() === 'F' ? 'Girls' : 'Boys';
}

function buildCutoffs() {
  const allotFile = path.join(process.cwd(), 'data', '2025-phase3-allotment-data.json');
  const outFile = path.join(process.cwd(), 'data', '2025-phase3-cutoffs-general.json');
  if (!fs.existsSync(allotFile)) {
    console.error('Missing data file:', allotFile);
    process.exit(1);
  }
  const allot = JSON.parse(fs.readFileSync(allotFile, 'utf8'));

  // Map: key (collegeCode||branchName) -> record
  const resultMap = new Map();
  let rows = 0;

  for (const collegeCode of Object.keys(allot)) {
    const branches = allot[collegeCode];
    for (const branchNameRaw of Object.keys(branches)) {
      const branchName = normalizeBranch(branchNameRaw);
      const students = branches[branchNameRaw] || [];

      const rec = {
        'College Code': collegeCode,
        'College Name': (students[0] && students[0].collegeName) || collegeCode,
        'Branch Name': branchName,
        'OC Boys': 'NA', 'OC Girls': 'NA',
        'EWS GEN OU': 'NA', 'EWS GIRLS': 'NA',
        'SC Boys': 'NA', 'SC Girls': 'NA',
        'ST Boys': 'NA', 'ST Girls': 'NA',
        'BC_A Boys': 'NA', 'BC_A Girls': 'NA',
        'BC_B Boys': 'NA', 'BC_B Girls': 'NA',
        'BC_C Boys': 'NA', 'BC_C Girls': 'NA',
        'BC_D Boys': 'NA', 'BC_D Girls': 'NA',
        'BC_E Boys': 'NA', 'BC_E Girls': 'NA',
      };

      const setMax = (field, rankStr) => {
        if (!rankStr) return;
        const r = parseInt(rankStr, 10);
        if (!Number.isFinite(r)) return;
        const cur = rec[field];
        if (cur === 'NA' || parseInt(cur, 10) < r) rec[field] = String(r);
      };

      for (const st of students) {
        if (!st) continue;
        if (isSpecialCategory(st.seatcategory)) continue; // exclude PH, NCC, CAP
        const cat = getCategory(st.seatcategory, st.caste);
        const gender = getGender(st.sex);
        const field = (cat === 'EWS') ? (gender === 'Girls' ? 'EWS GIRLS' : 'EWS GEN OU') : `${cat} ${gender}`;
        setMax(field, st.rank);
        rows++;
      }

      resultMap.set(`${collegeCode}||${branchName}`, rec);
    }
  }

  const out = Array.from(resultMap.values());
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`✅ Wrote ${outFile} with ${out.length} rows from ${rows} filtered allotments`);
}

if (require.main === module) buildCutoffs();

module.exports = { buildCutoffs };

