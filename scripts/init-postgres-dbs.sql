-- Roda so na primeira inicializacao do volume do container postgres
-- (docker-entrypoint-initdb.d). POSTGRES_DB (docker-compose.yml) ja cria
-- erp_mafa; aqui so criamos o banco separado usado pelos testes de
-- integracao (apps/api/.env.test) para nunca sujar os dados de dev.
--
-- O papel erp_mafa_app usa a MESMA senha de bootstrap da migration
-- 20260805130000_add_row_level_security e de apps/api/.env.example — se
-- divergirem, a API local nao consegue conectar.
CREATE ROLE erp_mafa_app LOGIN PASSWORD 'ErpMafaApp!2026Local' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE DATABASE erp_mafa_test;
