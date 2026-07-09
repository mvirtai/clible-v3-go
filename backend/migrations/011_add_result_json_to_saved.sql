-- Migration 011: Add result_json to saved searches and analyses
ALTER TABLE saved_searches ADD COLUMN result_json TEXT;
ALTER TABLE saved_analyses ADD COLUMN result_json TEXT;