-- Disciplina 2027 — banco de dados
-- Cole tudo isto no Supabase: SQL Editor > New query > Run.

create table if not exists public.dias (
  user_id         uuid        not null default auth.uid() references auth.users on delete cascade,
  data            date        not null,
  feitos          jsonb       not null default '{}'::jsonb,   -- itens marcados: {"musc": true, ...}
  agua_ml         integer     not null default 0,
  excecao         boolean     not null default false,
  excecao_texto   text        not null default '',
  atividade_texto text        not null default '',            -- "o que fiz" da atividade diversificada
  refeicoes       jsonb       not null default '[]'::jsonb,    -- [{tipo, texto, hora}]
  itens           jsonb,                                       -- itens que valiam naquele dia
  atualizado_em   timestamptz not null default now(),
  primary key (user_id, data)
);

create table if not exists public.ajustes (
  user_id       uuid        primary key default auth.uid() references auth.users on delete cascade,
  dados         jsonb       not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- Segurança: cada usuário só enxerga e altera os próprios dados.
alter table public.dias    enable row level security;
alter table public.ajustes enable row level security;

drop policy if exists "dias do dono" on public.dias;
create policy "dias do dono" on public.dias
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ajustes do dono" on public.ajustes;
create policy "ajustes do dono" on public.ajustes
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
