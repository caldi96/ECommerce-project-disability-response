-- 낙관적 락을 위한 version 컬럼 추가

-- users 테이블에 version 컬럼 추가
ALTER TABLE users ADD COLUMN version BIGINT DEFAULT 0 NOT NULL;

-- points 테이블에 version 컬럼 추가
ALTER TABLE points ADD COLUMN version BIGINT DEFAULT 0 NOT NULL;

-- user_coupons 테이블에 version 컬럼 추가
ALTER TABLE user_coupons ADD COLUMN version BIGINT DEFAULT 0 NOT NULL;