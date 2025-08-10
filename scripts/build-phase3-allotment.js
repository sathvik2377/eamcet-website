const fs = require('fs');
const path = require('path');

// Build Phase 3 allotment JSON from CSV folder structure
function buildPhase3Allotment() {
  const baseDir = path.join(process.cwd(), '2025 phase 3 data');
  const outFile = path.join(process.cwd(), 'data', '2025-phase3-allotment-data.json');

  if (!fs.existsSync(baseDir)) {
    console.error('Missing folder: 2025 phase 3 data');
    process.exit(1);
  }

  const dirents = fs.readdirSync(baseDir, { withFileTypes: true });
  const colleges = dirents.filter(d => d.isDirectory());

  const result = {};
  let totalStudents = 0;

  for (const col of colleges) {
    const collegeDirName = col.name; // e.g., ACEG_A_C_E_ENGINEERING_COLLEGE_AUTONOMOUS_GHATKESAR
    const [collegeCode, ...nameParts] = collegeDirName.split('_');
    const collegeName = nameParts.join(' ').replace(/\s+/g, ' ').trim();

    const collegePath = path.join(baseDir, collegeDirName);
    const files = fs.readdirSync(collegePath).filter(f => f.toLowerCase().endsWith('.csv'));

    if (!result[collegeCode]) result[collegeCode] = {};

    for (const file of files) {
      const branchName = file.replace(/\.csv$/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      const csv = fs.readFileSync(path.join(collegePath, file), 'utf8');
      const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length <= 1) {
        result[collegeCode][branchName] = [];
        continue;
      }
      const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const rows = lines.slice(1);
      const students = [];
      for (const row of rows) {
        const parsed = parseCSV(row);
        if (parsed.length < header.length) continue;
        const rec = {};
        header.forEach((h, idx) => rec[h] = (parsed[idx] || '').replace(/"/g, '').trim());
        // Normalize keys to expected fields
        const out = {
          sno: rec.sno || rec.SNO || rec.index || '',
          hallticketno: rec.hallticketno || rec.hallticket || rec.htno || '',
          rank: rec.rank || rec.RANK || '',
          name: rec.name || rec.candidate || '',
          sex: rec.sex || rec.gender || '',
          caste: rec.caste || rec.category || '',
          region: rec.region || rec.loc || '',
          seatcategory: rec.seatcategory || rec.seat || rec.allotted || '',
          college: collegeCode,
          collegeName,
          branch: branchName,
        };
        students.push(out);
      }
      result[collegeCode][branchName] = students;
      totalStudents += students.length;
    }
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(`✅ Wrote ${outFile}`);
  console.log(`📊 Colleges: ${Object.keys(result).length}`);
  const branches = Object.values(result).reduce((acc, branches) => acc + Object.keys(branches).length, 0);
  console.log(`📊 Branch sets: ${branches}`);
  console.log(`👥 Students: ${totalStudents}`);
}

function parseCSV(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

if (require.main === module) {
  buildPhase3Allotment();
}

module.exports = { buildPhase3Allotment };
