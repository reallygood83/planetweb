-- Add survey_type and behavior_criteria to surveys table
ALTER TABLE surveys 
ADD COLUMN IF NOT EXISTS survey_type VARCHAR(50) DEFAULT 'academic' CHECK (survey_type IN ('academic', 'behavior_development')),
ADD COLUMN IF NOT EXISTS behavior_criteria JSONB DEFAULT NULL;

-- Update existing surveys to have survey_type 'academic'
UPDATE surveys SET survey_type = 'academic' WHERE survey_type IS NULL;

-- Create index for survey_type for better performance
CREATE INDEX IF NOT EXISTS idx_surveys_survey_type ON surveys(survey_type);

-- Add comment to explain the new columns
COMMENT ON COLUMN surveys.survey_type IS 'Type of survey: academic for subject learning, behavior_development for behavioral characteristics';
COMMENT ON COLUMN surveys.behavior_criteria IS 'JSON object containing behavioral assessment criteria including selected core values and observation contexts';