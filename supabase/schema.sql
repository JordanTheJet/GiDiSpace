-- GiDiSpace Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles table (GiDi information)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    selected_avatar_model TEXT DEFAULT '/avatars/raiden.vrm',
    ai_personality_prompt TEXT,
    bio TEXT,
    interests TEXT[] DEFAULT '{}',
    voice_id TEXT,
    voice_preview_url TEXT,
    voice_ready BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Avatar states (position, animation, online status)
CREATE TABLE IF NOT EXISTS avatar_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    position JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}',
    rotation JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}',
    animation TEXT DEFAULT 'idle',
    is_online BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id)
);

-- Room messages (chat history)
CREATE TABLE IF NOT EXISTS room_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge chunks for RAG (vector embeddings)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
ON knowledge_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for faster profile lookups
CREATE INDEX IF NOT EXISTS avatar_states_profile_id_idx ON avatar_states(profile_id);
CREATE INDEX IF NOT EXISTS room_messages_created_at_idx ON room_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_chunks_profile_id_idx ON knowledge_chunks(profile_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Policies for profiles (anyone can read, only owner can write)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (true);

-- Policies for avatar_states
CREATE POLICY "Avatar states are viewable by everyone" ON avatar_states
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own avatar state" ON avatar_states
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own avatar state" ON avatar_states
    FOR UPDATE USING (true);

-- Policies for room_messages
CREATE POLICY "Room messages are viewable by everyone" ON room_messages
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert messages" ON room_messages
    FOR INSERT WITH CHECK (true);

-- Policies for knowledge_chunks
CREATE POLICY "Knowledge chunks are viewable by everyone" ON knowledge_chunks
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own knowledge" ON knowledge_chunks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own knowledge" ON knowledge_chunks
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own knowledge" ON knowledge_chunks
    FOR DELETE USING (true);

-- Enable realtime for avatar_states and room_messages
ALTER PUBLICATION supabase_realtime ADD TABLE avatar_states;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
