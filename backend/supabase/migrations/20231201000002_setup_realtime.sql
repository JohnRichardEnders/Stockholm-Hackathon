-- Enable real-time for tables
ALTER PUBLICATION supabase_realtime ADD TABLE claims;
ALTER PUBLICATION supabase_realtime ADD TABLE fact_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE processing_jobs;

-- Enable Row Level Security (RLS) - for now allow all
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for development)
CREATE POLICY "Allow all operations on videos" ON videos FOR ALL USING (true);
CREATE POLICY "Allow all operations on transcripts" ON transcripts FOR ALL USING (true);
CREATE POLICY "Allow all operations on transcript_chunks" ON transcript_chunks FOR ALL USING (true);
CREATE POLICY "Allow all operations on claims" ON claims FOR ALL USING (true);
CREATE POLICY "Allow all operations on fact_checks" ON fact_checks FOR ALL USING (true);
CREATE POLICY "Allow all operations on processing_jobs" ON processing_jobs FOR ALL USING (true);
