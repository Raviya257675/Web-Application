package com.meridian.hms;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meridian.hms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:auth-test;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class AuthIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;

    @Test
    void registrationAndLoginUseStoredCredentialsThroughGatewayOrigin() throws Exception {
        String body = "{\"name\":\"New Patient\",\"email\":\"new.patient@example.com\",\"password\":\"UniquePass456!\",\"gender\":\"FEMALE\"}";
        mvc.perform(post("/api/auth/register").header("Origin", "http://localhost:5000")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.role").value("PATIENT"))
                .andExpect(jsonPath("$.data.accessToken").doesNotExist());
        var stored = users.findByEmailIgnoreCase("new.patient@example.com").orElseThrow();
        assertThat(stored.getPasswordHash()).isNotEqualTo("UniquePass456!");
        assertThat(passwords.matches("UniquePass456!", stored.getPasswordHash())).isTrue();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/auth/login").header("Origin", "http://localhost:5000")
                .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"new.patient@example.com\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
        var result = mvc.perform(post("/api/auth/login").header("Origin", "http://127.0.0.1:5000")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn();
        String token = json.readTree(result.getResponse().getContentAsString()).at("/data/accessToken").asText();
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.email").value("new.patient@example.com"));
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").header("Origin", "https://untrusted.example")
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
    }
}
