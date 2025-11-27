# DB 계정 적절성 검토

**담당자**: jade
**검토 주기**: 매월 1회
**목적**: 인증 심사 및 컴플라이언스 요건 충족

---

## 대상 DB 목록 (총 13개)

### AWS Aurora MySQL (11개)

| DB | Login Path | 엔드포인트 | 터널 포트 |
|---|---|---|---|
| onda-aurora-cluster | hub.write | onda-aurora-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53306 |
| onda-standard-property | db.osp | onda-standard-property.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53506 |
| onda-sms | db.sms | onda-sms.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53606 |
| b2e-rds-prd-cluster | db.voucher | b2e-rds-prd-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53806 |
| auth-cluster | db.auth | auth-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53406 |
| onda-plus-cluster | db.pplus.write | onda-plus-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 54106 |
| onda-backoffice | db.bo.write | onda-backoffice.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53906 |
| booking-prd | db.bookingon | booking-prd.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 55106 |
| obs-system | db.obs | obs-system.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 54206 |
| cms-cde-reservaion-api | db.cms | cms-cde-reservaion-api.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 54306 |
| onda-misc-vendor-raw | db.misc | onda-misc-vendor-raw.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53706 |

### AWS DocumentDB (1개)

| DB | 엔드포인트 | 터널 포트 |
|---|---|---|
| EVCMS | evcms-documentdb-production.cluster-cfreopdapfya.ap-northeast-2.docdb.amazonaws.com | 27018 |

### MongoDB Atlas (2개)

| DB | 비고 |
|---|---|
| onda-notification | |
| vendor | |

---

## 계정 분류

### DBA 계정 (관리자)

| 계정 | 담당자 | 권한 | 비고 |
|---|---|---|---|
| jade | jade | 전체 + GRANT OPTION | 현 DBA |

### 권한 축소 계정 (퇴사/이관)

| 계정 | 담당자 | 권한 | 비고 |
|---|---|---|---|
| sean | sean | SELECT, PROCESS, SHOW DATABASES | 퇴사 예정, 삭제 대기 |

### 서비스 계정

(추후 조사 필요)

### 모니터링/분석 계정

(추후 조사 필요)

### 확인 필요 계정

| 계정 | 비고 |
|---|---|
| CS | 용도 불명, 히스토리 없음 (2023년 문서에서 언급) |

---

## 검토 체크리스트

- [ ] 퇴사자 계정 삭제 여부
- [ ] 미사용 계정 확인
- [ ] 과도한 권한 보유 계정 확인 (GRANT OPTION, CREATE USER 등)
- [ ] 신규 생성 계정 적절성 확인
- [ ] 서비스 계정 최소 권한 원칙 준수 여부

---

## 검토 이력

### 2025-11

- sean 권한 축소 완료 (전체 DB)
- ian 계정 삭제 (hub.write, db.voucher)
- jade DBA 권한 확보 완료

---

## 히스토리

### 2023년 (이전 담당: sean)

- heewon, ryan, karl, william, carmen 계정 삭제 완료
- kevin, kai, theo, JT, Sebs, Edward, Robin, Ryuni - 당시 DBA 권한 유지 (현재 재직 여부 확인 필요)
