# Sean 사용자 DB 권한 축소 작업

**작업일**: 2025-11-27
**작업자**: jade
**대상 사용자**: sean (DBA, 퇴사 예정)

---

## 작업 개요

DBA였던 sean 사용자의 퇴사 준비로 인해 모든 DB에서 권한을 최소화하는 작업.

### 목표 권한
```sql
GRANT SELECT, PROCESS, SHOW DATABASES ON *.* TO 'sean'@'호스트';
-- GRANT OPTION 제거
```

---

## 대상 DB 및 현황

### 연결 가능 DB (7개)

| DB | Login Path | sean 호스트 | 작업 상태 |
|---|---|---|---|
| hub.write | hub.write | 10.13.30.%, 10.243.0.%, 192.168.15.% | 대기 |
| db.osp | db.osp | 10.13.30.%, 10.243.0.%, 192.168.15.% | 대기 |
| db.sms | db.sms | 10.13.30.%, 10.243.0.%, 192.168.15.% | 대기 |
| db.voucher | db.voucher | 10.13.30.%, 10.243.0.%, 192.168.15.% | 대기 |
| db.auth | db.auth | 10.13.30.%, 10.243.0.%, 192.168.15.% | 대기 |
| db.pplus.write | db.pplus.write | 10.13.30.%, 10.243.0.%, 192.168.15.% | 대기 |
| db.bo.write | db.bo.write | 10.13.30.%, 10.243.0.%, 192.168.15.% | 대기 |

### 연결 불가 DB (1개) - 별도 작업 필요

| DB | Login Path | 에러 |
|---|---|---|
| db.misc | db.misc | Lost connection (패킷 읽기 오류) |

### 추가 확인된 DB (2개) - 작업 완료

| DB | Login Path | RDS 클러스터 | 터널 포트 |
|---|---|---|---|
| obs-system | db.obs | obs-system.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 54206 |
| cms-cde-reservaion-api | db.cms | cms-cde-reservaion-api.cluster-cfreopdapfya.ap-northeast-2.rds.amazonaws.com | 54306 |

---

## 작업 전 권한 현황

### jade 권한 (변경 전)

| DB | 권한 |
|---|---|
| hub.write | 전체 권한 (GRANT OPTION 없음) |
| db.osp | SELECT, PROCESS, SHOW DATABASES |
| db.sms | 전체 (RELOAD, CREATE USER, ROLE 제외, GRANT OPTION 없음) |
| db.voucher | SELECT, PROCESS, SHOW DATABASES |
| db.auth | 전체 (RELOAD, CREATE USER, ROLE 제외, GRANT OPTION 없음) |
| db.pplus.write | 전체 권한 (GRANT OPTION 없음) |
| db.bo.write | 전체 (RELOAD, CREATE USER, ROLE 제외, GRANT OPTION 없음) |

### sean 권한 (변경 전) - 모든 DB 동일

```sql
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, PROCESS,
      REFERENCES, INDEX, ALTER, SHOW DATABASES, CREATE TEMPORARY TABLES,
      LOCK TABLES, EXECUTE, CREATE VIEW, SHOW VIEW, CREATE ROUTINE,
      ALTER ROUTINE, CREATE USER, EVENT, TRIGGER, CREATE ROLE, DROP ROLE
ON *.* TO `sean`@`호스트` WITH GRANT OPTION
```

---

## 작업 절차

### 1단계: sean 계정으로 jade 권한 상향

jade가 GRANT OPTION이 없어서 sean 권한을 변경할 수 없으므로, 먼저 sean 계정으로 jade 권한을 상향해야 함.

**sean 비밀번호**: (제거됨)

### 2단계: jade 계정으로 sean 권한 축소

각 DB에서 sean의 3개 호스트 모두에 대해:
1. REVOKE ALL PRIVILEGES
2. GRANT SELECT, PROCESS, SHOW DATABASES (GRANT OPTION 없이)
3. FLUSH PRIVILEGES

---

## 실행 SQL

### jade 권한 상향 (sean 계정으로 실행)

```sql
-- 각 DB에서 실행
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, PROCESS,
      REFERENCES, INDEX, ALTER, SHOW DATABASES, CREATE TEMPORARY TABLES,
      LOCK TABLES, EXECUTE, CREATE VIEW, SHOW VIEW, CREATE ROUTINE,
      ALTER ROUTINE, CREATE USER, EVENT, TRIGGER
ON *.* TO 'jade'@'10.13.30.%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

### sean 권한 축소 (jade 계정으로 실행)

```sql
-- 각 DB에서 각 호스트별로 실행
REVOKE ALL PRIVILEGES, GRANT OPTION ON *.* FROM 'sean'@'10.13.30.%';
REVOKE ALL PRIVILEGES, GRANT OPTION ON *.* FROM 'sean'@'10.243.0.%';
REVOKE ALL PRIVILEGES, GRANT OPTION ON *.* FROM 'sean'@'192.168.15.%';

GRANT SELECT, PROCESS, SHOW DATABASES ON *.* TO 'sean'@'10.13.30.%';
GRANT SELECT, PROCESS, SHOW DATABASES ON *.* TO 'sean'@'10.243.0.%';
GRANT SELECT, PROCESS, SHOW DATABASES ON *.* TO 'sean'@'192.168.15.%';

FLUSH PRIVILEGES;
```

---

## 작업 로그

### 2025-11-27

- [x] hub.write 완료
- [x] db.osp 완료
- [x] db.sms 완료
- [x] db.voucher 완료
- [x] db.auth 완료
- [x] db.pplus.write 완료
- [x] db.bo.write 완료
- [x] db.bookingon 완료 (jade 계정 신규 생성, SSH 터널 포트 55106 사용)
- [x] obs-system 완료 (jade 계정 신규 생성, db.obs 포트 54206)
- [x] cms-cde-reservaion-api 완료 (jade 비밀번호 재설정, db.cms 포트 54306)
- [x] ian 계정 삭제 (hub.write, db.voucher에서 ian@10.13.30.% 삭제)

---

## 작업 후 권한 현황

### jade 권한 (변경 후)

모든 DB에서 WITH GRANT OPTION 추가됨:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, PROCESS,
      REFERENCES, INDEX, ALTER, SHOW DATABASES, CREATE TEMPORARY TABLES,
      LOCK TABLES, EXECUTE, CREATE VIEW, SHOW VIEW, CREATE ROUTINE,
      ALTER ROUTINE, CREATE USER, EVENT, TRIGGER
ON *.* TO `jade`@`10.13.30.%` WITH GRANT OPTION
```

### sean 권한 (변경 후) - 모든 DB 동일

```sql
GRANT SELECT, PROCESS, SHOW DATABASES ON *.* TO `sean`@`10.13.30.%`
GRANT SELECT, PROCESS, SHOW DATABASES ON *.* TO `sean`@`10.243.0.%`
GRANT SELECT, PROCESS, SHOW DATABASES ON *.* TO `sean`@`192.168.15.%`
-- GRANT OPTION 제거됨
```

---

## 추후 작업

- [ ] db.misc 연결 확인 후 동일 작업
- [ ] sean 계정 삭제 (퇴사 완료 후)
