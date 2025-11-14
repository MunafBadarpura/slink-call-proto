-- Setup Test Users for Call Feature
-- Run this SQL script in your database to create test users

-- Note: Adjust column names and data types based on your actual user_master table structure
-- Check your table structure first with: DESCRIBE user_master;

-- Option 1: If your table has auto-increment ID, use this:
-- (Remove user_id from INSERT and let it auto-generate)
/*
INSERT INTO user_master (name, email, password, status, is_online, created_at, updated_at) 
VALUES 
  ('Alice Johnson', 'alice@example.com', '$2a$10$dummyHashedPassword1', 'ACTIVE', false, NOW(), NOW()),
  ('Bob Smith', 'bob@example.com', '$2a$10$dummyHashedPassword2', 'ACTIVE', false, NOW(), NOW()),
  ('Charlie Brown', 'charlie@example.com', '$2a$10$dummyHashedPassword3', 'ACTIVE', false, NOW(), NOW()),
  ('Diana Prince', 'diana@example.com', '$2a$10$dummyHashedPassword4', 'ACTIVE', false, NOW(), NOW()),
  ('Ethan Hunt', 'ethan@example.com', '$2a$10$dummyHashedPassword5', 'ACTIVE', false, NOW(), NOW());
*/

-- Option 2: If you want specific IDs (1-5), use this:
INSERT INTO user_master (user_id, name, email, password, status, is_online, created_at, updated_at) 
VALUES 
  (1, 'Alice Johnson', 'alice@example.com', '$2a$10$dummyHashedPassword1', 'ACTIVE', false, NOW(), NOW()),
  (2, 'Bob Smith', 'bob@example.com', '$2a$10$dummyHashedPassword2', 'ACTIVE', false, NOW(), NOW()),
  (3, 'Charlie Brown', 'charlie@example.com', '$2a$10$dummyHashedPassword3', 'ACTIVE', false, NOW(), NOW()),
  (4, 'Diana Prince', 'diana@example.com', '$2a$10$dummyHashedPassword4', 'ACTIVE', false, NOW(), NOW()),
  (5, 'Ethan Hunt', 'ethan@example.com', '$2a$10$dummyHashedPassword5', 'ACTIVE', false, NOW(), NOW());

-- Verify the users were created:
SELECT user_id, name, email, status, is_online FROM user_master WHERE user_id IN (1, 2, 3, 4, 5);

-- If you need to delete and recreate:
-- DELETE FROM user_master WHERE user_id IN (1, 2, 3, 4, 5);

-- Common column name variations you might need to adjust:
-- user_id → userId, id
-- name → user_name, full_name, username
-- email → user_email, email_address
-- status → user_status, account_status
-- is_online → isOnline, online_status, online
-- created_at → createdAt, created_date, creation_date
-- updated_at → updatedAt, updated_date, modification_date

-- Example for different column names:
/*
INSERT INTO user_master (userId, userName, userEmail, userPassword, userStatus, isOnline, createdAt, updatedAt) 
VALUES 
  (1, 'Alice Johnson', 'alice@example.com', '$2a$10$dummyHashedPassword1', 'ACTIVE', 0, NOW(), NOW()),
  (2, 'Bob Smith', 'bob@example.com', '$2a$10$dummyHashedPassword2', 'ACTIVE', 0, NOW(), NOW()),
  (3, 'Charlie Brown', 'charlie@example.com', '$2a$10$dummyHashedPassword3', 'ACTIVE', 0, NOW(), NOW()),
  (4, 'Diana Prince', 'diana@example.com', '$2a$10$dummyHashedPassword4', 'ACTIVE', 0, NOW(), NOW()),
  (5, 'Ethan Hunt', 'ethan@example.com', '$2a$10$dummyHashedPassword5', 'ACTIVE', 0, NOW(), NOW());
*/
