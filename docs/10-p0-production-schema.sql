ALTER TABLE inventory_items
    ADD COLUMN min_quantity INT NOT NULL DEFAULT 5;

CREATE TABLE inventory_orders (
    id BIGINT NOT NULL AUTO_INCREMENT,
    brand_id BIGINT NOT NULL,
    store_id BIGINT NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    inventory_item_id BIGINT NOT NULL,
    product_code VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    current_quantity INT NOT NULL,
    min_quantity INT NOT NULL,
    order_quantity INT NOT NULL,
    unit_price INT NOT NULL,
    expected_amount INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    requested_by_id BIGINT NOT NULL,
    requested_by_name VARCHAR(255) NOT NULL,
    canceled_reason VARCHAR(255),
    created_at DATETIME(6),
    updated_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_inventory_orders_brand_created (brand_id, created_at),
    INDEX idx_inventory_orders_brand_store_status (brand_id, store_id, status)
);

CREATE TABLE sales_transactions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    brand_id BIGINT NOT NULL,
    store_id BIGINT NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    transaction_date_time DATETIME(6) NOT NULL,
    amount INT NOT NULL,
    order_count INT NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    source VARCHAR(20) NOT NULL,
    created_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_sales_brand_store_time (brand_id, store_id, transaction_date_time),
    INDEX idx_sales_brand_time (brand_id, transaction_date_time)
);

CREATE TABLE attendance_records (
    id BIGINT NOT NULL AUTO_INCREMENT,
    brand_id BIGINT NOT NULL,
    store_id BIGINT NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    work_date DATE NOT NULL,
    clock_in_at DATETIME(6),
    clock_out_at DATETIME(6),
    status VARCHAR(20) NOT NULL,
    total_minutes INT NOT NULL,
    note VARCHAR(255),
    created_at DATETIME(6),
    updated_at DATETIME(6),
    PRIMARY KEY (id),
    INDEX idx_attendance_brand_store_date (brand_id, store_id, work_date),
    INDEX idx_attendance_brand_user_date (brand_id, user_id, work_date)
);
