import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { HistoryLogger } from '../../services/history.middleware.js';

import { GardenRepository } from '../../db/repositories/garden.repository.js';
import { PlotRepository } from '../../db/repositories/plot.repository.js';
import { SubPlotRepository } from '../../db/repositories/sub-plot.repository.js';
import { PlantCatalogRepository } from '../../db/repositories/plant-catalog.repository.js';
import { PlantInstanceRepository } from '../../db/repositories/plant-instance.repository.js';
import { HarvestRepository } from '../../db/repositories/harvest.repository.js';
import { GardenObjectRepository } from '../../db/repositories/garden-object.repository.js';

import { GardenService } from '../../services/garden.service.js';
import { PlotService } from '../../services/plot.service.js';
import { SubPlotService } from '../../services/sub-plot.service.js';
import { PlantCatalogService } from '../../services/plant-catalog.service.js';
import { PlantInstanceService } from '../../services/plant-instance.service.js';
import { HarvestService } from '../../services/harvest.service.js';
import { GardenObjectService } from '../../services/garden-object.service.js';

import { setupRoutes } from '../setup.routes.js';
import { gardenRoutes } from '../garden.routes.js';
import { plotRoutes } from '../plot.routes.js';
import { subPlotRoutes } from '../sub-plot.routes.js';
import { plantCatalogRoutes } from '../plant-catalog.routes.js';
import { plantInstanceRoutes } from '../plant-instance.routes.js';
import { harvestRoutes } from '../harvest.routes.js';
import { settingsRoutes } from '../settings.routes.js';
import { zoneLookupRoutes } from '../zone-lookup.routes.js';
import { gardenObjectRoutes } from '../garden-object.routes.js';

export function registerCoreRoutes(fastify: FastifyInstance, db: Database.Database, history: HistoryLogger) {
  const gardenRepo = new GardenRepository(db);
  const plotRepo = new PlotRepository(db);
  const subPlotRepo = new SubPlotRepository(db);
  const catalogRepo = new PlantCatalogRepository(db);
  const instanceRepo = new PlantInstanceRepository(db);
  const harvestRepo = new HarvestRepository(db);
  const gardenObjectRepo = new GardenObjectRepository(db);

  const gardenService = new GardenService(db, gardenRepo, history);
  const plotService = new PlotService(db, plotRepo, subPlotRepo, gardenRepo, history);
  const subPlotService = new SubPlotService(db, subPlotRepo, history);
  const catalogService = new PlantCatalogService(db, catalogRepo, history);
  const instanceService = new PlantInstanceService(db, instanceRepo, subPlotRepo, history, catalogRepo, plotRepo, gardenRepo);
  const harvestService = new HarvestService(db, harvestRepo, history);
  const gardenObjectService = new GardenObjectService(db, gardenObjectRepo, history);

  setupRoutes(fastify, gardenService);
  gardenRoutes(fastify, gardenService, plotService);
  plotRoutes(fastify, plotService, subPlotService, db);
  subPlotRoutes(fastify, subPlotService, db);
  plantCatalogRoutes(fastify, catalogService);
  plantInstanceRoutes(fastify, instanceService, db);
  harvestRoutes(fastify, harvestService, db);
  settingsRoutes(fastify, gardenService);
  zoneLookupRoutes(fastify);
  gardenObjectRoutes(fastify, gardenObjectService, db);

  return { gardenRepo, instanceService };
}
