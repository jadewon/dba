#!/bin/bash
#
# 전체 스냅샷 수집 통합 스크립트
# 매월 말에 실행
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo " DB 계정 스냅샷 수집"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# SSH 터널 확인
echo "SSH 터널 상태 확인..."
if ! lsof -i :53306 > /dev/null 2>&1; then
    echo "경고: SSH 터널이 열려있지 않습니다."
    echo "실행: ssh tunnel.db"
    exit 1
fi
echo "SSH 터널 OK"
echo ""

# MySQL 수집
echo "----------------------------------------"
"$SCRIPT_DIR/collect_mysql.sh"
echo ""

# DocumentDB 수집
echo "----------------------------------------"
"$SCRIPT_DIR/collect_docdb.sh"
echo ""

# Atlas 수집 (선택)
echo "----------------------------------------"
if command -v atlas &> /dev/null; then
    "$SCRIPT_DIR/collect_atlas.sh"
else
    echo "Atlas CLI가 설치되어 있지 않습니다. Atlas 수집 건너뜀."
fi
echo ""

echo "========================================"
echo " 스냅샷 수집 완료"
echo "========================================"
echo ""
echo "다음 단계:"
echo "  git add snapshots/"
echo "  git commit -m 'Monthly snapshot $(date +%Y-%m)'"
echo "  git push"
