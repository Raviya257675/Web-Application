package com.meridian.hms.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.meridian.hms.domain.Enums.NotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
public class Notification extends BaseEntity {

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type = NotificationType.SYSTEM;

    private String link;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    public Notification(User user, String title, String message, NotificationType type, String link) {
        this.user = user;
        this.title = title;
        this.message = message;
        this.type = type;
        this.link = link;
    }
}
