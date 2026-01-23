# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

DB 계정 변경사항을 기록하고, 매월 하이웍스 결재 시스템에 보고하는 시스템.

## 핵심 워크플로우

```
1. 계정 변경 발생 시 → changes/YYYY-MM-DD.json에 기록 (운영 DB만)
2. 매월 초 수동 실행 →
   - aggregate_and_call.js 실행 → reports/YYYY-MM.json 생성
   - 하이웍스 API 호출
```

## 디렉토리 구조

```
changes/          # 일별 계정 변경 이력 (YYYY-MM-DD.json)
reports/          # 월별 API payload (YYYY-MM.json, git 관리)
scripts/actions/  # 집계 스크립트
docs/             # 문서
  - DB_접속정보.md
  - DB_계정_적절성_검토.md
  - DB_sean_권한축소_작업.md
```

## 주요 명령어

```bash
# 변경사항 집계 및 payload 생성
node scripts/actions/aggregate_and_call.js 2025-12

# API 호출 (임시저장)
curl -X POST https://hiworks-production.up.railway.app/hiworks/system-account-review \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d @reports/2025-12.json

# API 호출 (기안 완료) - mode 필드 제거 후 호출
```

## changes 파일 형식

```json
[
  {
    "name": "DB (onda-aurora-cluster)",
    "loginPath": "hub.write",
    "actions": [
      { "type": "deleteAccount", "account": "sean", "hosts": ["10.13.30.%"], "note": "퇴사자 계정 삭제" },
      { "type": "createAccount", "account": "jade", "hosts": ["10.13.30.%"], "grants": "SELECT, PROCESS, SHOW DATABASES ON *.*", "note": "개발자 계정 생성" },
      { "type": "grantPermission", "account": "liam", "grants": "ALL (Aurora 최대 권한) WITH GRANT OPTION", "note": "팀장 권한 부여" }
    ]
  }
]
```

## 환경 구분

- **운영환경**: SSH 터널링 (127.0.0.1) → changes에 기록
- **개발환경**: 직접 연결 (db.gds.dev 등) → changes에 기록하지 않음

## DB 접속

MySQL: `mysql --login-path=<name>` 형식
- 운영: `hub.write`, `db.pplus.write`, `db.osp`, `db.sms`, `db.bo.write`, `db.obs`, `db.misc`, `db.cms`, `db.auth`, `db.voucher`, `db.bookingon`
- 개발: `db.gds.dev`, `db.pplus.dev`

상세 정보: `docs/DB_접속정보.md`

## API 정보

- 엔드포인트: `https://hiworks-production.up.railway.app/hiworks/system-account-review`
- 인증: `x-api-key` 헤더
- `mode: "TEMP"` → 임시저장
- `mode` 없음 → 기안 완료

## 운영 DB 계정 변경 시 필수 작업 순서

운영 DB에서 CREATE USER, ALTER USER, GRANT, DROP USER 등 계정 관련 작업 수행 시:

1. SQL 실행
2. **즉시** `changes/YYYY-MM-DD.json`에 기록 (작업 완료 전 필수)
3. `credentials/by-login-path/*.json`에 계정 정보 업데이트
4. 작업 완료 보고

2번을 빠뜨리면 월말 적절성 검토 보고서에서 누락됨.

## 주의사항

- 운영 DB 변경 시 반드시 `changes/YYYY-MM-DD.json`에 기록
- 개발 DB 변경은 changes에 기록하지 않음
- AWS Aurora는 ALL PRIVILEGES 부여 불가, jade 계정 권한과 동일하게 부여
- read 인스턴스에서는 계정 생성 불가, write 인스턴스 사용
