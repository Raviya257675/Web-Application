package com.meridian.hms.config;

import com.meridian.hms.domain.User;
import com.meridian.hms.domain.Enums.Role;
import com.meridian.hms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;

/** Optional local provisioning; never exposes an administrator registration API. */
@Component
public class AdminBootstrap implements CommandLineRunner {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepository users, PasswordEncoder passwords,
            @Value("${APP_ADMIN_EMAIL:}") String email,
            @Value("${APP_ADMIN_PASSWORD:}") String password) {
        this.users = users;
        this.passwords = passwords;
        this.email = email.trim().toLowerCase(Locale.ROOT);
        this.password = password;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (email.isEmpty() && password.isEmpty()) return;
        if (!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") || password.length() < 12
                || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Set APP_ADMIN_EMAIL and APP_ADMIN_PASSWORD (12 to 72 UTF-8 bytes) together.");
        }
        var existing = users.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            var user = existing.get();
            if (user.getRole() == Role.ADMIN && "PENDING".equals(user.getApprovalStatus()) && passwords.matches(password, user.getPasswordHash())) {
                user.setActive(true); user.setApprovalStatus("APPROVED");
                user.setReviewedBy("Local hospital setup"); user.setReviewedAt(java.time.LocalDateTime.now());
                users.save(user);
            }
            return;
        }
        users.save(new User("Hospital Administrator", email, passwords.encode(password), Role.ADMIN, null));
    }
}
