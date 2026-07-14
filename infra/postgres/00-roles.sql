DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'source_mesh_app') THEN
    CREATE ROLE source_mesh_app LOGIN PASSWORD 'dummy-app-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE source_mesh TO source_mesh_app;
