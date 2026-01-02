# DB 접속 정보

## 환경 구분

> **구분 기준**: login-path의 host가 `127.0.0.1` (SSH 터널링)이면 운영환경, 직접 엔드포인트면 개발환경

### 운영 환경 (Production) - 적절성 검토 대상

| 클러스터명 | Login Path | 비고 |
|---|---|---|
| onda-aurora-cluster | hub.write / db.gds.operation | 메인 클러스터 |
| onda-plus-cluster | db.pplus.write | |
| onda-standard-property | db.osp | |
| onda-sms | db.sms | |
| onda-backoffice | db.bo.write | |
| onda-misc-vendor-raw | db.misc | |
| obs-system | db.obs | |
| cms-cde-reservaion-api | db.cms | |
| auth-cluster | db.auth | |
| b2e-rds-prd-cluster | db.voucher | |
| booking-prd | db.bookingon | |
| EVCMS (DocumentDB) | - | |
| onda-notification (Atlas) | - | |
| vendor (Atlas) | - | |
| content (Atlas) | - | |

### 개발 환경 (Development) - 적절성 검토 제외

| 클러스터명 | Login Path | 비고 |
|---|---|---|
| onda-dev-cluster | db.gds.dev | 개발용, 보고서 제외 |
| ppurio-common-dev | ppurio.dev | 개발용, 보고서 제외 |

---

## MySQL Login Path 매핑

### Write 엔드포인트 (프로덕션)

| 클러스터명 | Login Path | 엔드포인트 | 포트 |
|---|---|---|---|
| onda-aurora-cluster | hub.write | onda-aurora-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53306 |
| onda-plus-cluster | db.pplus.write | onda-plus-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 54106 |
| onda-standard-property | db.osp | onda-standard-property.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53506 |
| onda-sms | db.sms | onda-sms.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53606 |
| onda-backoffice | db.bo.write | onda-backoffice.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53906 |
| onda-misc-vendor-raw | db.misc | onda-misc-vendor-raw.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53706 |
| obs-system | db.obs | obs-system.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 54206 |
| cms-cde-reservaion-api | db.cms | cms-cde-reservaion-api.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 54306 |
| auth-cluster | db.auth | auth-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53406 |
| b2e-rds-prd-cluster | db.voucher | b2e-rds-prd-cluster.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53806 |
| booking-prd | db.bookingon | booking-prd.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 55106 |

### Read 엔드포인트 (읽기 전용)

| 클러스터명 | Login Path | 엔드포인트 | 포트 |
|---|---|---|---|
| onda-aurora-cluster (gds-read) | db.read | gds-read-only.cluster-custom-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53307 |
| onda-aurora-cluster (operation) | db.gds.operation | onda-aurora-2a-operation.cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53308 |
| onda-aurora-cluster (reader1) | db.read1 | onda-aurora-2a6-reader.cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53309 |
| onda-aurora-cluster (reader2) | db.read2 | onda-aurora-2c7-reader.cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53310 |
| onda-plus-cluster | db.pplus.read | onda-plus-cluster.cluster-ro-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 54107 |
| onda-standard-property | db.osp.read | onda-standard-property.cluster-ro-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53507 |
| onda-sms | db.sms.read | onda-sms.cluster-ro-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 53607 |
| obs-system | db.obs.read | obs-system.cluster-ro-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 54207 |
| cms-cde-reservaion-api | db.cms.read | cms-cde-reservaion-api.cluster-ro-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 54307 |
| booking-prd | db.booking.read | booking-prd.cluster-ro-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 55107 |

### 개발 DB

| 클러스터명 | Login Path | 비고 |
|---|---|---|
| gds-dev | db.gds.dev | 개발 환경 |

### DocumentDB

| 클러스터명 | 엔드포인트 | 포트 |
|---|---|---|
| EVCMS | evcms-documentdb-production.cluster-cfreopdapfya.ap-northeast-2.docdb.amazonaws.com | 27018 |

### MongoDB Atlas

| 클러스터명 | 비고 |
|---|---|
| onda-notification | |
| vendor | |
| content | |

---

## 클러스터별 논리 DB 매핑

| 클러스터 | 논리 DB |
|---|---|
| onda-aurora-cluster (hub) | gds, vendor, sms, ari, pcs, sales, pms, raw, hlabs, auth, mapping |
| onda-plus-cluster (pplus) | ari, pcs, pms, raw, sales, settlement, sms |
| obs-system | CDE, auth, cms, misc |
| onda-standard-property (osp) | (확인 필요) |
| onda-sms | (확인 필요) |
| onda-backoffice | (확인 필요) |
| onda-misc-vendor-raw | (확인 필요) |
| cms-cde-reservaion-api | (확인 필요) |
| auth-cluster | (확인 필요) |
| b2e-rds-prd-cluster | (확인 필요) |
| booking-prd | (확인 필요) |
