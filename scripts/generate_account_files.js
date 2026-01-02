#!/usr/bin/env node
/**
 * DB 계정 정보를 login-path별 JSON 파일로 생성
 * 실제 DB 조회 결과 + 엑셀 비밀번호 정보 매핑
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 비밀번호 매핑 (엑셀 기준)
const passwords = {
  'jade': '8a884dd95ddf!',
  'sean': '6adbca3fb386!',
  'eden': 'e70e60decd02!',
  'justin': 'qAN$$6Ys7beH',
  'will': 'mbr8auDF$K69wME8',
  'karl.seong': '0xDX8U5&047!',
  'ted.kim': 'ieAAkx1U6b7%',
  'amy': 'kH977!6XEEu=',
  'ann': '5&$8SR#IRcuI2c',
  'dana': '4Vd0x8&PXbQB',
  'dustin': 'K4ni&a1jG1X[',
  'gyu': '5ac49159d0bf!',
  'isaac': 'dGhN!vs8Z2Ix',
  'liam': '4MNa"k4]V6M*u~Vf',
  'marcos': 'EVtOPTQnC&}|!sNO',
  'mj': 'znR8H3!5n24P',
  'robin': '27ZA9mXf!yeu',
  'say': '8gJRI77un::c',
  'sebs': 'e8ec5fba366b!',
  'shane': 'op6Gvp9SzS1&',
  'tessa': 'hH98n#DE40YF',
  'theo': 'Y9E£29*0RsFc',
  'julie': 'rHNrUhUhg{O1DnH1',
  'won': '0scW=JP62Utp',
  'luan': '!u8QY&RW*622',
  'hans.kim': '6l4Z£u:ZG2iH',
  'roin.noh': 'X45V6O:wPE6)',
  'derek.lee': 'yip1$FNTmsDg',
  'ian': 'CSkhDySeGe!Pgx6k'
};

// 사용자 역할 분류
const userRoles = {
  // DBA/Admin
  'jade': 'dba',
  'admin': 'system',
  'root': 'system',
  'heewon': 'dba',

  // Restricted (권한 축소됨)
  'sean': 'restricted',

  // Service accounts
  'santorini': 'service',
  'pytorini': 'service',
  'misc_api': 'service',
  'lambda_api': 'service',
  'lambda_hint': 'service',
  'ari_service': 'service',
  'ari_service2': 'service',
  'osp-api': 'service',
  'backoffice-api': 'service',
  'address-api': 'service',
  'service-api': 'service',
  'service-sms': 'service',
  'fax': 'service',
  'onda_notification': 'service',
  'contract-service': 'service',
  'n8n': 'service',
  'operation-tool': 'service',
  'debezium': 'service',

  // Monitor/Read accounts
  'querypie-read': 'monitor',
  'quicksight-dms': 'monitor',
  'ods-mart': 'monitor',
  'onda_reader_bot': 'monitor',

  // VDI
  'querypie-VDI': 'vdi',

  // Write developers
  'justin': 'developer-write',
  'will': 'developer-write',
  'eden': 'developer-write',

  // Read developers
  'gyu': 'developer',
  'liam': 'developer',
  'sebs': 'developer',
  'shane': 'developer',
  'won': 'developer',
  'karl.seong': 'developer',
  'ted.kim': 'developer',
  'roin.noh': 'developer',
  'hans.kim': 'developer',
  'jayce': 'developer'
};

// login-path 설정
const loginPaths = [
  { name: 'hub.write', cluster: 'onda-aurora-cluster', endpoint: 'onda-aurora-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com', port: 53306 },
  { name: 'db.pplus.write', cluster: 'onda-plus-cluster', endpoint: 'onda-plus-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com', port: 54106 },
  { name: 'db.osp', cluster: 'onda-standard-property', endpoint: 'onda-standard-property.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com', port: 53506 },
  { name: 'db.sms', cluster: 'onda-sms', endpoint: 'onda-sms.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com', port: 53606 },
  { name: 'db.bo.write', cluster: 'onda-backoffice', endpoint: 'onda-backoffice.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com', port: 53906 },
  { name: 'db.misc', cluster: 'onda-misc-vendor-raw', endpoint: 'onda-misc-vendor-raw.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com', port: 53706 },
  { name: 'db.obs', cluster: 'obs-system', endpoint: 'obs-system.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com', port: 54206 },
  { name: 'db.cms', cluster: 'cms-cde-reservaion-api', endpoint: 'cms-cde-reservaion-api.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com', port: 54306 },
  { name: 'db.auth', cluster: 'auth-cluster', endpoint: 'auth-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com', port: 53406 },
  { name: 'db.voucher', cluster: 'b2e-rds-prd-cluster', endpoint: 'b2e-rds-prd-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com', port: 53806 },
  { name: 'db.bookingon', cluster: 'booking-prd', endpoint: 'booking-prd.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com', port: 55106 }
];

const outputDir = path.join(__dirname, '../credentials/by-login-path');

function queryUsers(loginPath) {
  try {
    const cmd = `mysql --login-path=${loginPath} -N -e "SELECT User, Host, Grant_priv FROM mysql.user WHERE User NOT LIKE 'mysql%' AND User NOT LIKE 'rds%' AND User NOT LIKE 'AWS%' AND User != '' ORDER BY User"`;
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    return result.trim().split('\n').filter(line => line).map(line => {
      const [user, host, grantPriv] = line.split('\t');
      return { user, host, hasGrant: grantPriv === 'Y' };
    });
  } catch (e) {
    console.error(`Failed to query ${loginPath}: ${e.message}`);
    return null;
  }
}

function getUserRole(user) {
  return userRoles[user] || 'unknown';
}

function getPassword(user) {
  return passwords[user] || null;
}

function generateFile(config) {
  console.log(`Processing ${config.name}...`);

  const users = queryUsers(config.name);

  if (!users) {
    console.log(`  Skipped (connection failed)`);
    return false;
  }

  // 중복 사용자 통합 (여러 host를 가진 경우)
  const userMap = {};
  users.forEach(u => {
    if (!userMap[u.user]) {
      userMap[u.user] = {
        user: u.user,
        hosts: [u.host],
        hasGrant: u.hasGrant,
        role: getUserRole(u.user),
        password: getPassword(u.user)
      };
    } else {
      userMap[u.user].hosts.push(u.host);
      // hasGrant는 하나라도 Y면 true
      userMap[u.user].hasGrant = userMap[u.user].hasGrant || u.hasGrant;
    }
  });

  const output = {
    loginPath: config.name,
    cluster: config.cluster,
    endpoint: config.endpoint,
    port: config.port,
    queriedAt: new Date().toISOString().split('T')[0],
    accounts: Object.values(userMap).sort((a, b) => a.user.localeCompare(b.user))
  };

  const filePath = path.join(outputDir, `${config.name.replace(/\./g, '_')}.json`);
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`  Created ${filePath} (${output.accounts.length} accounts)`);
  return true;
}

// 메인 실행
console.log('Generating account files by login-path...\n');

let success = 0;
let failed = 0;

loginPaths.forEach(config => {
  if (generateFile(config)) {
    success++;
  } else {
    failed++;
  }
});

console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
