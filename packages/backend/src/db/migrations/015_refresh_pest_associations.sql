-- Refresh pest catalog and plant pest/disease data after fixing
-- affected_plants naming (Bean→Green Bean, etc.) and bidirectional sync.
-- Preserves user-created custom entries (is_custom = 1).
-- On next startup, seedPestCatalog() and updatePlantPestData() re-apply from updated JSON.

DELETE FROM pest_catalog WHERE is_custom = 0;

UPDATE plant_catalog
SET common_pests = '[]', common_diseases = '[]', disease_resistance = '{}'
WHERE is_custom = 0;
