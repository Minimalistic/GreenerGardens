-- Composite index for filtering plant instances by plot and status
CREATE INDEX IF NOT EXISTS idx_plant_instances_plot_status ON plant_instances(plot_id, status);
