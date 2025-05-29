-- Create generated_records table
CREATE TABLE IF NOT EXISTS generated_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('교과학습발달상황', '창의적 체험활동 누가기록', '행동특성 및 종합의견')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create indexes
CREATE INDEX idx_generated_records_response_id ON generated_records(response_id);
CREATE INDEX idx_generated_records_user_id ON generated_records(user_id);
CREATE INDEX idx_generated_records_created_at ON generated_records(created_at DESC);

-- Enable RLS
ALTER TABLE generated_records ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Teachers can view their own generated records" ON generated_records
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can insert their own generated records" ON generated_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can update their own generated records" ON generated_records
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can delete their own generated records" ON generated_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER set_generated_records_updated_at
  BEFORE UPDATE ON generated_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();