-- Rush Hours Initial PostgreSQL Schema Migration
-- Creates custom ENUMs and core tables:
-- canteens, menu_items, stock, time_slots, students, staff, orders, order_items, pickup_tokens

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------
-- Custom Enum Types
-- ----------------------------------------------------
CREATE TYPE "StockMode" AS ENUM ('COUNTABLE', 'SLOT_CAPACITY');
CREATE TYPE "OrderStatus" AS ENUM ('PAID', 'CONFIRMED', 'PREPARING', 'READY', 'COLLECTED', 'FORFEITED', 'REFUNDED');
CREATE TYPE "StaffRole" AS ENUM ('MANAGER', 'COUNTER_STAFF');

-- ----------------------------------------------------
-- Table: canteens
-- ----------------------------------------------------
CREATE TABLE "canteens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(150),
    "opening_time" VARCHAR(10) NOT NULL,
    "closing_time" VARCHAR(10) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canteens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "canteens_code_key" UNIQUE ("code")
);

-- ----------------------------------------------------
-- Table: menu_items
-- ----------------------------------------------------
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "canteen_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10, 2) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "image_url" TEXT,
    "stock_mode" "StockMode" NOT NULL DEFAULT 'COUNTABLE',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "menu_items_canteen_id_fkey" FOREIGN KEY ("canteen_id") REFERENCES "canteens"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "menu_items_canteen_id_is_available_idx" ON "menu_items"("canteen_id", "is_available");

-- ----------------------------------------------------
-- Table: stock (countable quantities, guarded by atomic check)
-- ----------------------------------------------------
CREATE TABLE "stock" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "menu_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "daily_total" INTEGER NOT NULL DEFAULT 0,
    "last_restocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stock_menu_item_id_key" UNIQUE ("menu_item_id"),
    CONSTRAINT "stock_quantity_non_negative" CHECK ("quantity" >= 0),
    CONSTRAINT "stock_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ----------------------------------------------------
-- Table: time_slots (per canteen capacity limits)
-- ----------------------------------------------------
CREATE TABLE "time_slots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "canteen_id" UUID NOT NULL,
    "slot_date" VARCHAR(10) NOT NULL,
    "start_time" VARCHAR(10) NOT NULL,
    "end_time" VARCHAR(10) NOT NULL,
    "max_orders" INTEGER NOT NULL DEFAULT 30,
    "current_orders" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "time_slots_canteen_id_slot_date_start_time_end_time_key" UNIQUE ("canteen_id", "slot_date", "start_time", "end_time"),
    CONSTRAINT "time_slots_current_orders_check" CHECK ("current_orders" >= 0 AND "current_orders" <= "max_orders"),
    CONSTRAINT "time_slots_canteen_id_fkey" FOREIGN KEY ("canteen_id") REFERENCES "canteens"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "time_slots_canteen_id_slot_date_idx" ON "time_slots"("canteen_id", "slot_date");

-- ----------------------------------------------------
-- Table: students
-- ----------------------------------------------------
CREATE TABLE "students" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "roll_number" VARCHAR(30) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "students_roll_number_key" UNIQUE ("roll_number"),
    CONSTRAINT "students_email_key" UNIQUE ("email")
);

-- ----------------------------------------------------
-- Table: staff (linked to a specific canteen)
-- ----------------------------------------------------
CREATE TABLE "staff" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "canteen_id" UUID NOT NULL,
    "staff_code" VARCHAR(30) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'COUNTER_STAFF',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "staff_staff_code_key" UNIQUE ("staff_code"),
    CONSTRAINT "staff_email_key" UNIQUE ("email"),
    CONSTRAINT "staff_canteen_id_fkey" FOREIGN KEY ("canteen_id") REFERENCES "canteens"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ----------------------------------------------------
-- Table: orders
-- ----------------------------------------------------
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "order_number" VARCHAR(40) NOT NULL,
    "student_id" UUID NOT NULL,
    "canteen_id" UUID NOT NULL,
    "time_slot_id" UUID,
    "status" "OrderStatus" NOT NULL DEFAULT 'PAID',
    "total_amount" DECIMAL(10, 2) NOT NULL,
    "razorpay_order_id" VARCHAR(100),
    "razorpay_payment_id" VARCHAR(100),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "orders_order_number_key" UNIQUE ("order_number"),
    CONSTRAINT "orders_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_canteen_id_fkey" FOREIGN KEY ("canteen_id") REFERENCES "canteens"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "time_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "orders_canteen_id_status_idx" ON "orders"("canteen_id", "status");
CREATE INDEX "orders_student_id_created_at_idx" ON "orders"("student_id", "created_at");

-- ----------------------------------------------------
-- Table: order_items
-- ----------------------------------------------------
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "order_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10, 2) NOT NULL,
    "subtotal" DECIMAL(10, 2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ----------------------------------------------------
-- Table: pickup_tokens (OTP & QR verification)
-- ----------------------------------------------------
CREATE TABLE "pickup_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "order_id" UUID NOT NULL,
    "otp_code" VARCHAR(10) NOT NULL,
    "qr_payload" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pickup_tokens_order_id_key" UNIQUE ("order_id"),
    CONSTRAINT "pickup_tokens_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "pickup_tokens_otp_code_idx" ON "pickup_tokens"("otp_code");
