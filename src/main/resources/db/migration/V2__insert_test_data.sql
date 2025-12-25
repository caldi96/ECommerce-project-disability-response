-- 테스트용 사용자 데이터 (1~1000)
INSERT INTO users (id, username, password, point_balance) VALUES
(1, 'user1', 'password', 100000.00),
(2, 'user2', 'password', 100000.00),
(3, 'user3', 'password', 100000.00),
(4, 'user4', 'password', 100000.00),
(5, 'user5', 'password', 100000.00);

-- 추가 사용자 (6~1000)을 위한 프로시저
DELIMITER $$
CREATE PROCEDURE insert_test_users()
BEGIN
    DECLARE i INT DEFAULT 6;
    WHILE i <= 1000 DO
        INSERT INTO users (id, username, password, point_balance)
        VALUES (i, CONCAT('user', i), 'password', 100000.00);
        SET i = i + 1;
    END WHILE;
END$$
DELIMITER ;

CALL insert_test_users();
DROP PROCEDURE insert_test_users;

-- 테스트용 카테고리 데이터
INSERT INTO categories (id, category_name, display_order) VALUES
(1, '전자제품', 1),
(2, '의류', 2),
(3, '식품', 3),
(4, '도서', 4),
(5, '생활용품', 5);

-- 테스트용 상품 데이터 (1~40, 충분한 재고)
INSERT INTO products (id, category_id, name, description, price, stock, is_active, view_count, sold_count) VALUES
(1, 1, '노트북', '고성능 노트북', 1500000.00, 10000, TRUE, 100, 50),
(2, 1, '스마트폰', '최신 스마트폰', 1200000.00, 10000, TRUE, 200, 100),
(3, 1, '태블릿', '대화면 태블릿', 800000.00, 10000, TRUE, 150, 75),
(4, 1, '무선이어폰', '노이즈 캔슬링 이어폰', 300000.00, 10000, TRUE, 300, 200),
(5, 1, '스마트워치', '헬스케어 스마트워치', 400000.00, 10000, TRUE, 250, 150),
(6, 2, '티셔츠', '면 100% 티셔츠', 30000.00, 10000, TRUE, 400, 300),
(7, 2, '청바지', '슬림핏 청바지', 80000.00, 10000, TRUE, 350, 250),
(8, 2, '운동화', '러닝화', 120000.00, 10000, TRUE, 500, 400),
(9, 2, '자켓', '방풍 자켓', 150000.00, 10000, TRUE, 200, 100),
(10, 2, '모자', '야구 모자', 25000.00, 10000, TRUE, 300, 200);

-- 추가 상품 (11~40)
DELIMITER $$
CREATE PROCEDURE insert_test_products()
BEGIN
    DECLARE i INT DEFAULT 11;
    WHILE i <= 40 DO
        INSERT INTO products (id, category_id, name, description, price, stock, is_active, view_count, sold_count)
        VALUES (
            i,
            ((i - 1) MOD 5) + 1,
            CONCAT('상품', i),
            CONCAT('테스트 상품 ', i),
            50000.00 + (i * 1000),
            10000,
            TRUE,
            100,
            50
        );
        SET i = i + 1;
    END WHILE;
END$$
DELIMITER ;

CALL insert_test_products();
DROP PROCEDURE insert_test_products;