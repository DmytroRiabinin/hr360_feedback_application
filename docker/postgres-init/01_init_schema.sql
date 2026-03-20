-- HR 360 Feedback Application schema (temporary for local development).
-- Creates: feedback_requests, feedback_assignments, feedback_responses

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public') THEN
    CREATE SCHEMA public;
  END IF;
END $$;

-- Requests (cycle-level metadata)
CREATE TABLE IF NOT EXISTS feedback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_name text NOT NULL,
  reviewed_person_id text NOT NULL,
  request_type text NOT NULL,
  deadline date NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'active', 'closed', 'archived')) DEFAULT 'draft',
  notes text,
  reference_link text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_deadline ON feedback_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_status ON feedback_requests(status);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_reviewed_person ON feedback_requests(reviewed_person_id);

-- Assignments (reviewer per request)
CREATE TABLE IF NOT EXISTS feedback_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES feedback_requests(id) ON DELETE CASCADE,
  reviewer_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'submitted')) DEFAULT 'pending',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate reviewer assignment for the same request
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_feedback_assignments_request_reviewer'
  ) THEN
    CREATE UNIQUE INDEX uq_feedback_assignments_request_reviewer
      ON feedback_assignments(request_id, reviewer_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feedback_assignments_reviewer ON feedback_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_assignments_request ON feedback_assignments(request_id);

-- Responses (text + ratings). Drafts are stored too (status = draft).
CREATE TABLE IF NOT EXISTS feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL UNIQUE REFERENCES feedback_assignments(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES feedback_requests(id) ON DELETE CASCADE,
  reviewed_person_id text NOT NULL,
  reviewer_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'submitted')) DEFAULT 'draft',
  text_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ratings jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_responses_reviewer ON feedback_responses(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_request ON feedback_responses(request_id);

-- Users (external user list for selectors)
-- MVP requirement: id, name, email, optionally slack_user_id
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  slack_user_id text
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Seed 10 test users for local development
INSERT INTO users (id, name, email, slack_user_id)
VALUES
  ('user-0001', 'Test User 1', 'test.user1@example.com', 'slack-u1'),
  ('user-0002', 'Test User 2', 'test.user2@example.com', 'slack-u2'),
  ('user-0003', 'Test User 3', 'test.user3@example.com', 'slack-u3'),
  ('user-0004', 'Test User 4', 'test.user4@example.com', 'slack-u4'),
  ('user-0005', 'Test User 5', 'test.user5@example.com', 'slack-u5'),
  ('user-0006', 'Test User 6', 'test.user6@example.com', 'slack-u6'),
  ('user-0007', 'Test User 7', 'test.user7@example.com', 'slack-u7'),
  ('user-0008', 'Test User 8', 'test.user8@example.com', 'slack-u8'),
  ('user-0009', 'Test User 9', 'test.user9@example.com', 'slack-u9'),
  ('user-0010', 'Test User 10', 'test.user10@example.com', 'slack-u10')
ON CONFLICT (id) DO NOTHING;

