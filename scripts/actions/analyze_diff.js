#!/usr/bin/env node
/**
 * 스냅샷 diff 분석 스크립트
 * GitHub Actions에서 실행
 *
 * 사용법: node analyze_diff.js <prev_month> <curr_month>
 * 예: node analyze_diff.js 2025-11 2025-12
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOT_DIR = path.join(__dirname, '../../snapshots');

function loadSnapshot(yearMonth, type) {
    const filePath = path.join(SNAPSHOT_DIR, yearMonth, `${type}_users.json`);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractUsers(snapshot) {
    if (!snapshot || !snapshot.databases) return {};

    const result = {};
    for (const [dbName, dbData] of Object.entries(snapshot.databases)) {
        result[dbName] = {};
        for (const user of (dbData.users || [])) {
            const key = `${user.user}@${user.host || user.db || 'default'}`;
            result[dbName][key] = {
                user: user.user,
                host: user.host || user.db,
                grants: user.grants || user.roles || '',
                grant_option: user.grant_option || false
            };
        }
    }
    return result;
}

function compareDatabases(prevUsers, currUsers) {
    const changes = [];

    const allDbs = new Set([...Object.keys(prevUsers), ...Object.keys(currUsers)]);

    for (const dbName of allDbs) {
        const prev = prevUsers[dbName] || {};
        const curr = currUsers[dbName] || {};

        const allUserKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

        const dbChanges = [];

        for (const userKey of allUserKeys) {
            const prevUser = prev[userKey];
            const currUser = curr[userKey];

            if (!prevUser && currUser) {
                // 신규 계정
                dbChanges.push({
                    type: 'createAccount',
                    account: currUser.user,
                    host: currUser.host,
                    note: `신규 생성`
                });
            } else if (prevUser && !currUser) {
                // 삭제된 계정
                dbChanges.push({
                    type: 'deleteAccount',
                    account: prevUser.user,
                    host: prevUser.host
                });
            } else if (prevUser && currUser) {
                // 권한 변경 확인
                if (prevUser.grants !== currUser.grants) {
                    dbChanges.push({
                        type: 'permissionChange',
                        account: currUser.user,
                        host: currUser.host,
                        from: summarizeGrants(prevUser.grants),
                        to: summarizeGrants(currUser.grants)
                    });
                }
            }
        }

        if (dbChanges.length === 0) {
            changes.push({
                name: `DB (${dbName})`,
                actions: [{ type: 'other', note: '변경사항 없음' }]
            });
        } else {
            changes.push({
                name: `DB (${dbName})`,
                actions: dbChanges
            });
        }
    }

    return changes;
}

function summarizeGrants(grants) {
    if (!grants) return 'NONE';
    if (typeof grants !== 'string') return String(grants);

    // 긴 권한 문자열 요약
    if (grants.includes('ALL PRIVILEGES') || grants.split(',').length > 10) {
        if (grants.includes('GRANT OPTION')) {
            return 'ALL + GRANT OPTION';
        }
        return 'ALL';
    }

    // SELECT, PROCESS, SHOW DATABASES 만 있으면 축약
    const simplified = grants.replace(/GRANT\s+/gi, '').replace(/ON \*\.\* TO .*/gi, '').trim();
    if (simplified.length > 50) {
        return simplified.substring(0, 47) + '...';
    }
    return simplified || grants;
}

function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: node analyze_diff.js <prev_month> <curr_month>');
        console.error('Example: node analyze_diff.js 2025-11 2025-12');
        process.exit(1);
    }

    const [prevMonth, currMonth] = args;

    console.log(`Analyzing diff: ${prevMonth} -> ${currMonth}`);

    // 스냅샷 로드
    const types = ['mysql', 'docdb', 'atlas'];
    let allPrevUsers = {};
    let allCurrUsers = {};

    for (const type of types) {
        const prevSnapshot = loadSnapshot(prevMonth, type);
        const currSnapshot = loadSnapshot(currMonth, type);

        if (prevSnapshot) {
            Object.assign(allPrevUsers, extractUsers(prevSnapshot));
        }
        if (currSnapshot) {
            Object.assign(allCurrUsers, extractUsers(currSnapshot));
        }
    }

    // 비교
    const systems = compareDatabases(allPrevUsers, allCurrUsers);

    // API Payload 생성
    const payload = {
        reviewDate: new Date().toISOString().split('T')[0],
        systems: systems,
        mode: 'TEMP'
    };

    // 결과 출력
    const outputPath = path.join(__dirname, '../../diff_result.json');
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));

    console.log('\nDiff 분석 완료');
    console.log(`출력 파일: ${outputPath}`);
    console.log('\n변경 요약:');

    let hasChanges = false;
    for (const system of systems) {
        const changes = system.actions.filter(a => a.type !== 'other');
        if (changes.length > 0) {
            hasChanges = true;
            console.log(`  ${system.name}: ${changes.length}건 변경`);
            for (const action of changes) {
                if (action.type === 'deleteAccount') {
                    console.log(`    - 삭제: ${action.account}`);
                } else if (action.type === 'createAccount') {
                    console.log(`    - 생성: ${action.account}`);
                } else if (action.type === 'permissionChange') {
                    console.log(`    - 권한변경: ${action.account} (${action.from} -> ${action.to})`);
                }
            }
        }
    }

    if (!hasChanges) {
        console.log('  변경사항 없음');
    }

    // GitHub Actions output
    const hasChangesStr = hasChanges ? 'true' : 'false';
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=${hasChangesStr}\n`);
    }

    return payload;
}

main();
