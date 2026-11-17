package com.meridian.hms.controller;

import com.meridian.hms.common.*;
import com.meridian.hms.service.AssistantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/public/assistant")
public class AssistantController {
    private final AssistantService service;
    private final Map<String, Window> limits = new HashMap<>();
    private record Window(long start, int count) {}
    public AssistantController(AssistantService service) { this.service = service; }
    public record Message(@NotBlank @Pattern(regexp="user|assistant") String role,
                          @NotBlank @Size(max=2000) String content) {}
    public record ChatRequest(@NotEmpty @Size(max=12) List<@NotNull @Valid Message> messages) {}
    @GetMapping("/status")
    public ApiResponse<?> status() { return ApiResponse.ok(Map.of("configured", service.configured(), "provider", service.provider())); }
    @PostMapping("/chat")
    public ApiResponse<?> chat(@Valid @RequestBody ChatRequest body, HttpServletRequest request, Authentication auth) {
        if (!body.messages().getLast().role().equals("user")) throw ApiException.badRequest("INVALID_CHAT", "The last message must be your question.");
        limit(request.getRemoteAddr());
        String role = auth == null ? "VISITOR" : auth.getAuthorities().stream().map(a -> a.getAuthority()).filter(a -> a.startsWith("ROLE_")).findFirst().orElse("VISITOR");
        var turns = body.messages().stream().map(m -> new AssistantService.Turn(m.role(), m.content())).toList();
        return ApiResponse.ok(Map.of("reply", service.answer(turns, role)));
    }
    private synchronized void limit(String address) {
        long now = System.currentTimeMillis();
        limits.entrySet().removeIf(e -> now - e.getValue().start() >= 60_000);
        Window window = limits.get(address);
        if ((window != null && window.count() >= 12) || (window == null && limits.size() >= 2000))
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "CHAT_RATE_LIMIT", "Please wait a minute before sending more messages.");
        limits.put(address, new Window(window == null ? now : window.start(), window == null ? 1 : window.count() + 1));
    }
}
