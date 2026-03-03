ALTER TABLE notes ADD COLUMN note_date TEXT;
CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(note_date);
