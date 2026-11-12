-- =============================================================================
-- LUMINA EYEWEAR — SEED DATA (PRD Section 4 & Prompt 7)
-- Populates authoritative inventory and demo data in MySQL
-- =============================================================================

USE `lumina_eyewear_db`;

-- Seed authoritative catalog products
INSERT INTO `products` (`id`, `name`, `category`, `category_label`, `price`, `original_price`, `stock`, `is_active`, `dimensions`, `frame_material`, `image_url`) VALUES
('lumina-01', 'Cyber Cat-Eye 18K Champagne', 'cateye', 'Mắt mèo (Cat-Eye)', 3250000.00, 3800000.00, 8, 1, '52-18-142 mm', 'Hợp kim Titan mạ vàng 18K', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80'),
('lumina-02', 'Celestial Aviator Titanium Gold', 'aviator', 'Phi công (Aviator)', 2850000.00, 3400000.00, 12, 1, '58-14-145 mm', 'Titanium siêu nhẹ cấp hàng không', 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=800&q=80'),
('lumina-03', 'Aura Minimalist Round Silver', 'round', 'Gọng tròn (Round)', 1950000.00, 2300000.00, 15, 1, '48-21-140 mm', 'Bạc Titanium đánh bóng gương', 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=800&q=80'),
('lumina-04', 'Neo-Classic Square Obsidian', 'square', 'Gọng vuông (Square)', 2450000.00, 2900000.00, 6, 1, '54-17-145 mm', 'Acetate Ý đen bóng nguyên khối', 'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=800&q=80'),
('lumina-05', 'Solaris Geometric Aviator Amber', 'aviator', 'Phi công (Aviator)', 3100000.00, 3600000.00, 5, 1, '59-15-146 mm', 'Titanium mạ vàng nhạt & Acetate', 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&w=800&q=80'),
('lumina-06', 'Vogue Edge Cat-Eye Tortoise', 'cateye', 'Mắt mèo (Cat-Eye)', 2750000.00, 3200000.00, 10, 1, '51-19-140 mm', 'Acetate vân đồi mồi hổ phách', 'https://images.unsplash.com/photo-1509695503492-413bc6d0a63a?auto=format&fit=crop&w=800&q=80'),
('lumina-07', 'Zenith Architect Round Matte Black', 'round', 'Gọng tròn (Round)', 2150000.00, 2500000.00, 4, 1, '49-20-142 mm', 'Thép không gỉ sơn tĩnh điện mờ', 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80'),
('lumina-08', 'Imperium Executive Square Gold', 'square', 'Gọng vuông (Square)', 3450000.00, 4000000.00, 7, 1, '55-18-148 mm', 'Titanium nguyên khối mạ vàng 24K', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `price` = VALUES(`price`),
  `stock` = VALUES(`stock`),
  `is_active` = VALUES(`is_active`);

-- Seed a sample historical order for testing dashboard and data checking
INSERT INTO `orders` (`id`, `order_code`, `user_id`, `customer_name`, `customer_email`, `customer_phone`, `shipping_address`, `shipping_city`, `order_notes`, `payment_method`, `subtotal_amount`, `shipping_fee`, `discount_amount`, `voucher_code`, `total_amount`, `status`)
VALUES
(1, 'LUM-20261016-DEMO', 'cust-lumina-01', 'Nguyễn Minh Anh', 'minhanh.nguyen@lumina.vn', '0901234567', 'Tầng 18, Toà nhà Bitexco, 2 Hải Triều', 'TP. Hồ Chí Minh', 'Giao hàng giờ hành chính', 'cod', 3250000.00, 0.00, 0.00, NULL, 3250000.00, 'confirmed')
ON DUPLICATE KEY UPDATE `order_code` = VALUES(`order_code`);

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_type`, `product_name`, `quantity`, `unit_price`, `subtotal`)
VALUES
(1, 1, 'lumina-01', 'catalog', 'Cyber Cat-Eye 18K Champagne', 1, 3250000.00, 3250000.00)
ON DUPLICATE KEY UPDATE `product_id` = VALUES(`product_id`);
