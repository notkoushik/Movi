INSERT INTO categories(name, slug) VALUES
  ('T-Shirts', 't-shirts'),
  ('Hoodies', 'hoodies'),
  ('Bottoms', 'bottoms')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products(category_id, code, slug, name, description, base_price_minor, image_url)
SELECT c.id, x.code, x.slug, x.name, x.description, x.price_minor, x.image_url
FROM (VALUES
  ('01', 'essential-oversized-tee', 'Essential Oversized Tee', 'A relaxed MOVI silhouette cut for everyday movement.', 129900, '/movi/product-01.jpg', 't-shirts'),
  ('02', 'signature-hoodie', 'Signature Hoodie', 'A heavyweight structured fleece layer for everyday movement.', 199900, '/movi/product-02.jpg', 'hoodies'),
  ('03', 'vintage-graphic-tee', 'Vintage Graphic Tee', 'A washed graphic tee with a relaxed unisex fit.', 149900, '/movi/product-03.jpg', 't-shirts'),
  ('04', 'tech-cargo-pant', 'Tech Cargo Pant', 'A utility silhouette built for everywhere.', 189900, '/movi/product-04.jpg', 'bottoms')
) AS x(code, slug, name, description, price_minor, image_url, category_slug)
JOIN categories c ON c.slug = x.category_slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants(product_id, code, size, price_minor, stock_on_hand)
SELECT p.id, p.code || '-' || s.size, s.size, p.base_price_minor, s.stock
FROM products p
CROSS JOIN (VALUES ('S', 20), ('M', 30), ('L', 30), ('XL', 20)) AS s(size, stock)
ON CONFLICT (code) DO NOTHING;
