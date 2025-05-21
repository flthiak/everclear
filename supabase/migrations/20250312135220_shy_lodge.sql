/*
  # Populate Stock Data

  1. Insert mock production data
    - Multiple production records with varying quantities
    - Dates spread across recent days
    - Realistic production numbers

  2. Insert mock godown transfer data
    - Multiple transfer records
    - Quantities less than or equal to production
    - Dates following production dates
*/

-- Insert mock production data
INSERT INTO production ("250ml", "500ml", "1000ml", production_date)
VALUES
  (5000, 3000, 2000, now() - interval '7 days'),
  (4500, 3500, 1800, now() - interval '6 days'),
  (5500, 2800, 2200, now() - interval '5 days'),
  (4800, 3200, 1900, now() - interval '4 days'),
  (5200, 3100, 2100, now() - interval '3 days'),
  (4700, 3300, 1850, now() - interval '2 days'),
  (5100, 2900, 2050, now() - interval '1 day'),
  (4900, 3400, 1950, now())
ON CONFLICT DO NOTHING;

-- Insert mock godown transfer data
INSERT INTO godown_transfers ("250ml", "500ml", "1000ml", transfer_date)
VALUES
  (4000, 2500, 1500, now() - interval '7 days'),
  (3500, 3000, 1300, now() - interval '6 days'),
  (4500, 2300, 1800, now() - interval '5 days'),
  (3800, 2700, 1400, now() - interval '4 days'),
  (4200, 2600, 1700, now() - interval '3 days'),
  (3700, 2800, 1350, now() - interval '2 days'),
  (4100, 2400, 1650, now() - interval '1 day'),
  (3900, 2900, 1450, now())
ON CONFLICT DO NOTHING;