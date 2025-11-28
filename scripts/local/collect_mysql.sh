#!/bin/bash
#
# MySQL 스냅샷 수집 스크립트
# 로컬에서 실행 (login-path 사용)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SNAPSHOT_DIR="$ROOT_DIR/snapshots"
YEAR_MONTH=$(date +%Y-%m)
OUTPUT_DIR="$SNAPSHOT_DIR/$YEAR_MONTH"

# 대상 DB 목록 (login-path:cluster-name)
declare -A MYSQL_DBS=(
    ["hub.write"]="onda-aurora-cluster"
    ["db.osp"]="onda-standard-property"
    ["db.sms"]="onda-sms"
    ["db.voucher"]="b2e-rds-prd-cluster"
    ["db.auth"]="auth-cluster"
    ["db.pplus.write"]="onda-plus-cluster"
    ["db.bo.write"]="onda-backoffice"
    ["db.bookingon"]="booking-prd"
    ["db.obs"]="obs-system"
    ["db.cms"]="cms-cde-reservaion-api"
    ["db.misc"]="onda-misc-vendor-raw"
)

mkdir -p "$OUTPUT_DIR"

echo "=== MySQL 스냅샷 수집 시작 ==="
echo "출력 디렉토리: $OUTPUT_DIR"
echo ""

OUTPUT_FILE="$OUTPUT_DIR/mysql_users.json"
TEMP_FILE=$(mktemp)

# 초기 JSON 구조
echo '{"collected_at": "'$(date -Iseconds)'", "type": "mysql", "databases": {}}' > "$TEMP_FILE"

for LOGIN_PATH in "${!MYSQL_DBS[@]}"; do
    DB_NAME="${MYSQL_DBS[$LOGIN_PATH]}"
    echo -n "수집 중: $DB_NAME ($LOGIN_PATH)... "

    # 사용자별 SHOW GRANTS 수집
    USERS_JSON="[]"

    # 사용자 목록 조회
    USER_LIST=$(mysql --login-path="$LOGIN_PATH" -N -B -e "
        SELECT CONCAT(User, '@', Host)
        FROM mysql.user
        WHERE User NOT IN ('mysql.sys', 'mysql.session', 'mysql.infoschema', 'rdsadmin', 'rdsrepladmin')
        AND User NOT LIKE 'AWS%'
        AND User != ''
    " 2>/dev/null) || {
        echo "연결 실패"
        continue
    }

    # 각 사용자의 GRANTS 수집
    USERS_ARRAY="["
    FIRST=true

    while IFS= read -r USER_HOST; do
        [ -z "$USER_HOST" ] && continue

        USER="${USER_HOST%%@*}"
        HOST="${USER_HOST##*@}"

        # SHOW GRANTS 실행
        GRANTS=$(mysql --login-path="$LOGIN_PATH" -N -B -e "SHOW GRANTS FOR '$USER'@'$HOST'" 2>/dev/null | tr '\n' '|' | sed 's/|$//')

        # GRANT OPTION 확인
        GRANT_OPTION="false"
        if echo "$GRANTS" | grep -q "WITH GRANT OPTION"; then
            GRANT_OPTION="true"
        fi

        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            USERS_ARRAY+=","
        fi

        USERS_ARRAY+=$(jq -n \
            --arg user "$USER" \
            --arg host "$HOST" \
            --arg grants "$GRANTS" \
            --argjson grant_option "$GRANT_OPTION" \
            '{user: $user, host: $host, grants: $grants, grant_option: $grant_option}')

    done <<< "$USER_LIST"

    USERS_ARRAY+="]"

    # JSON에 DB 추가
    jq --arg db "$DB_NAME" \
       --arg lp "$LOGIN_PATH" \
       --argjson users "$USERS_ARRAY" \
       '.databases[$db] = {login_path: $lp, users: $users}' \
       "$TEMP_FILE" > "${TEMP_FILE}.new" && mv "${TEMP_FILE}.new" "$TEMP_FILE"

    echo "완료 ($(echo "$USERS_ARRAY" | jq 'length') 사용자)"
done

# 최종 파일로 복사
mv "$TEMP_FILE" "$OUTPUT_FILE"

echo ""
echo "=== MySQL 스냅샷 수집 완료 ==="
echo "출력 파일: $OUTPUT_FILE"
