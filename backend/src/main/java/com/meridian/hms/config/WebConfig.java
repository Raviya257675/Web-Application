package com.meridian.hms.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * The React single-page app is copied into src/main/resources/static at build time.
 * Every client-side route falls through to index.html, while /api/** stays with the
 * REST controllers and unknown assets still return a real 404.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
        registry.addViewController("/login").setViewName("forward:/index.html");
        registry.addViewController("/register").setViewName("forward:/index.html");
        registry.addViewController("/account").setViewName("forward:/index.html");
        registry.addViewController("/dashboard").setViewName("forward:/index.html");
        registry.addViewController("/receptionist/**").setViewName("forward:/index.html");
        registry.addViewController("/pharmacist/**").setViewName("forward:/index.html");
        registry.addViewController("/admin/**").setViewName("forward:/index.html");
        registry.addViewController("/doctor/**").setViewName("forward:/index.html");
        registry.addViewController("/patient/**").setViewName("forward:/index.html");
    }
}
