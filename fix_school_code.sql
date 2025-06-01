-- Fix school_code column for classes table
-- Run this in Supabase SQL Editor

-- Add school_code column if it doesn't exist
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS school_code VARCHAR(10);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_classes_school_code ON classes(school_code);

-- Generate school codes for existing classes that don't have them
DO $$
DECLARE
  class_record RECORD;
  new_code VARCHAR(10);
  code_exists BOOLEAN;
BEGIN
  FOR class_record IN SELECT id FROM classes WHERE school_code IS NULL
  LOOP
    LOOP
      -- Generate random 6-character alphanumeric code
      new_code := UPPER(
        SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6)
      );
      
      -- Check for duplicates
      SELECT EXISTS(SELECT 1 FROM classes WHERE school_code = new_code) INTO code_exists;
      
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    -- Update the class with the new code
    UPDATE classes SET school_code = new_code WHERE id = class_record.id;
  END LOOP;
END $$;

-- Add unique constraint
ALTER TABLE classes 
ADD CONSTRAINT unique_school_code UNIQUE(school_code);

-- Verify the fix
SELECT id, class_name, school_code 
FROM classes 
ORDER BY created_at DESC 
LIMIT 10;