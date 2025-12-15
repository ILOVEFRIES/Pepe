-- CreateTable
CREATE TABLE `user` (
    `u_id` INTEGER NOT NULL AUTO_INCREMENT,
    `u_email` VARCHAR(191) NOT NULL,
    `u_type` ENUM('admin', 'customer') NOT NULL,
    `u_password` VARCHAR(191) NOT NULL,
    `u_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `u_updated_at` DATETIME(3) NULL,
    `u_is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `user_u_email_key`(`u_email`),
    PRIMARY KEY (`u_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outlet` (
    `o_id` INTEGER NOT NULL AUTO_INCREMENT,
    `o_name` VARCHAR(191) NOT NULL,
    `o_u_id` INTEGER NOT NULL,
    `o_tax` DOUBLE NOT NULL,
    `o_sc` DOUBLE NOT NULL,
    `o_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `o_updated_at` DATETIME(3) NOT NULL,
    `o_is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `outlet_o_name_key`(`o_name`),
    PRIMARY KEY (`o_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu` (
    `m_id` INTEGER NOT NULL AUTO_INCREMENT,
    `m_sku` VARCHAR(191) NOT NULL,
    `m_name` VARCHAR(191) NOT NULL,
    `m_desc` VARCHAR(191) NOT NULL,
    `m_picture_url` VARCHAR(191) NULL,
    `m_category` VARCHAR(191) NOT NULL,
    `m_is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `menu_m_sku_key`(`m_sku`),
    PRIMARY KEY (`m_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_subitem` (
    `ms_id` INTEGER NOT NULL AUTO_INCREMENT,
    `ms_parent_id` INTEGER NOT NULL,
    `ms_subitem_id` INTEGER NOT NULL,

    PRIMARY KEY (`ms_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outlet_menu` (
    `om_id` INTEGER NOT NULL AUTO_INCREMENT,
    `om_m_id` INTEGER NOT NULL,
    `om_o_id` INTEGER NOT NULL,
    `om_price` DOUBLE NOT NULL,
    `om_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `om_updated_at` DATETIME(3) NOT NULL,
    `om_is_deleted` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`om_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order` (
    `or_id` INTEGER NOT NULL AUTO_INCREMENT,
    `or_uid` VARCHAR(191) NOT NULL,
    `or_o_id` INTEGER NOT NULL,
    `or_table_no` VARCHAR(191) NOT NULL,
    `or_u_id` INTEGER NOT NULL,
    `or_tax` DOUBLE NOT NULL,
    `or_sc` DOUBLE NOT NULL,
    `or_subtotal` DOUBLE NOT NULL,
    `or_grand_total` DOUBLE NOT NULL,
    `or_order_item` LONGTEXT NOT NULL,

    UNIQUE INDEX `order_or_uid_key`(`or_uid`),
    PRIMARY KEY (`or_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `outlet` ADD CONSTRAINT `outlet_o_u_id_fkey` FOREIGN KEY (`o_u_id`) REFERENCES `user`(`u_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_subitem` ADD CONSTRAINT `menu_subitem_ms_parent_id_fkey` FOREIGN KEY (`ms_parent_id`) REFERENCES `menu`(`m_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_subitem` ADD CONSTRAINT `menu_subitem_ms_subitem_id_fkey` FOREIGN KEY (`ms_subitem_id`) REFERENCES `menu`(`m_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outlet_menu` ADD CONSTRAINT `outlet_menu_om_m_id_fkey` FOREIGN KEY (`om_m_id`) REFERENCES `menu`(`m_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outlet_menu` ADD CONSTRAINT `outlet_menu_om_o_id_fkey` FOREIGN KEY (`om_o_id`) REFERENCES `outlet`(`o_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_or_o_id_fkey` FOREIGN KEY (`or_o_id`) REFERENCES `outlet`(`o_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_or_u_id_fkey` FOREIGN KEY (`or_u_id`) REFERENCES `user`(`u_id`) ON DELETE CASCADE ON UPDATE CASCADE;
