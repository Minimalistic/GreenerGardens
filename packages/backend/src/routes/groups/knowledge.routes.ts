import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { HistoryLogger } from '../../services/history.middleware.js';

import { GardenRepository } from '../../db/repositories/garden.repository.js';
import { PlantCatalogRepository } from '../../db/repositories/plant-catalog.repository.js';
import { LlmConversationRepository, LlmMessageRepository } from '../../db/repositories/llm.repository.js';
import { WikipediaCacheRepository } from '../../db/repositories/wikipedia-cache.repository.js';
import { PestCatalogRepository } from '../../db/repositories/pest-catalog.repository.js';

import { LlmContextService } from '../../services/llm-context.service.js';
import { LlmService } from '../../services/llm.service.js';
import { CompanionService } from '../../services/companion.service.js';
import { RotationService } from '../../services/rotation.service.js';
import { SearchService } from '../../services/search.service.js';
import { PlantingGuideService } from '../../services/planting-guide.service.js';
import { WikipediaService } from '../../services/wikipedia.service.js';
import { PestCatalogService } from '../../services/pest-catalog.service.js';

import { assistantRoutes } from '../assistant.routes.js';
import { companionRoutes } from '../companion.routes.js';
import { rotationRoutes } from '../rotation.routes.js';
import { searchRoutes } from '../search.routes.js';
import { plantingGuideRoutes } from '../planting-guide.routes.js';
import { wikipediaRoutes } from '../wikipedia.routes.js';
import { pestCatalogRoutes } from '../pest-catalog.routes.js';

export function registerKnowledgeRoutes(fastify: FastifyInstance, db: Database.Database, history: HistoryLogger) {
  const gardenRepo = new GardenRepository(db);
  const catalogRepo = new PlantCatalogRepository(db);
  const llmConvRepo = new LlmConversationRepository(db);
  const llmMsgRepo = new LlmMessageRepository(db);
  const pestCatalogRepo = new PestCatalogRepository(db);

  const llmContextService = new LlmContextService(db, gardenRepo);
  const llmService = new LlmService(db, llmConvRepo, llmMsgRepo, llmContextService);
  const companionService = new CompanionService(db, catalogRepo);
  const rotationService = new RotationService(db, catalogRepo);
  const searchService = new SearchService(db);
  const plantingGuideService = new PlantingGuideService(db, gardenRepo, catalogRepo);
  const wikiCacheRepo = new WikipediaCacheRepository(db);
  const wikipediaService = new WikipediaService(wikiCacheRepo, catalogRepo);
  const pestCatalogService = new PestCatalogService(db, pestCatalogRepo, history);

  assistantRoutes(fastify, llmService);
  companionRoutes(fastify, companionService);
  rotationRoutes(fastify, rotationService);
  searchRoutes(fastify, searchService);
  plantingGuideRoutes(fastify, plantingGuideService);
  wikipediaRoutes(fastify, wikipediaService);
  pestCatalogRoutes(fastify, pestCatalogService);
}
