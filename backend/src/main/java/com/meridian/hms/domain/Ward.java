package com.meridian.hms.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.meridian.hms.domain.Enums.BedStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "wards")
@Getter
@Setter
@NoArgsConstructor
public class Ward extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    private String type;

    private String floor;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    @JsonIgnore
    @OneToMany(mappedBy = "ward", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Bed> beds = new ArrayList<>();

    @Transient
    private long totalBeds;

    @Transient
    private long occupiedBeds;

    public Ward(String name, String type, String floor, String description) {
        this.name = name;
        this.type = type;
        this.floor = floor;
        this.description = description;
    }
}
