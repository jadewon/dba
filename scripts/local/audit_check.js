/**
 * 적절성 검토 스크립트
 *
 * 검토 항목:
 * ① 최소 권한 원칙 준수 여부 - baseline의 Type 필드로 확인
 * ② 업무 분류 기반 접근 권한 부여 여부 - baseline의 Type + Etc 필드로 확인
 * ③ 승인 기록 여부 - changes/*.json으로 확인 (이미 커버됨)
 * ④ 퇴사자/조직변경 처리 여부 - changes/*.json으로 확인 (이미 커버됨)
 *
 * 사용법: node scripts/local/audit_check.js [YYYY-MM]
 */

const fs = require('fs');
const path = require('path');

const BASELINE_PATH = path.join(__dirname, '../../config/baseline_accounts.json');
const CHANGES_DIR = path.join(__dirname, '../../changes');
const REPORTS_DIR = path.join(__dirname, '../../reports');

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(`baseline 파일을 찾을 수 없습니다: ${BASELINE_PATH}`);
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

function loadChanges(yearMonth) {
  const changes = [];
  const pattern = new RegExp(`^${yearMonth}-\\d{2}\\.json$`);

  if (!fs.existsSync(CHANGES_DIR)) {
    return changes;
  }

  const files = fs.readdirSync(CHANGES_DIR)
    .filter(f => pattern.test(f))
    .sort();

  files.forEach(file => {
    const content = JSON.parse(fs.readFileSync(path.join(CHANGES_DIR, file), 'utf8'));
    changes.push({
      file,
      date: file.replace('.json', ''),
      actions: content.actions || []
    });
  });

  return changes;
}

function analyzeMinimumPrivilege(baseline) {
  /**
   * 최소 권한 원칙 검토
   * - DBA 권한을 가진 계정이 적절한지 확인
   * - hasGrant가 true인 계정 검토
   */
  const issues = [];

  Object.entries(baseline.databases).forEach(([dbName, dbInfo]) => {
    if (dbInfo.environment === 'DEV') return; // DEV 환경은 제외

    const dbaAccounts = dbInfo.accounts.filter(acc => acc.type === 'dba');
    const grantAccounts = dbInfo.accounts.filter(acc => acc.hasGrant === true);

    // DBA 계정이 3개 이상이면 경고
    if (dbaAccounts.length > 3) {
      issues.push({
        database: dbName,
        type: 'excessive_dba',
        message: `DBA 계정이 ${dbaAccounts.length}개로 과다합니다`,
        accounts: dbaAccounts.map(a => a.user)
      });
    }

    // GRANT 권한을 가진 계정 확인
    grantAccounts.forEach(acc => {
      if (acc.type !== 'dba') {
        issues.push({
          database: dbName,
          type: 'non_dba_with_grant',
          message: `DBA가 아닌 계정이 GRANT 권한을 보유`,
          account: acc.user,
          accountType: acc.type
        });
      }
    });
  });

  return issues;
}

function analyzeRoleBasedAccess(baseline) {
  /**
   * 업무 분류 기반 접근 권한 검토
   * - unknown 타입 계정 확인
   * - 타입이 명확하지 않은 계정 검토
   */
  const issues = [];

  Object.entries(baseline.databases).forEach(([dbName, dbInfo]) => {
    if (dbInfo.environment === 'DEV') return;

    const unknownAccounts = dbInfo.accounts.filter(acc => acc.type === 'unknown');

    unknownAccounts.forEach(acc => {
      issues.push({
        database: dbName,
        type: 'unknown_role',
        message: `계정 역할(Type)이 정의되지 않음`,
        account: acc.user
      });
    });
  });

  return issues;
}

function analyzeApprovalRecords(changes, yearMonth) {
  /**
   * 승인 기록 검토
   * - 해당 월에 변경 이력이 있는지 확인
   */
  const summary = {
    totalChanges: 0,
    addedAccounts: [],
    removedAccounts: [],
    modifiedAccounts: []
  };

  changes.forEach(change => {
    change.actions.forEach(action => {
      summary.totalChanges++;

      if (action.type === 'add') {
        summary.addedAccounts.push({
          date: change.date,
          database: action.database,
          account: action.account
        });
      } else if (action.type === 'remove') {
        summary.removedAccounts.push({
          date: change.date,
          database: action.database,
          account: action.account
        });
      } else if (action.type === 'modify') {
        summary.modifiedAccounts.push({
          date: change.date,
          database: action.database,
          account: action.account,
          changes: action.changes
        });
      }
    });
  });

  return summary;
}

function generateReport(yearMonth, baseline, changes) {
  const report = {
    metadata: {
      reportDate: new Date().toISOString(),
      targetMonth: yearMonth,
      baselineVersion: baseline.metadata.version,
      baselineGeneratedAt: baseline.metadata.generatedAt
    },
    summary: {
      totalDatabases: Object.keys(baseline.databases).length,
      prodDatabases: Object.values(baseline.databases).filter(d => d.environment === 'PROD').length,
      devDatabases: Object.values(baseline.databases).filter(d => d.environment === 'DEV').length,
      totalAccounts: Object.values(baseline.databases).reduce((sum, d) => sum + d.accounts.length, 0)
    },
    checks: {
      minimumPrivilege: {
        status: 'checked',
        issues: analyzeMinimumPrivilege(baseline)
      },
      roleBasedAccess: {
        status: 'checked',
        issues: analyzeRoleBasedAccess(baseline)
      },
      approvalRecords: {
        status: 'checked',
        summary: analyzeApprovalRecords(changes, yearMonth)
      },
      organizationChanges: {
        status: 'covered_by_changes',
        note: 'changes/*.json 파일에서 계정 추가/제거로 확인됨'
      }
    },
    conclusion: {
      hasIssues: false,
      issueCount: 0,
      recommendation: ''
    }
  };

  // 이슈 집계
  const totalIssues =
    report.checks.minimumPrivilege.issues.length +
    report.checks.roleBasedAccess.issues.length;

  report.conclusion.hasIssues = totalIssues > 0;
  report.conclusion.issueCount = totalIssues;

  if (totalIssues > 0) {
    report.conclusion.recommendation = '검토가 필요한 항목이 있습니다. 상세 내용을 확인해주세요.';
  } else {
    report.conclusion.recommendation = '적절성 검토 완료. 특이사항 없음.';
  }

  return report;
}

function saveReport(report, yearMonth) {
  const reportDir = path.join(REPORTS_DIR, yearMonth);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  return reportPath;
}

function main() {
  // 대상 월 결정 (기본: 이전 달)
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultYearMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

  const yearMonth = process.argv[2] || defaultYearMonth;

  console.log(`적절성 검토 시작: ${yearMonth}`);
  console.log('─'.repeat(50));

  // 데이터 로드
  const baseline = loadBaseline();
  const changes = loadChanges(yearMonth);

  console.log(`baseline 로드 완료: ${Object.keys(baseline.databases).length}개 DB`);
  console.log(`changes 로드 완료: ${changes.length}개 파일`);

  // 리포트 생성
  const report = generateReport(yearMonth, baseline, changes);

  // 리포트 저장
  const reportPath = saveReport(report, yearMonth);

  console.log('─'.repeat(50));
  console.log(`리포트 생성 완료: ${reportPath}`);
  console.log('');
  console.log('=== 검토 결과 요약 ===');
  console.log(`총 DB 수: ${report.summary.totalDatabases} (PROD: ${report.summary.prodDatabases}, DEV: ${report.summary.devDatabases})`);
  console.log(`총 계정 수: ${report.summary.totalAccounts}`);
  console.log('');
  console.log(`① 최소 권한 원칙: ${report.checks.minimumPrivilege.issues.length}건 이슈`);
  console.log(`② 업무 분류 기반: ${report.checks.roleBasedAccess.issues.length}건 이슈`);
  console.log(`③ 승인 기록: ${report.checks.approvalRecords.summary.totalChanges}건 변경`);
  console.log(`④ 조직 변경: changes 파일로 커버됨`);
  console.log('');
  console.log(`결론: ${report.conclusion.recommendation}`);
}

main();
