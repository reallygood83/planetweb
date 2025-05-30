-- Add members column to school_groups table
-- This will store member information directly in the school_groups table
-- avoiding the complex RLS policies on group_memberships table

ALTER TABLE school_groups 
ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb;

-- Create index for better performance when querying members
CREATE INDEX IF NOT EXISTS idx_school_groups_members ON school_groups USING GIN (members);

-- Add a function to get member count from the members JSONB array
CREATE OR REPLACE FUNCTION get_member_count(members_data JSONB)
RETURNS INTEGER AS $$
BEGIN
    RETURN jsonb_array_length(COALESCE(members_data, '[]'::jsonb));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing school_groups to have empty members array if they don't have one
UPDATE school_groups 
SET members = '[]'::jsonb 
WHERE members IS NULL;