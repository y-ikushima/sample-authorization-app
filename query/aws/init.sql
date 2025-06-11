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
    user_id VARCHAR(100) NOT NULL
);

insert into aws_account (id, name, note) values ('aws_account_1', 'aws_account_1', 'aws_account_1_note');
insert into aws_account (id, name, note) values ('aws_account_2', 'aws_account_2', 'aws_account_2_note');
insert into aws_account (id, name, note) values ('aws_account_3', 'aws_account_3', 'aws_account_3_note');

insert into aws_account_system_relation (id, aws_account_id, system_id) values ('0001', 'aws_account_1', 'system1');
insert into aws_account_system_relation (id, aws_account_id, system_id) values ('0002', 'aws_account_2', 'system2');
insert into aws_account_system_relation (id, aws_account_id, system_id) values ('0003', 'aws_account_3', 'system3');

insert into aws_account_user_relation (id, aws_account_id, user_id) values ('0001', 'aws_account_1', 'taro');
insert into aws_account_user_relation (id, aws_account_id, user_id) values ('0002', 'aws_account_2', 'jiro');
insert into aws_account_user_relation (id, aws_account_id, user_id) values ('0003', 'aws_account_3', 'saburo');
insert into aws_account_user_relation (id, aws_account_id, user_id) values ('0004', 'aws_account_3', 'hanako');