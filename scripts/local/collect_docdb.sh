#!/bin/bash
#
# DocumentDB 스냅샷 수집 스크립트
# 로컬에서 실행 (SSH 터널 필요)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SNAPSHOT_DIR="$ROOT_DIR/snapshots"
YEAR_MONTH=$(date +%Y-%m)
OUTPUT_DIR="$SNAPSHOT_DIR/$YEAR_MONTH"

# DocumentDB 설정
DOCDB_HOST="127.0.0.1"
DOCDB_PORT="27018"
DOCDB_NAME="EVCMS"

mkdir -p "$OUTPUT_DIR"

echo "=== DocumentDB 스냅샷 수집 시작 ==="
echo "출력 디렉토리: $OUTPUT_DIR"
echo ""

OUTPUT_FILE="$OUTPUT_DIR/docdb_users.json"

echo -n "수집 중: $DOCDB_NAME... "

# mongosh로 사용자 목록 조회
USERS_JSON=$(mongosh --host "$DOCDB_HOST" --port "$DOCDB_PORT" --quiet --eval '
    const users = db.adminCommand({ usersInfo: 1 }).users;
    const result = users.map(u => ({
        user: u.user,
        db: u.db,
        roles: u.roles.map(r => r.role + "@" + r.db).join(", ")
    }));
    JSON.stringify(result);
' 2>/dev/null) || USERS_JSON="[]"

# JSON 출력
jq -n \
    --arg collected_at "$(date -Iseconds)" \
    --arg db_name "$DOCDB_NAME" \
    --argjson users "$USERS_JSON" \
    '{
        collected_at: $collected_at,
        type: "documentdb",
        databases: {
            ($db_name): {
                users: $users
            }
        }
    }' > "$OUTPUT_FILE"

echo "완료"

echo ""
echo "=== DocumentDB 스냅샷 수집 완료 ==="
echo "출력 파일: $OUTPUT_FILE"
