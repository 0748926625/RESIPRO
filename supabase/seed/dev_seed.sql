-- Development-only reference data (§38). Never run against production.
-- Demo accounts / properties / bookings need real auth.users rows, which this plain SQL
-- seed cannot create — provision those via a script using the Supabase Admin API and the
-- service role key (see README "Données de démonstration"), then re-run this file.

insert into public.amenities (key, label, category) values
  ('wifi', 'Wi-Fi', 'connectivity'),
  ('air_conditioning', 'Climatisation', 'comfort'),
  ('tv', 'Télévision', 'comfort'),
  ('kitchen', 'Cuisine équipée', 'comfort'),
  ('parking', 'Parking', 'access'),
  ('pool', 'Piscine', 'leisure'),
  ('generator', 'Groupe électrogène', 'utilities'),
  ('hot_water', 'Eau chaude', 'utilities'),
  ('security', 'Sécurité', 'access')
on conflict (key) do nothing;

insert into public.expense_categories (key, label) values
  ('electricity', 'Électricité'),
  ('water', 'Eau'),
  ('internet', 'Internet'),
  ('cleaning', 'Nettoyage'),
  ('maintenance', 'Entretien'),
  ('repair', 'Réparation'),
  ('staff', 'Personnel'),
  ('commission', 'Commissions'),
  ('supplies', 'Fournitures'),
  ('other', 'Autres')
on conflict (key) do nothing;
