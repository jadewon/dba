#!/bin/bash
#
# 사내 결재 시스템 API 호출 스크립트
# GitHub Actions에서 실행
#
# 환경변수:
#   AUDIT_API_URL - API 엔드포인트 URL
#   AUDIT_API_KEY - API 인증 키 (선택)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PAYLOAD_FILE="$ROOT_DIR/diff_result.json"

if [ -z "$AUDIT_API_URL" ]; then
    echo "Error: AUDIT_API_URL 환경변수가 설정되지 않았습니다."
    exit 1
fi

if [ ! -f "$PAYLOAD_FILE" ]; then
    echo "Error: $PAYLOAD_FILE 파일이 없습니다."
    exit 1
fi

echo "=== API 호출 ==="
echo "URL: $AUDIT_API_URL"
echo "Payload: $PAYLOAD_FILE"
echo ""

# API 호출
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$AUDIT_API_URL" \
    -H "Content-Type: application/json" \
    ${AUDIT_API_KEY:+-H "Authorization: Bearer $AUDIT_API_KEY"} \
    -d @"$PAYLOAD_FILE")

HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n1)

echo "HTTP Status: $HTTP_CODE"
echo "Response: $HTTP_BODY"

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo ""
    echo "=== API 호출 성공 ==="
    exit 0
else
    echo ""
    echo "=== API 호출 실패 ==="
    exit 1
fi
