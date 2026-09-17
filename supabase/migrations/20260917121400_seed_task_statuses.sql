-- Default workflow statuses. Admins can rename these or add new ones later from Settings.
insert into public.task_statuses (key, label, color, description, sort_order, is_default, is_terminal) values
  ('to_do',      'To Do',      'blue',   'New product discovered and waiting for team review.', 10, true,  false),
  ('processing', 'Processing', 'amber',  'Team is currently working on the product.',            20, false, false),
  ('review',     'Review',     'purple', 'Needs manager review before a final decision.',        30, false, false),
  ('added',      'Added',      'green',  'Product has been added to our website/system.',        40, false, true),
  ('not_add',    'Not Add',    'red',    'Team decided not to add the product.',                 50, false, true),
  ('no_need',    'No Need',    'gray',   'Product is irrelevant or unnecessary.',                60, false, true),
  ('error',      'Error',      'red',    'Crawler or data extraction failed.',                   70, false, false);
