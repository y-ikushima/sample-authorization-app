CREATE TABLE system (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    note VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE system_user_relation (
    id VARCHAR(100) PRIMARY KEY,
    system_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL
);

-- システム作成
INSERT INTO system (id, name, note) VALUES ('system1', 'System 1', 'Development System');
INSERT INTO system (id, name, note) VALUES ('system2', 'System 2', 'Staging System');
INSERT INTO system (id, name, note) VALUES ('system3', 'System 3', 'Production System');
INSERT INTO system (id, name, note) VALUES ('system4', 'System 4', 'Testing System');

-- システム権限割り当て（新しい認可条件に基づく）
-- jiro: system1とsystem2のオーナー
INSERT INTO system_user_relation (id, system_id, user_id, role) VALUES ('0001', 'system1', 'jiro', 'owner');
INSERT INTO system_user_relation (id, system_id, user_id, role) VALUES ('0002', 'system2', 'jiro', 'owner');

-- saburo: system1とsystem3のマネージャー
INSERT INTO system_user_relation (id, system_id, user_id, role) VALUES ('0003', 'system1', 'saburo', 'manager');
INSERT INTO system_user_relation (id, system_id, user_id, role) VALUES ('0004', 'system3', 'saburo', 'manager');

-- hanako: system2とsystem3のスタッフ
INSERT INTO system_user_relation (id, system_id, user_id, role) VALUES ('0005', 'system2', 'hanako', 'staff');
INSERT INTO system_user_relation (id, system_id, user_id, role) VALUES ('0006', 'system3', 'hanako', 'staff');

-- alice: system4のスタッフ
INSERT INTO system_user_relation (id, system_id, user_id, role) VALUES ('0007', 'system4', 'alice', 'staff');