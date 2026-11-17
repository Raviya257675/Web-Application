package com.meridian.hms.repository;

import com.meridian.hms.domain.Enums.Role;
import com.meridian.hms.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from User u where u.id = :id")
    Optional<User> lockById(@org.springframework.data.repository.query.Param("id") Long id);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByRoleOrderByNameAsc(Role role);

    long countByRole(Role role);
}
