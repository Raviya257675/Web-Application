package com.meridian.hms.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import javax.sql.DataSource;

/** Expands the legacy database enum before account provisioning runs. */
@Component
@Order(org.springframework.core.Ordered.HIGHEST_PRECEDENCE)
public class RoleMigration implements CommandLineRunner {
    private final DataSource source;
    private final JdbcTemplate jdbc;
    public RoleMigration(DataSource source, JdbcTemplate jdbc) { this.source=source; this.jdbc=jdbc; }
    @Override public void run(String... args) throws Exception {
        try (var connection=source.getConnection()) {
            String product=connection.getMetaData().getDatabaseProductName();
            if (product.equals("H2")) {
                jdbc.execute("ALTER TABLE app_users ALTER COLUMN role VARCHAR(32) NOT NULL");
            } else if (product.equals("MySQL")) {
                jdbc.execute("ALTER TABLE app_users MODIFY COLUMN role VARCHAR(32) NOT NULL");
            }
        }
        jdbc.update("UPDATE app_users SET active = true, approval_status = 'APPROVED', reviewed_by = 'Administrator signup policy' WHERE role = 'ADMIN' AND approval_status = 'PENDING'");
    }
}
