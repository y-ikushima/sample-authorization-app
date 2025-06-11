CREATE TABLE aws_account (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    note VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE aws_account_system_relation (
    id VARCHAR(100) PRIMARY KEY,
    aws_account_id VARCHAR(100) NOT NULL,
    system_id VARCHAR(100) NOT NULL
);

CREATE TABLE aws_account_user_relation (
    id VARCHAR(100) PRIMARY KEY,
    aws_account_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL
);

-- AWSアカウント作成
INSERT INTO aws_account (id, name, note) VALUES ('aws1', 'AWS Account 1', 'Development AWS');
INSERT INTO aws_account (id, name, note) VALUES ('aws2', 'AWS Account 2', 'Production AWS');

-- AWSとシステムの関係（単一システムに所属）
INSERT INTO aws_account_system_relation (id, aws_account_id, system_id) VALUES ('0001', 'aws1', 'system1');
INSERT INTO aws_account_system_relation (id, aws_account_id, system_id) VALUES ('0002', 'aws2', 'system2');

-- AWS権限割り当て（システム権限とは独立）
-- aws1: jiro（オーナー）、saburo（マネージャー）、hanako（スタッフ）
INSERT INTO aws_account_user_relation (id, aws_account_id, user_id, role) VALUES ('0001', 'aws1', 'jiro', 'owner');
INSERT INTO aws_account_user_relation (id, aws_account_id, user_id, role) VALUES ('0002', 'aws1', 'saburo', 'manager');
INSERT INTO aws_account_user_relation (id, aws_account_id, user_id, role) VALUES ('0003', 'aws1', 'hanako', 'staff');

-- aws2: alice（オーナー）
INSERT INTO aws_account_user_relation (id, aws_account_id, user_id, role) VALUES ('0004', 'aws2', 'alice', 'owner');