package com.meridian.hms;

import com.meridian.hms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:legacy-schema-review;DB_CLOSE_DELAY=-1",
    "spring.sql.init.mode=always", "spring.sql.init.schema-locations=classpath:legacy-users.sql",
    "spring.jpa.hibernate.ddl-auto=update", "app.seed.enabled=false"
})
class LegacySchemaMigrationTest {
    @Autowired UserRepository users;
    @Autowired JdbcTemplate jdbc;

    @Test void upgradingLegacyAccountsPreservesRowsAndAddsStaffFields() {
        var user = users.findByEmailIgnoreCase("legacy@example.test").orElseThrow();
        assertThat(user.getName()).isEqualTo("Legacy account");
        assertThat(user.getApprovalStatus()).isEqualTo("APPROVED");
        assertThat(user.isActive()).isTrue();
        assertThat(users.count()).isEqualTo(1);
        assertThat(jdbc.queryForList("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='APP_USERS'", String.class))
            .contains("APPLICATION_NOTE", "PROFESSIONAL_LICENSE", "REVIEW_NOTE", "REVIEWED_BY", "REVIEWED_AT");
        assertThat(jdbc.queryForObject("SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='APP_USERS' AND COLUMN_NAME='APPROVAL_STATUS'", Long.class))
            .isEqualTo(20L);
    }
}
