/**
 * changes/*.json을 baseline_accounts.json에 반영하는 스크립트
 *
 * 사용법: node scripts/local/apply_changes_to_baseline.js
 */

const fs = require('fs');
const path = require('path');

const BASELINE_PATH = path.join(__dirname, '../../config/baseline_accounts.json');
const CHANGES_DIR = path.join(__dirname, '../../changes');

// DB 이름 매핑 (changes 파일의 name → baseline의 database key)
const DB_NAME_MAP = {
  'DB (onda-aurora-cluster)': 'onda-aurora',
  'DB (onda-standard-property)': 'onda-standard-property',
  'DB (onda-sms)': 'onda-sms',
  'DB (b2e-rds-prd-cluster)': 'b2e-rds-prd',
  'DB (auth-cluster)': 'auth-cluster',
  'DB (onda-plus-cluster)': 'onda-plus',
  'DB (onda-backoffice)': 'backoffice',
  'DB (booking-prd)': 'booking-prd',
  'DB (obs-system)': 'obs-systemCDE,misc,cms',
  'DB (cms-cde-reservaion-api)': 'cms-cde-reservaion-api',
  'DB (onda-voucher)': 'onda-voucher',
  'DocumentDB (EVCMS)': 'EVCMS',
  'Atlas (onda-notification)': 'onda-notification',
  'Atlas (vendor)': 'Vendor'
};

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(`baseline 파일을 찾을 수 없습니다: ${BASELINE_PATH}`);
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

function loadAllChanges() {
  const changes = [];

  if (!fs.existsSync(CHANGES_DIR)) {
    return changes;
  }

  const files = fs.readdirSync(CHANGES_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();

  files.forEach(file => {
    const content = JSON.parse(fs.readFileSync(path.join(CHANGES_DIR, file), 'utf8'));
    changes.push({
      file,
      date: file.replace('.json', ''),
      databases: content
    });
  });

  return changes;
}

function findDbKey(baseline, changeName) {
  // 매핑 테이블에서 찾기
  if (DB_NAME_MAP[changeName]) {
    const mappedKey = DB_NAME_MAP[changeName];
    if (baseline.databases[mappedKey]) {
      return mappedKey;
    }
  }

  // 직접 매칭 시도
  for (const dbKey of Object.keys(baseline.databases)) {
    if (changeName.includes(dbKey) || dbKey.includes(changeName.replace(/^DB \(|\)$/g, ''))) {
      return dbKey;
    }
  }

  return null;
}

function applyAction(baseline, dbKey, action, changeDate) {
  const db = baseline.databases[dbKey];
  if (!db) {
    console.warn(`  [경고] DB를 찾을 수 없음: ${dbKey}`);
    return false;
  }

  switch (action.type) {
    case 'deleteAccount': {
      const idx = db.accounts.findIndex(acc => acc.user === action.account);
      if (idx !== -1) {
        db.accounts.splice(idx, 1);
        console.log(`  [삭제] ${dbKey}: ${action.account} 계정 삭제됨`);
        return true;
      } else {
        console.warn(`  [경고] ${dbKey}: ${action.account} 계정을 찾을 수 없음`);
        return false;
      }
    }

    case 'createAccount': {
      const existing = db.accounts.find(acc => acc.user === action.account);
      if (existing) {
        console.warn(`  [경고] ${dbKey}: ${action.account} 계정이 이미 존재함`);
        return false;
      }
      db.accounts.push({
        user: action.account,
        hosts: action.hosts || '%',
        type: action.accountType || 'unknown',
        hasGrant: action.hasGrant || false,
        etc: action.note || `${changeDate} 생성`
      });
      console.log(`  [생성] ${dbKey}: ${action.account} 계정 생성됨`);
      return true;
    }

    case 'permissionChange': {
      const acc = db.accounts.find(a => a.user === action.account);
      if (!acc) {
        console.warn(`  [경고] ${dbKey}: ${action.account} 계정을 찾을 수 없음`);
        return false;
      }

      // 권한 변경에 따른 type/hasGrant 업데이트
      const toPerms = (action.to || '').toUpperCase();

      if (toPerms.includes('ALL') && toPerms.includes('GRANT')) {
        acc.type = 'dba';
        acc.hasGrant = true;
      } else if (toPerms.includes('ALL')) {
        acc.type = 'write';
        acc.hasGrant = false;
      } else if (toPerms.includes('SELECT') && !toPerms.includes('INSERT') && !toPerms.includes('UPDATE')) {
        acc.type = 'read';
        acc.hasGrant = false;
      } else {
        // 기타 권한 조합
        acc.hasGrant = toPerms.includes('GRANT');
      }

      acc.etc = `${changeDate} 권한변경: ${action.from} → ${action.to}`;
      console.log(`  [권한변경] ${dbKey}: ${action.account} (${action.from} → ${action.to})`);
      return true;
    }

    case 'other': {
      const acc = db.accounts.find(a => a.user === action.account);
      if (acc && action.note) {
        acc.etc = `${changeDate} ${action.note}`;
        console.log(`  [기타] ${dbKey}: ${action.account} - ${action.note}`);
        return true;
      }
      return false;
    }

    default:
      console.warn(`  [경고] 알 수 없는 action type: ${action.type}`);
      return false;
  }
}

function main() {
  console.log('=== changes → baseline 반영 시작 ===\n');

  const baseline = loadBaseline();
  const allChanges = loadAllChanges();

  if (allChanges.length === 0) {
    console.log('적용할 changes 파일이 없습니다.');
    return;
  }

  console.log(`baseline 로드 완료: ${Object.keys(baseline.databases).length}개 DB`);
  console.log(`changes 파일: ${allChanges.length}개\n`);

  let totalApplied = 0;

  for (const change of allChanges) {
    console.log(`\n--- ${change.file} 처리 중 ---`);

    for (const db of change.databases) {
      const dbKey = findDbKey(baseline, db.name);

      if (!dbKey) {
        console.warn(`  [경고] DB 매핑 실패: ${db.name}`);
        continue;
      }

      for (const action of db.actions) {
        if (applyAction(baseline, dbKey, action, change.date)) {
          totalApplied++;
        }
      }
    }
  }

  // baseline 메타데이터 업데이트
  baseline.metadata.lastUpdated = new Date().toISOString();
  baseline.metadata.appliedChanges = allChanges.map(c => c.file);

  // 저장
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), 'utf8');

  console.log('\n=== 완료 ===');
  console.log(`총 ${totalApplied}건 반영됨`);
  console.log(`baseline 저장됨: ${BASELINE_PATH}`);
}

main();
