CREATE TABLE user_info (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);

-- Admin ユーザー
INSERT INTO user_info (id, name, email) VALUES ('taro', 'TARO(Admin)', 'taro@example.com');

-- システム権限を持つユーザー
INSERT INTO user_info (id, name, email) VALUES ('jiro', 'Jiro(Owner)', 'jiro@example.com');
INSERT INTO user_info (id, name, email) VALUES ('saburo', 'Saburo(Manager)', 'saburo@example.com');
INSERT INTO user_info (id, name, email) VALUES ('hanako', 'Hanako(Staff)', 'hanako@example.com');

-- AWS権限のみ持つユーザー
INSERT INTO user_info (id, name, email) VALUES ('alice', 'Alice(AWS Only)', 'alice@example.com');

-- 権限なしユーザー
INSERT INTO user_info (id, name, email) VALUES ('bob', 'Bob(No Permission)', 'bob@example.com');