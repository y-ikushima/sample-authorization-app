CREATE TABLE system (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    note VARCHAR(100) UNIQUE NOT NULL
);


CREATE TABLE system_user_relation    (
    id VARCHAR(100) PRIMARY KEY,
    system_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL
);



insert into system (id, name, note) values ('system1', 'system1', 'system1_note');
insert into system (id, name, note) values ('system2', 'system2', 'system2_note');
insert into system (id, name, note) values ('system3', 'system3', 'system3_note');

insert into system_user_relation (id, system_id, user_id) values ('0001', 'system1', 'taro');
insert into system_user_relation (id, system_id, user_id) values ('0002', 'system2', 'jiro');
insert into system_user_relation (id, system_id, user_id) values ('0003', 'system3', 'saburo');
insert into system_user_relation (id, system_id, user_id) values ('0004', 'system3', 'hanako');