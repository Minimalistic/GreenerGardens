-- Add geometry_json column to sub_plots for free-form positioning
ALTER TABLE sub_plots ADD COLUMN geometry_json TEXT NOT NULL DEFAULT '{"x":0,"y":0,"width":40,"height":40,"rotation":0}';

-- Backfill existing sub-plots: position based on grid_row/grid_col (40px per ft)
UPDATE sub_plots SET geometry_json = '{"x":' || (grid_col * 40) || ',"y":' || (grid_row * 40) || ',"width":40,"height":40,"rotation":0}';
