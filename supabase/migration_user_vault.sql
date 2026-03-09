-- ============================================================
-- AION — User Secret Vault
-- Private keys and environment variables at user level
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_vault (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    key_name        text NOT NULL,            -- e.g. 'OPENAI_API_KEY', 'GROQ_API_KEY'
    key_value       text NOT NULL,
    description     text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, key_name)
);

ALTER TABLE public.user_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own vault" 
    ON public.user_vault FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vault_user ON public.user_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_key_name ON public.user_vault(key_name);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS user_vault_updated_at ON public.user_vault;
CREATE TRIGGER user_vault_updated_at BEFORE UPDATE ON public.user_vault
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
