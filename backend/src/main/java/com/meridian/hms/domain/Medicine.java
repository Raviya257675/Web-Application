package com.meridian.hms.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "medicines")
@Getter
@Setter
@NoArgsConstructor
public class Medicine extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String sku;

    private String category;

    private String manufacturer;

    private String unit = "tablet";

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(nullable = false)
    private int reorderLevel = 20;

    @Column(nullable = false)
    private int stockQuantity = 0;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    public Medicine(String name, String sku, String category, String manufacturer, String unit,
                    BigDecimal price, int reorderLevel) {
        this.name = name;
        this.sku = sku;
        this.category = category;
        this.manufacturer = manufacturer;
        this.unit = unit;
        this.price = price;
        this.reorderLevel = reorderLevel;
    }
}
