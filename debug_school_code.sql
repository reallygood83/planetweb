-- Debug school_code issues
-- Run this in Supabase SQL Editor to check current state

-- 1. Check if school_code column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'classes' AND column_name = 'school_code';

-- 2. Check all classes and their school_codes
SELECT id, class_name, school_code, user_id, created_at
FROM classes 
ORDER BY created_at DESC;

-- 3. Specifically check for code 29AB8C
SELECT id, class_name, school_code, user_id
FROM classes 
WHERE school_code = '29AB8C';

-- 4. Check if there are any classes without school_code
SELECT COUNT(*) as classes_without_code
FROM classes 
WHERE school_code IS NULL;

-- 5. Check table structure (Supabase doesn't support \d command)
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_name = 'classes'
ORDER BY ordinal_position; 