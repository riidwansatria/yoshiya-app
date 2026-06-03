-- Create new records 
INSERT INTO restaurants (id, name, icon, prefix) 
SELECT 'enkaijou', '宴会場', icon, prefix FROM restaurants WHERE id = 'banquet';
INSERT INTO restaurants (id, name, icon, prefix) 
SELECT 'arashinotei', '嵐野亭', icon, prefix FROM restaurants WHERE id = 'fine_dining';
INSERT INTO restaurants (id, name, icon, prefix) 
SELECT 'okunoniwa', '奥の庭', icon, prefix FROM restaurants WHERE id = 'local';
INSERT INTO restaurants (id, name, icon, prefix) 
SELECT 'yubacheese', '湯葉チーズ', icon, prefix FROM restaurants WHERE id = 'skewers';

-- Update all foreign key relations
UPDATE venues SET restaurant_id = 'enkaijou' WHERE restaurant_id = 'banquet';
UPDATE venues SET restaurant_id = 'arashinotei' WHERE restaurant_id = 'fine_dining';
UPDATE venues SET restaurant_id = 'okunoniwa' WHERE restaurant_id = 'local';
UPDATE venues SET restaurant_id = 'yubacheese' WHERE restaurant_id = 'skewers';

UPDATE menus SET restaurant_id = 'enkaijou' WHERE restaurant_id = 'banquet';
UPDATE menus SET restaurant_id = 'arashinotei' WHERE restaurant_id = 'fine_dining';
UPDATE menus SET restaurant_id = 'okunoniwa' WHERE restaurant_id = 'local';
UPDATE menus SET restaurant_id = 'yubacheese' WHERE restaurant_id = 'skewers';

UPDATE reservations SET restaurant_id = 'enkaijou' WHERE restaurant_id = 'banquet';
UPDATE reservations SET restaurant_id = 'arashinotei' WHERE restaurant_id = 'fine_dining';
UPDATE reservations SET restaurant_id = 'okunoniwa' WHERE restaurant_id = 'local';
UPDATE reservations SET restaurant_id = 'yubacheese' WHERE restaurant_id = 'skewers';

UPDATE ingredients SET restaurant_id = 'enkaijou' WHERE restaurant_id = 'banquet';
UPDATE ingredients SET restaurant_id = 'arashinotei' WHERE restaurant_id = 'fine_dining';
UPDATE ingredients SET restaurant_id = 'okunoniwa' WHERE restaurant_id = 'local';
UPDATE ingredients SET restaurant_id = 'yubacheese' WHERE restaurant_id = 'skewers';

UPDATE components SET restaurant_id = 'enkaijou' WHERE restaurant_id = 'banquet';
UPDATE components SET restaurant_id = 'arashinotei' WHERE restaurant_id = 'fine_dining';
UPDATE components SET restaurant_id = 'okunoniwa' WHERE restaurant_id = 'local';
UPDATE components SET restaurant_id = 'yubacheese' WHERE restaurant_id = 'skewers';

UPDATE daily_orders SET restaurant_id = 'enkaijou' WHERE restaurant_id = 'banquet';
UPDATE daily_orders SET restaurant_id = 'arashinotei' WHERE restaurant_id = 'fine_dining';
UPDATE daily_orders SET restaurant_id = 'okunoniwa' WHERE restaurant_id = 'local';
UPDATE daily_orders SET restaurant_id = 'yubacheese' WHERE restaurant_id = 'skewers';

UPDATE menu_tags SET restaurant_id = 'enkaijou' WHERE restaurant_id = 'banquet';
UPDATE menu_tags SET restaurant_id = 'arashinotei' WHERE restaurant_id = 'fine_dining';
UPDATE menu_tags SET restaurant_id = 'okunoniwa' WHERE restaurant_id = 'local';
UPDATE menu_tags SET restaurant_id = 'yubacheese' WHERE restaurant_id = 'skewers';

UPDATE purchase_order_settings SET restaurant_id = 'enkaijou' WHERE restaurant_id = 'banquet';
UPDATE purchase_order_settings SET restaurant_id = 'arashinotei' WHERE restaurant_id = 'fine_dining';
UPDATE purchase_order_settings SET restaurant_id = 'okunoniwa' WHERE restaurant_id = 'local';
UPDATE purchase_order_settings SET restaurant_id = 'yubacheese' WHERE restaurant_id = 'skewers';

-- Drop the old records
DELETE FROM restaurants WHERE id IN ('banquet', 'fine_dining', 'local', 'skewers');
