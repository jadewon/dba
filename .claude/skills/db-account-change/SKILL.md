---
name: db-account-change
description: 운영 DB 계정 생성, 삭제, 권한 변경 등 계정 관련 작업. CREATE USER, DROP USER, GRANT, REVOKE, ALTER USER 등의 작업 요청 시 자동 활성화.
---

# 운영 DB 계정 변경 Skill

운영 DB에서 계정 관련 작업(CREATE USER, DROP USER, GRANT, REVOKE, ALTER USER) 수행 시 반드시 아래 순서를 따른다.

## 필수 작업 순서

1. **SQL 실행**: 운영 DB에서 계정 변경 SQL 실행
2. **changes 기록**: `changes/YYYY-MM-DD.json`에 즉시 기록 (월말 적절성 검토 보고서에 포함됨)
3. **credentials 업데이트**: `credentials/by-login-path/*.json`에 계정 정보 반영
4. **작업 완료 보고**

## changes 파일 형식

```json
[
  {
    "name": "DB (클러스터명)",
    "loginPath": "login-path명",
    "actions": [
      { "type": "createAccount", "account": "계정명", "hosts": ["호스트"], "grants": "권한", "note": "사유" },
      { "type": "deleteAccount", "account": "계정명", "hosts": ["호스트"], "note": "사유" },
      { "type": "grantPermission", "account": "계정명", "grants": "권한", "note": "사유" },
      { "type": "revokePermission", "account": "계정명", "grants": "권한", "note": "사유" }
    ]
  }
]
```

## 운영 DB login-path 목록

- hub.write (onda-aurora-cluster)
- db.pplus.write (onda-plus-cluster)
- db.osp (onda-standard-property)
- db.sms (onda-sms)
- db.bo.write (onda-backoffice)
- db.obs (obs-system)
- db.cms (cms-cde-reservaion-api)
- db.auth (auth-cluster)
- db.voucher (b2e-rds-prd-cluster)
- db.bookingon (booking-prd)

## 주의사항

- 개발 DB(db.gds.dev, db.pplus.dev)는 changes에 기록하지 않음
- read 인스턴스에서는 계정 생성 불가, write 인스턴스 사용
- 2번(changes 기록)을 빠뜨리면 월말 적절성 검토 보고서에서 누락됨
