CREATE TABLE document_counters (key TEXT PRIMARY KEY, value BIGINT NOT NULL CHECK (value > 0));
