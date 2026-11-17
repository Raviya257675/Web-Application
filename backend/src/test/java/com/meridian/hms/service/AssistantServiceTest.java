package com.meridian.hms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meridian.hms.common.ApiException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

class AssistantServiceTest {
    private HttpServer server;
    private final ObjectMapper mapper = new ObjectMapper();
    private final AtomicReference<String> sent = new AtomicReference<>();
    private String endpoint;
    private int responseCode = 200;
    private String response = "{\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\"Open Book a visit.\"}]}]}";
    @BeforeEach void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/reply", exchange -> {
            sent.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(responseCode, bytes.length);
            exchange.getResponseBody().write(bytes); exchange.close();
        });
        server.start(); endpoint = "http://127.0.0.1:" + server.getAddress().getPort() + "/reply";
    }
    @AfterEach void stop() { server.stop(0); }
    private AssistantService service(String key) throws Exception { return new AssistantService(mapper, "openai", key, "test-model", endpoint); }
    private List<AssistantService.Turn> question() { return List.of(new AssistantService.Turn("user", "How do I book?")); }
    @Test void noKeyIsExplicitlyUnavailable() throws Exception {
        var service = service(""); assertFalse(service.configured());
        assertEquals("AI_NOT_CONFIGURED", assertThrows(ApiException.class, () -> service.answer(question(), "VISITOR")).code());
        assertNull(sent.get());
    }
    @Test void sendsGroundedInstructionsAndDisablesStorage() throws Exception {
        assertEquals("Open Book a visit.", service("fake-test-key").answer(question(), "ROLE_PATIENT"));
        var body = mapper.readTree(sent.get());
        assertFalse(body.path("store").asBoolean());
        assertTrue(body.path("instructions").asText().contains("ROLE_PATIENT"));
        assertTrue(body.path("instructions").asText().contains("Staff approvals"));
        assertEquals("How do I book?", body.path("input").get(0).path("content").asText());
        assertFalse(sent.get().contains("fake-test-key"));
    }
    @Test void providerFailureDoesNotExposeSecrets() throws Exception {
        responseCode = 401; response = "secret provider debug data";
        var service = service("fake-test-key");
        var failure = assertThrows(ApiException.class, () -> service.answer(question(), "VISITOR"));
        assertEquals("AI_KEY_INVALID", failure.code()); assertFalse(failure.getMessage().contains("secret"));
    }
    @Test void quotaErrorsAreRetryable() throws Exception {
        responseCode = 429; var service = service("test");
        assertEquals("AI_LIMIT", assertThrows(ApiException.class, () -> service.answer(question(), "VISITOR")).code());
    }
    @Test void emptyAnswerIsNotSuccess() throws Exception {
        response = "{}"; var service = service("test");
        assertThrows(ApiException.class, () -> service.answer(question(), "VISITOR"));
    }
    @Test void quotaExhaustionIsNotReportedAsTemporaryRateLimit() throws Exception {
        responseCode = 429; response = "{\"error\":{\"code\":\"insufficient_quota\",\"message\":\"secret\"}}";
        var service = service("test");
        var failure = assertThrows(ApiException.class, () -> service.answer(question(), "VISITOR"));
        assertEquals("AI_QUOTA", failure.code()); assertFalse(failure.getMessage().contains("secret"));
    }
    @Test void modelAndRequestErrorsAreDistinguishable() throws Exception {
        var service = service("test"); responseCode = 404;
        assertEquals("AI_MODEL", assertThrows(ApiException.class, () -> service.answer(question(), "VISITOR")).code());
        responseCode = 400;
        assertEquals("AI_REQUEST", assertThrows(ApiException.class, () -> service.answer(question(), "VISITOR")).code());
    }
    @Test void localProviderWorksWithoutKeyAndDisablesThinking() throws Exception {
        response = "{\"message\":{\"role\":\"assistant\",\"content\":\"Open Book a visit.\"},\"done\":true}";
        var local = new AssistantService(mapper, "ollama", "", "qwen3:1.7b", endpoint);
        assertTrue(local.configured());
        assertEquals("Open Book a visit.", local.answer(question(), "ROLE_PATIENT"));
        var body = mapper.readTree(sent.get());
        assertFalse(body.path("think").asBoolean());
        assertFalse(body.path("stream").asBoolean());
        assertEquals(8192, body.path("options").path("num_ctx").asInt());
        assertEquals("system", body.path("messages").get(0).path("role").asText());
    }
    @Test void missingLocalModelHasAnActionableMessage() throws Exception {
        responseCode = 404;
        var local = new AssistantService(mapper, "ollama", "", "qwen3:1.7b", endpoint);
        assertEquals("AI_LOCAL_MODEL", assertThrows(ApiException.class, () -> local.answer(question(), "VISITOR")).code());
    }
}
