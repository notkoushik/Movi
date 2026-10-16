-- Seed default admin and customer demo accounts matching frontend store
INSERT INTO users (email, password_hash, name, role, phone, address)
VALUES
  (
    'admin@movi.in',
    '$2b$12$9lgtw2VfkjDTaqOsAwX6oe70IIpYyPUNTh5FxyfspGA2OweIu7Zm2',
    'Koushik (Studio Director)',
    'admin',
    '+91 99880 12026',
    'MOVI Atelier, Lower Parel, Mumbai, MH'
  ),
  (
    'customer@movi.in',
    '$2b$12$FKTPazwlTLV42UC3j/JVNO1/zlmSPVDZao7WyXCEvdqbC.mJ2jvDS',
    'Aarav Sharma',
    'customer',
    '+91 98201 44820',
    'Bandra West, Mumbai, MH — 400050'
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address;
