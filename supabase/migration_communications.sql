-- ============================================================
-- AION — Communication & Messaging System
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── 1. Conversations ──────────────────────────────────────────
-- A thread between a consumer and a creator
CREATE TABLE IF NOT EXISTS public.conversations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type            text NOT NULL 
                    CHECK (type IN ('hire_request', 'pre_sale_question', 'post_sale_support', 'tweak_request')),
    consumer_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id      uuid REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
    instance_id     uuid REFERENCES public.consumer_instances(id) ON DELETE SET NULL,
    subject         text NOT NULL,
    status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'quoted', 'accepted', 'resolved', 'closed')),
    priority        text DEFAULT 'none'
                    CHECK (priority IN ('hot', 'warm', 'custom', 'none')),
    is_public_faq   boolean DEFAULT false,
    metadata        jsonb DEFAULT '{}',
    last_message_at timestamptz DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. Messages ───────────────────────────────────────────────
-- Individual messages within a conversation
CREATE TABLE IF NOT EXISTS public.messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         text NOT NULL,
    message_type    text DEFAULT 'text'
                    CHECK (message_type IN ('text', 'system', 'ai_summary', 'attachment', 'quote')),
    attachments     jsonb DEFAULT '[]',
    is_read         boolean DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. Hire Requests ──────────────────────────────────────────
-- Structured brief from the AI intake chatbot
CREATE TABLE IF NOT EXISTS public.hire_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    consumer_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    brief           jsonb NOT NULL DEFAULT '{}',
    budget_range    text,
    deadline        timestamptz,
    tools_needed    text[] DEFAULT '{}',
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'negotiating', 'declined', 'completed')),
    quoted_price    int,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS POLICIES ──────────────────────────────────────────────

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = consumer_id OR auth.uid() = creator_id);

CREATE POLICY "Consumers can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = consumer_id);

CREATE POLICY "Participants can update conversations"
    ON public.conversations FOR UPDATE
    USING (auth.uid() = consumer_id OR auth.uid() = creator_id);

-- Public FAQ: anyone can view conversations marked as public FAQ
CREATE POLICY "Anyone can view public FAQ"
    ON public.conversations FOR SELECT
    USING (is_public_faq = true);

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation members see messages"
    ON public.messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = conversation_id 
        AND (c.consumer_id = auth.uid() OR c.creator_id = auth.uid())
    ));

-- Public FAQ messages are also visible
CREATE POLICY "Anyone can see FAQ messages"
    ON public.messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = conversation_id 
        AND c.is_public_faq = true
    ));

CREATE POLICY "Conversation members send messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id 
        AND EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id 
            AND (c.consumer_id = auth.uid() OR c.creator_id = auth.uid())
        )
    );

CREATE POLICY "Users can mark messages as read"
    ON public.messages FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = conversation_id 
        AND (c.consumer_id = auth.uid() OR c.creator_id = auth.uid())
    ));

-- Hire Requests
ALTER TABLE public.hire_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hire request participants can view"
    ON public.hire_requests FOR SELECT
    USING (auth.uid() = consumer_id OR auth.uid() = creator_id);

CREATE POLICY "Consumers can create hire requests"
    ON public.hire_requests FOR INSERT
    WITH CHECK (auth.uid() = consumer_id);

CREATE POLICY "Participants can update hire requests"
    ON public.hire_requests FOR UPDATE
    USING (auth.uid() = consumer_id OR auth.uid() = creator_id);

-- ─── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_consumer ON public.conversations(consumer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_creator ON public.conversations(creator_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON public.conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_hire_requests_creator ON public.hire_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_hire_requests_consumer ON public.hire_requests(consumer_id);
CREATE INDEX IF NOT EXISTS idx_hire_requests_conversation ON public.hire_requests(conversation_id);

-- ─── TRIGGERS ──────────────────────────────────────────────────
CREATE TRIGGER conversations_updated_at 
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── FUNCTION: Auto-update last_message_at on conversation ────
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger AS $$
BEGIN
    UPDATE public.conversations 
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message_update_conversation
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- ─── Enable Supabase Realtime for live messaging ───────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
