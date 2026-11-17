package com.meridian.hms.service;

import com.meridian.hms.common.ApiException;
import com.meridian.hms.domain.Enums.NotificationType;
import com.meridian.hms.domain.Enums.Role;
import com.meridian.hms.domain.Notification;
import com.meridian.hms.domain.User;
import com.meridian.hms.repository.NotificationRepository;
import com.meridian.hms.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    /** Fire-and-forget: a notification must never break the business action that produced it. */
    public void send(User user, String title, String message, NotificationType type, String link) {
        try {
            notificationRepository.save(new Notification(user, title, message, type, link));
        } catch (Exception ignored) {
            // logged by the repository layer; deliberately swallowed
        }
    }

    public void sendToRole(Role role, String title, String message, NotificationType type, String link) {
        userRepository.findByRoleOrderByNameAsc(role).stream()
                .filter(User::isActive)
                .forEach(u -> send(u, title, message, type, link));
    }

    public List<Notification> list(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long unreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public Notification markRead(Long userId, Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Notification"));
        if (!notification.getUser().getId().equals(userId)) {
            throw ApiException.forbidden("FORBIDDEN", "That notification is not yours");
        }
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @Transactional
    public int markAllRead(Long userId) {
        return notificationRepository.markAllRead(userId);
    }
}
