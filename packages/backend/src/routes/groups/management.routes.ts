import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { HistoryLogger } from '../../services/history.middleware.js';

import { UploadRepository } from '../../db/repositories/upload.repository.js';
import { PestEventRepository } from '../../db/repositories/pest-event.repository.js';
import { SoilTestRepository } from '../../db/repositories/soil-test.repository.js';
import { NoteRepository } from '../../db/repositories/note.repository.js';
import { TagRepository } from '../../db/repositories/tag.repository.js';
import { FeedbackRepository } from '../../db/repositories/feedback.repository.js';

import { UploadService } from '../../services/upload.service.js';
import { PestEventService } from '../../services/pest-event.service.js';
import { SoilTestService } from '../../services/soil-test.service.js';
import { NoteService } from '../../services/note.service.js';
import { TagService } from '../../services/tag.service.js';
import { FeedbackService } from '../../services/feedback.service.js';

import { uploadRoutes } from '../upload.routes.js';
import { pestEventRoutes } from '../pest-event.routes.js';
import { soilTestRoutes } from '../soil-test.routes.js';
import { noteRoutes } from '../note.routes.js';
import { tagRoutes } from '../tag.routes.js';
import { feedbackRoutes } from '../feedback.routes.js';

export function registerManagementRoutes(fastify: FastifyInstance, db: Database.Database, history: HistoryLogger) {
  const uploadRepo = new UploadRepository(db);
  const pestEventRepo = new PestEventRepository(db);
  const soilTestRepo = new SoilTestRepository(db);
  const noteRepo = new NoteRepository(db);
  const tagRepo = new TagRepository(db);
  const feedbackRepo = new FeedbackRepository(db);

  const uploadService = new UploadService(db, uploadRepo);
  const pestEventService = new PestEventService(db, pestEventRepo, history);
  const soilTestService = new SoilTestService(db, soilTestRepo, history);
  const noteService = new NoteService(db, noteRepo, history);
  const tagService = new TagService(db, tagRepo);
  const feedbackService = new FeedbackService(db, feedbackRepo, history);

  uploadRoutes(fastify, uploadService);
  pestEventRoutes(fastify, pestEventService);
  soilTestRoutes(fastify, soilTestService);
  noteRoutes(fastify, noteService);
  tagRoutes(fastify, tagService);
  feedbackRoutes(fastify, feedbackService);
}
