#!/usr/bin/env node
/**
 * 월간 DB 계정 변경사항 집계 스크립트
 *
 * - changes/YYYY-MM-*.json 파일들을 읽어서 집계
 * - API payload 형식으로 변환하여 diff_result.json 생성
 *
 * Usage: node aggregate_and_call.js [YYYY-MM]
 *        인자 없으면 이전 달 기준
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const CHANGES_DIR = path.join(ROOT_DIR, 'changes');
const OUTPUT_FILE = path.join(ROOT_DIR, 'diff_result.json');

// 전체 DB 목록 (14개)
const ALL_DATABASES = [
  'DB (onda-aurora-cluster)',
  'DB (onda-standard-property)',
  'DB (onda-sms)',
  'DB (b2e-rds-prd-cluster)',
  'DB (auth-cluster)',
  'DB (onda-plus-cluster)',
  'DB (onda-backoffice)',
  'DB (booking-prd)',
  'DB (obs-system)',
  'DB (cms-cde-reservaion-api)',
  'DB (onda-voucher)',
  'DocumentDB (EVCMS)',
  'Atlas (onda-notification)',
  'Atlas (vendor)'
];

function getTargetMonth() {
  const arg = process.argv[2];
  if (arg && /^\d{4}-\d{2}$/.test(arg)) {
    return arg;
  }

  // 이전 달 계산
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function loadChangeFiles(targetMonth) {
  const pattern = new RegExp(`^${targetMonth}-\\d{2}\\.json$`);
  const files = [];

  if (!fs.existsSync(CHANGES_DIR)) {
    console.log(`changes 디렉토리가 없습니다: ${CHANGES_DIR}`);
    return files;
  }

  const entries = fs.readdirSync(CHANGES_DIR);
  for (const entry of entries) {
    if (pattern.test(entry)) {
      const filePath = path.join(CHANGES_DIR, entry);
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        files.push({ date: entry.replace('.json', ''), changes: content });
        console.log(`로드됨: ${entry}`);
      } catch (err) {
        console.error(`파일 파싱 실패: ${entry}`, err.message);
      }
    }
  }

  return files.sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateChanges(files) {
  const dbChanges = new Map();

  for (const file of files) {
    for (const db of file.changes) {
      const dbName = db.name;
      if (!dbChanges.has(dbName)) {
        dbChanges.set(dbName, []);
      }

      for (const action of db.actions) {
        dbChanges.get(dbName).push({
          date: file.date,
          ...action
        });
      }
    }
  }

  return dbChanges;
}

function formatActionDescription(action) {
  switch (action.type) {
    case 'permissionChange':
      return `${action.account} 권한 변경: ${action.from} → ${action.to}`;
    case 'deleteAccount':
      return `${action.account} 계정 삭제`;
    case 'createAccount':
      return `${action.account} 계정 생성${action.note ? ` (${action.note})` : ''}`;
    case 'other':
      return `${action.account}: ${action.note || '기타 작업'}`;
    default:
      return `${action.account}: ${action.type}`;
  }
}

function buildPayload(targetMonth, dbChanges) {
  const changedDbs = Array.from(dbChanges.keys());
  const unchangedDbs = ALL_DATABASES.filter(db => !changedDbs.includes(db));

  // summary.changes 생성
  const summaryChanges = [];
  for (const [dbName, actions] of dbChanges) {
    for (const action of actions) {
      summaryChanges.push({
        database: dbName,
        date: action.date,
        description: formatActionDescription(action)
      });
    }
  }

  // details 생성
  const details = [];
  for (const dbName of ALL_DATABASES) {
    const actions = dbChanges.get(dbName) || [];
    details.push({
      database: dbName,
      status: actions.length > 0 ? 'changed' : 'no_change',
      actions: actions.map(a => ({
        date: a.date,
        type: a.type,
        description: formatActionDescription(a)
      }))
    });
  }

  // conclusion 생성
  let conclusion = `${targetMonth} 월 DB 계정 적절성 검토 완료.`;
  if (summaryChanges.length > 0) {
    conclusion += ` 총 ${changedDbs.length}개 DB에서 ${summaryChanges.length}건의 변경사항 발생.`;
  } else {
    conclusion += ' 변경사항 없음.';
  }

  return {
    period: targetMonth,
    summary: {
      total_databases: ALL_DATABASES.length,
      checked_databases: ALL_DATABASES.length,
      changed_databases: changedDbs.length,
      total_changes: summaryChanges.length,
      changes: summaryChanges
    },
    details,
    conclusion
  };
}

function main() {
  const targetMonth = getTargetMonth();
  console.log(`=== ${targetMonth} 월 변경사항 집계 ===\n`);

  const files = loadChangeFiles(targetMonth);

  if (files.length === 0) {
    console.log(`\n${targetMonth} 월 변경 파일이 없습니다.`);

    // 변경사항 없음으로 payload 생성
    const payload = buildPayload(targetMonth, new Map());
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));
    console.log(`\n결과 파일 생성: ${OUTPUT_FILE}`);
    return;
  }

  console.log(`\n총 ${files.length}개 파일 로드됨\n`);

  const dbChanges = aggregateChanges(files);
  const payload = buildPayload(targetMonth, dbChanges);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`결과 파일 생성: ${OUTPUT_FILE}`);

  console.log('\n=== 요약 ===');
  console.log(`대상 기간: ${targetMonth}`);
  console.log(`전체 DB: ${payload.summary.total_databases}개`);
  console.log(`변경된 DB: ${payload.summary.changed_databases}개`);
  console.log(`총 변경사항: ${payload.summary.total_changes}건`);
}

main();
