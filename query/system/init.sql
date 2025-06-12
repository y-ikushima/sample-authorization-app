CREATE TABLE system (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    note VARCHAR(100) NOT NULL
);

CREATE TABLE system_user_relation (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL,
    user_id TEXT NOT NULL
);

-- システム作成
INSERT INTO system (id, name, note) VALUES ('system1', 'System 1', 'Development System');
INSERT INTO system (id, name, note) VALUES ('system2', 'System 2', 'Staging System');
INSERT INTO system (id, name, note) VALUES ('system3', 'System 3', 'Production System');
INSERT INTO system (id, name, note) VALUES ('system4', 'System 4', 'Testing System');

-- システム権限割り当て
-- jiro: system1とsystem2に所属
INSERT INTO system_user_relation (id, system_id, user_id) VALUES ('0001', 'system1', 'jiro');
INSERT INTO system_user_relation (id, system_id, user_id) VALUES ('0002', 'system2', 'jiro');

-- saburo: system1とsystem3に所属
INSERT INTO system_user_relation (id, system_id, user_id) VALUES ('0003', 'system1', 'saburo');
INSERT INTO system_user_relation (id, system_id, user_id) VALUES ('0004', 'system3', 'saburo');

-- hanako: system2とsystem3に所属
INSERT INTO system_user_relation (id, system_id, user_id) VALUES ('0005', 'system2', 'hanako');
INSERT INTO system_user_relation (id, system_id, user_id) VALUES ('0006', 'system3', 'hanako');

-- alice: system4に所属
INSERT INTO system_user_relation (id, system_id, user_id) VALUES ('0007', 'system4', 'alice');