-- Roda so na primeira inicializacao do volume do container postgres
-- (docker-entrypoint-initdb.d). POSTGRES_DB (docker-compose.yml) ja cria
-- erp_mafa; aqui so criamos o banco separado usado pelos testes de
-- integracao (apps/api/.env.test) para nunca sujar os dados de dev.
CREATE ROLE erp_mafa_app LOGIN PASSWORD 'erp_mafa_app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE DATABASE erp_mafa_test;
