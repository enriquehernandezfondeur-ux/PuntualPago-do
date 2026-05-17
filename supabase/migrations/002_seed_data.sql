-- =============================================================
-- PuntualPago OS - Datos de Prueba Realistas
-- República Dominicana - Mayo 2026
-- =============================================================

-- ============================================================
-- PROPIETARIOS
-- =============================================================
INSERT INTO owners (id, full_name, is_company, cedula, email, phone, whatsapp, address, sector, city, bank_name, bank_account, bank_account_type, payment_preference, relationship_level, notes) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Carmen Reyes Marte',       false, '001-1234567-8', 'carmen.reyes@gmail.com',    '809-555-0101', '829-555-0101', 'Calle El Sol #45',        'Piantini',        'Santo Domingo', 'BanReservas',  '1234567890',  'Ahorros',   'Transferencia',  'premium', 'Propietaria VIP. Muy puntual. Prefiere reportes semanales.'),
  ('a0000001-0000-0000-0000-000000000002', 'Roberto Jiménez Torres',   false, '001-2345678-9', 'rjimenez@hotmail.com',      '809-555-0202', '849-555-0202', 'Av. Luperón #120',        'Naco',            'Santo Domingo', 'Popular',      '2345678901',  'Corriente', 'Transferencia',  'premium', 'Tiene 2 propiedades. Muy exigente con los pagos.'),
  ('a0000001-0000-0000-0000-000000000003', 'Inversiones Familia Núñez','true', NULL,           'fnunez.inversiones@gmail.com','809-555-0303','829-555-0303', 'Av. Winston Churchill #8','La Esperilla',    'Santo Domingo', 'BHD León',     '3456789012',  'Corriente', 'Transferencia',  'estandar','Empresa familiar. Propietad en Santiago también.'),
  ('a0000001-0000-0000-0000-000000000004', 'Marleny Sánchez Peña',     false, '001-4567890-1', 'marleny.sp@yahoo.com',      '809-555-0404', '809-555-0404', 'Calle Las Damas #22',    'Bella Vista',     'Santo Domingo', 'Scotiabank',   '4567890123',  'Ahorros',   'Efectivo',       'estandar', 'Primera propiedad con nosotros. Referida por Carmen Reyes.');

-- =============================================================
-- PROPIEDADES
-- =============================================================
INSERT INTO properties (id, code, name, type, status, address, sector, city, rent_amount, currency, deposit_amount, payment_day, has_guarantee, owner_id) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'PP-001', 'Apto 3B Torre Piantini',        'apartamento',    'ocupada',    'Av. Abraham Lincoln #105, Apto 3B', 'Piantini',        'Santo Domingo', 28000, 'DOP', 56000,  1,  true,  'a0000001-0000-0000-0000-000000000001'),
  ('b0000001-0000-0000-0000-000000000002', 'PP-002', 'Casa Bella Vista 4 Hab',        'casa',           'ocupada',    'Calle Pasteur #78',                 'Bella Vista',     'Santo Domingo', 45000, 'DOP', 90000,  5,  true,  'a0000001-0000-0000-0000-000000000001'),
  ('b0000001-0000-0000-0000-000000000003', 'PP-003', 'Penthouse Naco Vista Mar',      'penthouse',      'ocupada',    'Av. Tiradentes #33, PH-2',          'Naco',            'Santo Domingo', 75000, 'DOP', 150000, 1,  false, 'a0000001-0000-0000-0000-000000000002'),
  ('b0000001-0000-0000-0000-000000000004', 'PP-004', 'Local Comercial Churchill',     'local_comercial','ocupada',    'Av. Winston Churchill #145, L-2',   'La Esperilla',    'Santo Domingo', 35000, 'DOP', 70000,  1,  true,  'a0000001-0000-0000-0000-000000000003'),
  ('b0000001-0000-0000-0000-000000000005', 'PP-005', 'Estudio Moderno Evaristo',      'estudio',        'ocupada',    'Calle Fantino Falco #12, Apto 1A',  'Evaristo Morales','Santo Domingo', 15000, 'DOP', 30000,  1,  false, 'a0000001-0000-0000-0000-000000000004'),
  ('b0000001-0000-0000-0000-000000000006', 'PP-006', 'Apto 2 Hab Arroyo Hondo',      'apartamento',    'disponible', 'Calle Privada Los Robles #5',       'Arroyo Hondo',    'Santo Domingo', 22000, 'DOP', 44000,  1,  false, 'a0000001-0000-0000-0000-000000000002'),
  ('b0000001-0000-0000-0000-000000000007', 'PP-007', 'Casa Los Cacicazgos 3 Hab',     'casa',           'en_mantenimiento','Calle Privada #88',             'Los Cacicazgos',  'Santo Domingo', 38000, 'DOP', 76000,  5,  false, 'a0000001-0000-0000-0000-000000000003');

-- =============================================================
-- INQUILINOS
-- =============================================================
INSERT INTO tenants (id, full_name, id_type, id_number, nationality, email, phone, whatsapp, occupation, employer, estimated_income, income_currency, status, risk_level, pending_balance, reference_1_name, reference_1_phone) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Andrea Martínez Flores',  'cedula', '001-1111111-1', 'Dominicana', 'andrea.mf@gmail.com',    '809-600-0101', '829-600-0101', 'Gerente de Ventas',     'Grupo León Jimenes',  120000, 'DOP', 'activo',         'bajo',    0,     'Juan Martínez', '809-700-0101'),
  ('c0000001-0000-0000-0000-000000000002', 'Carlos Medina Ortiz',     'cedula', '001-2222222-2', 'Dominicana', 'c.medina@yahoo.com',      '809-600-0202', '849-600-0202', 'Médico',                'Clínica Abreu',       200000, 'DOP', 'activo',         'bajo',    0,     'Rosa Ortiz',    '809-700-0202'),
  ('c0000001-0000-0000-0000-000000000003', 'Luisa Fernández Abad',    'cedula', '001-3333333-3', 'Dominicana', 'luisa.fa@hotmail.com',    '809-600-0303', '829-600-0303', 'Empresaria',            'Ferretería Fernández', 95000, 'DOP', 'en_observacion', 'medio',   28000, 'Pedro Fernández','809-700-0303'),
  ('c0000001-0000-0000-0000-000000000004', 'José Antonio Beltrán',    'cedula', '001-4444444-4', 'Dominicana', 'jabeltr@gmail.com',       '809-600-0404', '849-600-0404', 'Contador',              'Deloitte RD',         85000, 'DOP', 'activo',         'bajo',    0,     'María Beltrán', '809-700-0404'),
  ('c0000001-0000-0000-0000-000000000005', 'Ramón Díaz Polanco',      'cedula', '001-5555555-5', 'Dominicana', 'rdiaz.polanco@gmail.com', '809-600-0505', '829-600-0505', 'Vendedor independiente','Cuenta propia',        45000, 'DOP', 'moroso',         'alto',    75000, 'Ana Polanco',   '809-700-0505');

-- =============================================================
-- CONTRATOS
-- =============================================================
INSERT INTO leases (id, contract_number, property_id, tenant_id, owner_id, start_date, end_date, rent_amount, currency, deposit_amount, late_fee_percentage, late_fee_grace_days, payment_day, status, has_guarantee, signing_status) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'CON-000001', 'b0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', '2025-01-01', '2026-12-31', 28000, 'DOP', 56000,  5, 5, 1,  'activo', true,  'firmado'),
  ('d0000001-0000-0000-0000-000000000002', 'CON-000002', 'b0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', '2025-03-01', '2026-06-30', 45000, 'DOP', 90000,  5, 5, 5,  'activo', true,  'firmado'),
  ('d0000001-0000-0000-0000-000000000003', 'CON-000003', 'b0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', '2025-06-01', '2026-05-31', 75000, 'DOP', 150000, 5, 5, 1,  'activo', false, 'firmado'),
  ('d0000001-0000-0000-0000-000000000004', 'CON-000004', 'b0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003', '2025-02-01', '2027-01-31', 35000, 'DOP', 70000,  5, 5, 1,  'activo', true,  'firmado'),
  ('d0000001-0000-0000-0000-000000000005', 'CON-000005', 'b0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000004', '2024-11-01', '2025-10-31', 15000, 'DOP', 30000,  5, 5, 1,  'activo', false, 'firmado');

-- =============================================================
-- GARANTÍAS
-- =============================================================
INSERT INTO guarantees (id, lease_id, property_id, tenant_id, owner_id, status, start_date, guaranteed_amount, currency, total_exposure, total_recovered, payout_deadline_days) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'activa', '2025-01-01', 28000, 'DOP', 0,     0,     5),
  ('e0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'activa', '2025-03-01', 45000, 'DOP', 0,     0,     5),
  ('e0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003', 'reclamada','2025-02-01',35000, 'DOP', 75000, 0,     5);

-- Update leases con guarantee_id
UPDATE leases SET guarantee_id = 'e0000001-0000-0000-0000-000000000001' WHERE id = 'd0000001-0000-0000-0000-000000000001';
UPDATE leases SET guarantee_id = 'e0000001-0000-0000-0000-000000000002' WHERE id = 'd0000001-0000-0000-0000-000000000002';
UPDATE leases SET guarantee_id = 'e0000001-0000-0000-0000-000000000003' WHERE id = 'd0000001-0000-0000-0000-000000000004';

-- =============================================================
-- PAGOS - Últimos 5 meses + mes actual
-- Mezcla de estados para demo realista
-- =============================================================

-- Enero 2026 (todos pagados)
INSERT INTO payments (lease_id, property_id, tenant_id, owner_id, period_year, period_month, due_date, rent_amount, currency, late_fee, amount_paid, status, days_overdue, paid_date, payment_method) VALUES
  ('d0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001', 2026,1,'2026-01-01',28000,'DOP',0,28000,'pagado',0,'2026-01-03','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001', 2026,1,'2026-01-05',45000,'DOP',0,45000,'pagado',0,'2026-01-05','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000003','a0000001-0000-0000-0000-000000000002', 2026,1,'2026-01-01',75000,'DOP',0,75000,'pagado',0,'2026-01-02','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000004','b0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000004','a0000001-0000-0000-0000-000000000003', 2026,1,'2026-01-01',35000,'DOP',0,35000,'pagado',0,'2026-01-01','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000005','b0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000005','a0000001-0000-0000-0000-000000000004', 2026,1,'2026-01-01',15000,'DOP',750,0,'en_mora',35,'2026-01-01',NULL);

-- Febrero 2026
INSERT INTO payments (lease_id, property_id, tenant_id, owner_id, period_year, period_month, due_date, rent_amount, currency, late_fee, amount_paid, status, days_overdue, paid_date, payment_method) VALUES
  ('d0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001', 2026,2,'2026-02-01',28000,'DOP',0,28000,'pagado',0,'2026-02-01','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001', 2026,2,'2026-02-05',45000,'DOP',0,45000,'pagado',0,'2026-02-05','Zelle'),
  ('d0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000003','a0000001-0000-0000-0000-000000000002', 2026,2,'2026-02-01',75000,'DOP',3750,0,'en_mora',28,'2026-02-01',NULL),
  ('d0000001-0000-0000-0000-000000000004','b0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000004','a0000001-0000-0000-0000-000000000003', 2026,2,'2026-02-01',35000,'DOP',0,35000,'pagado',0,'2026-02-03','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000005','b0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000005','a0000001-0000-0000-0000-000000000004', 2026,2,'2026-02-01',15000,'DOP',1500,0,'en_mora',62,'2026-02-01',NULL);

-- Marzo 2026
INSERT INTO payments (lease_id, property_id, tenant_id, owner_id, period_year, period_month, due_date, rent_amount, currency, late_fee, amount_paid, status, days_overdue, paid_date, payment_method) VALUES
  ('d0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001', 2026,3,'2026-03-01',28000,'DOP',0,28000,'pagado',0,'2026-03-02','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001', 2026,3,'2026-03-05',45000,'DOP',0,45000,'pagado',0,'2026-03-05','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000003','a0000001-0000-0000-0000-000000000002', 2026,3,'2026-03-01',75000,'DOP',3750,75000,'pagado',12,'2026-03-13','Cheque'),
  ('d0000001-0000-0000-0000-000000000004','b0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000004','a0000001-0000-0000-0000-000000000003', 2026,3,'2026-03-01',35000,'DOP',0,35000,'pagado',0,'2026-03-01','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000005','b0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000005','a0000001-0000-0000-0000-000000000004', 2026,3,'2026-03-01',15000,'DOP',2250,0,'en_mora',92,'2026-03-01',NULL);

-- Abril 2026
INSERT INTO payments (lease_id, property_id, tenant_id, owner_id, period_year, period_month, due_date, rent_amount, currency, late_fee, amount_paid, status, days_overdue, paid_date, payment_method) VALUES
  ('d0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001', 2026,4,'2026-04-01',28000,'DOP',0,28000,'pagado',0,'2026-04-01','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001', 2026,4,'2026-04-05',45000,'DOP',0,45000,'pagado',0,'2026-04-06','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000003','a0000001-0000-0000-0000-000000000002', 2026,4,'2026-04-01',75000,'DOP',3750,0,'cubierto_garantia',35,NULL,NULL),
  ('d0000001-0000-0000-0000-000000000004','b0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000004','a0000001-0000-0000-0000-000000000003', 2026,4,'2026-04-01',35000,'DOP',0,35000,'pagado',0,'2026-04-02','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000005','b0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000005','a0000001-0000-0000-0000-000000000004', 2026,4,'2026-04-01',15000,'DOP',3000,0,'en_legal',126,NULL,NULL);

-- Mayo 2026 (mes actual - mix de estados)
INSERT INTO payments (lease_id, property_id, tenant_id, owner_id, period_year, period_month, due_date, rent_amount, currency, late_fee, amount_paid, status, days_overdue, paid_date, payment_method) VALUES
  ('d0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001', 2026,5,'2026-05-01',28000,'DOP',0,28000,'pagado',0,'2026-05-01','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000002','c0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001', 2026,5,'2026-05-05',45000,'DOP',0,0,'vence_pronto',0,NULL,NULL),
  ('d0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000003','a0000001-0000-0000-0000-000000000002', 2026,5,'2026-05-01',75000,'DOP',3750,0,'vencido',5,NULL,NULL),
  ('d0000001-0000-0000-0000-000000000004','b0000001-0000-0000-0000-000000000004','c0000001-0000-0000-0000-000000000004','a0000001-0000-0000-0000-000000000003', 2026,5,'2026-05-01',35000,'DOP',0,35000,'pagado',0,'2026-05-01','Transferencia bancaria'),
  ('d0000001-0000-0000-0000-000000000005','b0000001-0000-0000-0000-000000000005','c0000001-0000-0000-0000-000000000005','a0000001-0000-0000-0000-000000000004', 2026,5,'2026-05-01',15000,'DOP',3750,0,'en_legal',35,NULL,NULL);

-- =============================================================
-- RECLAMACIÓN DE GARANTÍA (Ramón Díaz - en mora severa)
-- =============================================================
INSERT INTO guarantee_claims (guarantee_id, payment_id, claim_date, amount_claimed, currency, owner_paid, recovery_amount, status, notes)
SELECT
  'e0000001-0000-0000-0000-000000000003',
  p.id,
  '2026-04-15',
  35000,
  'DOP',
  false,
  0,
  'abierto',
  'Inquilino lleva 4 meses sin pagar. Se activó garantía. Propietario pendiente de pago.'
FROM payments p
WHERE p.lease_id = 'd0000001-0000-0000-0000-000000000005'
  AND p.period_month = 4
  AND p.period_year = 2026
LIMIT 1;

-- =============================================================
-- LIQUIDACIONES A PROPIETARIOS
-- =============================================================
INSERT INTO owner_payouts (owner_id, property_id, period_year, period_month, rent_collected, management_fee, fee_percentage, net_payout, currency, paid, paid_date, payment_method, notes) VALUES
  ('a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001', 2026,4, 28000, 2800, 10, 25200, 'DOP', true,  '2026-04-05', 'Transferencia BanReservas', 'Liquidación abril - Apto Piantini'),
  ('a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000002', 2026,4, 45000, 4500, 10, 40500, 'DOP', true,  '2026-04-05', 'Transferencia BanReservas', 'Liquidación abril - Casa Bella Vista'),
  ('a0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000003', 2026,4, 75000, 7500, 10, 67500, 'DOP', false, NULL,         NULL,                       'Pendiente — inquilina en mora, cubierto por garantía'),
  ('a0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000004', 2026,4, 35000, 3500, 10, 31500, 'DOP', true,  '2026-04-03', 'Transferencia BHD León',   'Liquidación abril - Local Churchill'),
  -- Mayo pendientes
  ('a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001', 2026,5, 28000, 2800, 10, 25200, 'DOP', false, NULL,         NULL,                       'Liquidación mayo - pendiente de procesar'),
  ('a0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000004', 2026,5, 35000, 3500, 10, 31500, 'DOP', false, NULL,         NULL,                       'Liquidación mayo - pendiente de procesar');

-- =============================================================
-- CASO LEGAL
-- =============================================================
INSERT INTO legal_cases (id, case_number, property_id, tenant_id, owner_id, lease_id, status, reason, amount_owed, currency, days_in_arrears, lawyer_assigned, opened_date, next_action_date, next_action, notes) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'LEG-000001',
   'b0000001-0000-0000-0000-000000000005',
   'c0000001-0000-0000-0000-000000000005',
   'a0000001-0000-0000-0000-000000000004',
   'd0000001-0000-0000-0000-000000000005',
   'en_legal', 'Falta de pago por más de 4 meses consecutivos',
   75000, 'DOP', 126, 'Lic. Marcos Jiménez',
   '2026-04-10', '2026-05-15', 'Audiencia en tribunal civil de primera instancia',
   'Inquilino dice tener problemas laborales. No responde llamadas. Desalojo en proceso.');

-- =============================================================
-- MANTENIMIENTO
-- =============================================================
INSERT INTO maintenance_requests (ticket_number, property_id, tenant_id, title, description, priority, status, estimated_cost, actual_cost, currency, paid_by, provider_name, provider_phone, reported_date, scheduled_date, notes) VALUES
  ('MNT-001001', 'b0000001-0000-0000-0000-000000000007', NULL,
   'Reparación de techo — filtraciones',
   'El techo tiene múltiples filtraciones tras las lluvias de abril. Daño en 3 habitaciones.',
   'urgente', 'cotizado', 45000, NULL, 'DOP', 'propietario',
   'Construrápido SRL', '809-777-1234',
   '2026-04-25', '2026-05-10',
   'Esperando aprobación del propietario. Empresa cotizó RD$45,000.'),

  ('MNT-001002', 'b0000001-0000-0000-0000-000000000001',
   'c0000001-0000-0000-0000-000000000001',
   'A/C unidad principal no enfría',
   'El aire acondicionado de la sala dejó de enfriar. Inquilina reporta desde el 30 de abril.',
   'alta', 'en_proceso', 8000, NULL, 'DOP', 'propietario',
   'Frío Total SRL', '809-777-5678',
   '2026-04-30', '2026-05-07',
   'Técnico visitó el martes. Necesita cambio de compresor. Piezas en camino.'),

  ('MNT-001003', 'b0000001-0000-0000-0000-000000000004',
   'c0000001-0000-0000-0000-000000000004',
   'Pintura exterior desgastada',
   'La fachada del local necesita pintura. Afecta la imagen del negocio del inquilino.',
   'baja', 'completado', 12000, 11500, 'DOP', 'propietario',
   'Pinturas Rodríguez', '809-777-9012',
   '2026-03-15', '2026-03-25',
   'Trabajo completado el 28 de marzo. Factura pagada.');

-- =============================================================
-- TAREAS
-- =============================================================
INSERT INTO tasks (title, description, priority, status, due_date, tenant_id, property_id, payment_id, entity_type) VALUES
  ('Llamar a Luisa Fernández por pago mayo',
   'Lleva 5 días de mora en el Penthouse Naco. Tercer intento esta semana.',
   'urgente', 'pendiente', '2026-05-07',
   'c0000001-0000-0000-0000-000000000003',
   'b0000001-0000-0000-0000-000000000003',
   NULL, 'tenant'),

  ('Renovar contrato Casa Bella Vista',
   'Contrato vence el 30 de junio. Hablar con Dr. Medina sobre renovación y nuevo precio.',
   'alta', 'pendiente', '2026-05-20',
   'c0000001-0000-0000-0000-000000000002',
   'b0000001-0000-0000-0000-000000000002',
   NULL, 'lease'),

  ('Aprobar cotización reparación techo Los Cacicazgos',
   'Construrápido cotizó RD$45,000. Pendiente aprobación de Familia Núñez.',
   'alta', 'pendiente', '2026-05-08',
   NULL,
   'b0000001-0000-0000-0000-000000000007',
   NULL, 'property'),

  ('Preparar liquidación mayo Carmen Reyes',
   'Carmen espera liquidación de sus 2 propiedades antes del 10 de mayo.',
   'media', 'pendiente', '2026-05-10',
   NULL, NULL, NULL, 'owner'),

  ('Conseguir inquilino Apto Arroyo Hondo',
   'Propiedad disponible desde abril. Publicar en portales y contactar referidos.',
   'media', 'en_proceso', '2026-05-31',
   NULL,
   'b0000001-0000-0000-0000-000000000006',
   NULL, 'property'),

  ('Seguimiento caso legal Ramón Díaz',
   'Audiencia el 15 de mayo. Coordinar con Lic. Marcos Jiménez para documentación.',
   'urgente', 'pendiente', '2026-05-12',
   'c0000001-0000-0000-0000-000000000005',
   'b0000001-0000-0000-0000-000000000005',
   NULL, 'legal');

-- =============================================================
-- ACTUALIZAR PENDING BALANCE EN INQUILINOS
-- =============================================================
UPDATE tenants SET pending_balance = 75000 WHERE id = 'c0000001-0000-0000-0000-000000000005';
UPDATE tenants SET pending_balance = 28000 WHERE id = 'c0000001-0000-0000-0000-000000000003';

-- =============================================================
-- ACTUALIZAR EXPOSICIÓN EN GARANTÍAS
-- =============================================================
UPDATE guarantees SET total_exposure = 75000 WHERE id = 'e0000001-0000-0000-0000-000000000003';
UPDATE properties SET status = 'proceso_legal' WHERE id = 'b0000001-0000-0000-0000-000000000005';
