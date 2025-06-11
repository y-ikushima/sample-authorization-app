CREATE TABLE user_info (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);


insert into user_info (id, name, email) values ('taro', 'TARO(Admin)', 'taro@example.com');
insert into user_info (id, name, email) values ('jiro', 'Jiro(Owner)', 'jiro@example.com');
insert into user_info (id, name, email) values ('saburo', 'Saburo(Manager)', 'saburo@example.com');
insert into user_info (id, name, email) values ('hanako', 'Hanako(User)', 'hanako@example.com');