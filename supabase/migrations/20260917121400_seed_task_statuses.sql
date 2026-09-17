-- Default workflow statuses for the Products / Tasks section.
insert into public.task_statuses (key, label, color, description, sort_order, is_default, is_terminal) values
  ('to_do',      'To-do',      'blue',   'New product waiting to be picked up.',                 10, true,  false),
  ('pending',    'Pending',    'purple', 'Queued / waiting on more information.',               20, false, false),
  ('processing', 'Processing', 'amber',  'Team is currently working on the product.',           30, false, false),
  ('done',       'Done',       'green',  'Work finished — product handled.',                    40, false, true),
  ('not_need',   'Not Need',   'gray',   'Product is irrelevant or not needed.',                50, false, true);
