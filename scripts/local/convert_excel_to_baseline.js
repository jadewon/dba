/**
 * DB grants 엑셀 파일을 baseline JSON으로 변환하는 스크립트
 *
 * 사용법: node scripts/local/convert_excel_to_baseline.js [엑셀파일경로]
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DEFAULT_EXCEL_PATH = path.join(process.env.HOME, 'Downloads', 'DB grants.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../../config/baseline_accounts.json');

function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const result = {
    metadata: {
      source: path.basename(filePath),
      generatedAt: new Date().toISOString(),
      version: '1.0'
    },
    databases: {}
  };

  workbook.SheetNames.forEach(sheetName => {
    // hidden 시트 및 계정쿼리 시트 제외
    if (sheetName.includes('deleted') ||
        sheetName.includes('펑') ||
        sheetName.includes('폭파') ||
        sheetName === '계정쿼리' ||
        sheetName.startsWith('archive') ||
        sheetName.startsWith('hlabs')) {
      return;
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (jsonData.length === 0) return;

    // DB 이름 정규화 (시트명에서 추출)
    const dbName = normalizeDbName(sheetName);

    // 계정 정보 파싱
    const accounts = jsonData
      .filter(row => row.User && row.User.trim())
      .map(row => ({
        user: String(row.User || '').trim(),
        hosts: String(row.Hosts || '%').trim(),
        type: normalizeType(row.Type),
        hasGrant: parseBoolean(row['has Grant']),
        etc: String(row.Etc || '').trim()
      }))
      .filter(account => account.user && !isSystemAccount(account.user));

    if (accounts.length > 0) {
      result.databases[dbName] = {
        sheetName: sheetName,
        environment: sheetName.includes('DEV') ? 'DEV' : 'PROD',
        accounts: accounts
      };
    }
  });

  return result;
}

function normalizeDbName(sheetName) {
  // 시트명에서 DB 식별자 추출
  // 예: "PROD booking-prd rds" -> "booking-prd"
  // 예: "DEV#304813450316 onda-dev (Auro" -> "onda-dev"

  let name = sheetName
    .replace(/^(PROD|DEV)[\s#]*/, '')
    .replace(/\s*\(.*$/, '')
    .replace(/\s*(rds|aurora|mysql|mongodb|documentdb)$/i, '')
    .replace(/^[\d\s]+/, '')
    .trim();

  return name || sheetName;
}

function normalizeType(type) {
  if (!type) return 'unknown';

  const typeStr = String(type).toLowerCase().trim();

  if (typeStr === 'dba') return 'dba';
  if (typeStr === 'monitor') return 'monitor';
  if (typeStr === 'read') return 'read';
  if (typeStr === 'write') return 'write';
  if (typeStr === 'service') return 'service';
  if (typeStr === 'developer') return 'developer';
  if (typeStr === 'replication') return 'replication';
  if (typeStr === 'migrator') return 'migrator';
  if (typeStr === 'test') return 'test';

  return typeStr || 'unknown';
}

function parseBoolean(value) {
  if (value === true || value === 'Y' || value === 'TRUE' || value === 1) return true;
  if (value === false || value === 'N' || value === 'FALSE' || value === 0) return false;
  return false;
}

function isSystemAccount(user) {
  const systemAccounts = ['root', 'admin', 'mysql.sys', 'mysql.session', 'mysql.infoschema'];
  return systemAccounts.includes(user.toLowerCase());
}

function main() {
  const excelPath = process.argv[2] || DEFAULT_EXCEL_PATH;

  if (!fs.existsSync(excelPath)) {
    console.error(`엑셀 파일을 찾을 수 없습니다: ${excelPath}`);
    process.exit(1);
  }

  console.log(`엑셀 파일 읽는 중: ${excelPath}`);

  const baseline = parseExcel(excelPath);

  // 출력 디렉토리 생성
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // JSON 파일 저장
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(baseline, null, 2), 'utf8');

  console.log(`baseline JSON 생성 완료: ${OUTPUT_PATH}`);
  console.log(`\n변환된 DB 목록:`);

  Object.entries(baseline.databases).forEach(([dbName, info]) => {
    console.log(`  - ${dbName} (${info.environment}): ${info.accounts.length}개 계정`);
  });
}

main();
