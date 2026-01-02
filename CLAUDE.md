# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

DB 계정 적절성 검토 자동화 시스템. 매월 2일에 이전 달의 DB 계정 변경사항을 집계하고, 적절성 검토 보고서를 생성하여 사내 결재 시스템(하이웍스)에 API로 제출한다.

## 핵심 워크플로우

```
1. 계정 변경 발생 시 → changes/YYYY-MM-DD.json에 수동 기록
2. 매월 초 수동 실행 →
   - aggregate_and_call.js: changes 집계 → diff_result.json (API payload)
   - 하이웍스 API 호출
```

## 주요 명령어

```bash
# 적절성 검토 실행 (특정 월)
node scripts/local/audit_check.js 2025-11

# 변경사항 집계 및 payload 생성
node scripts/actions/aggregate_and_call.js 2025-11

# 엑셀 → baseline JSON 변환
node scripts/local/convert_excel_to_baseline.js ~/Downloads/DB\ grants.xlsx

# changes를 baseline에 반영
node scripts/local/apply_changes_to_baseline.js
```

## 디렉토리 구조

- `config/baseline_accounts.json`: 전체 DB 계정 마스터 데이터 (엑셀에서 변환)
- `changes/YYYY-MM-DD.json`: 일별 계정 변경 이력 (수동 기록)
- `reports/YYYY-MM/audit_report.json`: 월별 적절성 검토 결과
- `diff_result.json`: API 호출용 payload (자동 생성)

## changes 파일 형식

```json
[
  {
    "name": "DB (onda-aurora-cluster)",
    "actions": [
      { "type": "permissionChange", "account": "sean", "from": "ALL + GRANT OPTION", "to": "SELECT, PROCESS, SHOW DATABASES" },
      { "type": "deleteAccount", "account": "ian" },
      { "type": "createAccount", "account": "jade", "note": "DBA 계정 생성" }
    ]
  }
]
```

## 환경 구분

- **운영환경**: login-path host가 `127.0.0.1` (SSH 터널링) → 적절성 검토 대상
- **개발환경**: login-path host가 직접 엔드포인트 (db.gds.dev 등) → 보고서 제외

## DB 접속

MySQL 접속은 `mysql --login-path=<name>` 형식 사용. 주요 login-path:
- `hub.write`, `db.pplus.write`, `db.obs`, `db.sms`, `db.auth` 등

접속 정보는 `DB_접속정보.md` 참조.

## API 정보

- 엔드포인트: `https://hiworks-production.up.railway.app/hiworks/system-account-review`
- 인증: `x-api-key` 헤더 (workflow에 하드코딩됨)
- payload의 `mode: "TEMP"` → 임시저장, 없으면 기안 완료

## 주의사항

- 계정 변경 시 반드시 `changes/YYYY-MM-DD.json`에 기록
- read 인스턴스에서는 계정 생성 불가, write 인스턴스 사용
- 개발 DB 변경은 changes에 기록하지 않음
