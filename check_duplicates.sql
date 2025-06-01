-- Check for duplicate school codes and investigate the issue
-- Run this in Supabase SQL Editor

-- 1. Check for duplicate school codes
SELECT school_code, COUNT(*) as count
FROM classes 
WHERE school_code IS NOT NULL
GROUP BY school_code
HAVING COUNT(*) > 1;

-- 2. Check specifically for 29AB8C
SELECT id, class_name, school_code, user_id, created_at
FROM classes 
WHERE school_code = '29AB8C';

-- 3. Check all classes to see current state
SELECT id, class_name, school_code, user_id, created_at
FROM classes 
ORDER BY created_at DESC
LIMIT 20;