#!/bin/bash
#
# MongoDB Atlas 스냅샷 수집 스크립트
# 로컬에서 실행 (Atlas CLI 또는 API 사용)
#
# 사전 설정 필요:
#   atlas auth login
#   또는 환경변수: MONGODB_ATLAS_PUBLIC_API_KEY, MONGODB_ATLAS_PRIVATE_API_KEY
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SNAPSHOT_DIR="$ROOT_DIR/snapshots"
YEAR_MONTH=$(date +%Y-%m)
OUTPUT_DIR="$SNAPSHOT_DIR/$YEAR_MONTH"

# Atlas 프로젝트/클러스터 목록
# 형식: "project_id:cluster_name:display_name"
ATLAS_CLUSTERS=(
    "PROJECT_ID_HERE:onda-notification:onda-notification"
    "PROJECT_ID_HERE:vendor:vendor"
)

mkdir -p "$OUTPUT_DIR"

echo "=== MongoDB Atlas 스냅샷 수집 시작 ==="
echo "출력 디렉토리: $OUTPUT_DIR"
echo ""

OUTPUT_FILE="$OUTPUT_DIR/atlas_users.json"
TEMP_FILE=$(mktemp)

# 초기 JSON 구조
echo '{"collected_at": "'$(date -Iseconds)'", "type": "atlas", "databases": {}}' > "$TEMP_FILE"

for CLUSTER_ENTRY in "${ATLAS_CLUSTERS[@]}"; do
    IFS=':' read -r PROJECT_ID CLUSTER_NAME DISPLAY_NAME <<< "$CLUSTER_ENTRY"

    echo -n "수집 중: $DISPLAY_NAME... "

    # Atlas CLI로 DB 사용자 목록 조회
    USERS_JSON=$(atlas dbusers list --projectId "$PROJECT_ID" --output json 2>/dev/null) || {
        echo "수집 실패 (Atlas CLI 확인 필요)"
        continue
    }

    # 필요한 필드만 추출
    USERS_FILTERED=$(echo "$USERS_JSON" | jq '[.[] | {
        user: .username,
        db: .databaseName,
        roles: (.roles | map(.roleName + "@" + .databaseName) | join(", "))
    }]')

    # JSON에 추가
    jq --arg db "$DISPLAY_NAME" \
       --argjson users "$USERS_FILTERED" \
       '.databases[$db] = {users: $users}' \
       "$TEMP_FILE" > "${TEMP_FILE}.new" && mv "${TEMP_FILE}.new" "$TEMP_FILE"

    echo "완료"
done

mv "$TEMP_FILE" "$OUTPUT_FILE"

echo ""
echo "=== MongoDB Atlas 스냅샷 수집 완료 ==="
echo "출력 파일: $OUTPUT_FILE"
echo ""
echo "참고: PROJECT_ID를 실제 값으로 설정해야 합니다."
