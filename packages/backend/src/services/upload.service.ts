import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';
import type Database from 'better-sqlite3';
import type { UploadRepository } from '../db/repositories/upload.repository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export class UploadService {
  private uploadPath: string;

  constructor(
    private db: Database.Database,
    private uploadRepo: UploadRepository,
  ) {
    this.uploadPath = process.env.UPLOAD_PATH || path.resolve(process.cwd(), 'data/uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  getUploadPath(): string {
    return this.uploadPath;
  }

  async create(file: { filename: string; mimetype: string; data: Buffer }) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new ValidationError(`File type '${file.mimetype}' not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }
    if (file.data.length > MAX_SIZE) {
      throw new ValidationError(`File too large. Maximum size: 10MB`);
    }

    const id = uuid();
    const ext = path.extname(file.filename) || '.jpg';
    const storedName = `${id}${ext}`;
    const filePath = path.join(this.uploadPath, storedName);

    fs.writeFileSync(filePath, file.data);

    const row = this.uploadRepo.insert({
      id,
      original_name: file.filename,
      stored_name: storedName,
      mime_type: file.mimetype,
      size_bytes: file.data.length,
    });

    return { ...row, url: `/uploads/${storedName}` };
  }

  findById(id: string) {
    const upload = this.uploadRepo.findById(id);
    if (!upload) throw new NotFoundError('Upload', id);
    return { ...upload, url: `/uploads/${upload.stored_name}` };
  }

  findByEntity(entityType: string, entityId: string) {
    return this.uploadRepo.findByEntity(entityType, entityId).map(u => ({
      ...u,
      url: `/uploads/${u.stored_name}`,
    }));
  }

  linkToEntity(id: string, entityType: string, entityId: string) {
    const upload = this.uploadRepo.findById(id);
    if (!upload) throw new NotFoundError('Upload', id);
    return this.uploadRepo.update(id, { entity_type: entityType, entity_id: entityId });
  }

  delete(id: string): void {
    const upload = this.uploadRepo.findById(id);
    if (!upload) throw new NotFoundError('Upload', id);

    const filePath = path.join(this.uploadPath, upload.stored_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    this.uploadRepo.delete(id);
  }
}
