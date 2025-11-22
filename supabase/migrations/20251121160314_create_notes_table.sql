-- Create notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  preview TEXT, -- First 100 chars for sidebar preview
  is_public BOOLEAN DEFAULT FALSE
);

-- Enable RLS for notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can view their own notes and public notes
CREATE POLICY "Authenticated users can view their own notes and public notes" ON notes
  FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

-- Policy: authenticated users can create notes
CREATE POLICY "Authenticated users can create notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: authenticated users can update their own notes
CREATE POLICY "Authenticated users can update their own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: authenticated users can delete their own notes
CREATE POLICY "Authenticated users can delete their own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster queries
CREATE INDEX notes_user_id_idx ON notes(user_id);
CREATE INDEX notes_updated_at_idx ON notes(updated_at DESC);
