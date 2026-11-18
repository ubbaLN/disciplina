# Disciplina 2027 — como colocar no ar

São quatro partes: o banco de dados (Supabase), a hospedagem do app (GitHub Pages), o app no iPhone e o widget com as notificações (Scriptable + Atalhos). Leva uns 30 minutos no total, e tudo é gratuito.

```
disciplina/
├── app/            → o app (é isto que vai para o GitHub)
├── supabase/       → setup.sql (cria o banco)
└── scriptable/     → Disciplina.js (widget + notificações)
```

> **Quer só testar antes?** Abra `app/index.html` por um servidor local ou publique só a pasta `app` (passo 2) sem preencher o `config.js`. O app roda em **modo local**: os dados ficam só naquele navegador.

---

## 1. Banco de dados (Supabase)

1. Crie uma conta em **supabase.com** e clique em **New project**. Escolha a região **South America (São Paulo)** e anote a senha do banco.
2. No menu lateral, abra **SQL Editor → New query**, cole todo o conteúdo de `supabase/setup.sql` e clique em **Run**.
3. Crie o seu usuário em **Authentication → Users → Add user → Create new user**, com seu e-mail e uma senha, e marque **Auto Confirm User**.
4. Bloqueie novos cadastros em **Authentication → Sign In / Providers**, desligando **Allow new users to sign up**. Assim, só você consegue entrar.
5. Em **Project Settings → API**, copie:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - a chave **anon public** (ou **Publishable key**, dependendo da versão do painel)

## 2. Hospedar o app (GitHub Pages)

1. Abra `app/config.js` num editor de texto e cole a URL e a chave do passo 1.5:
   ```js
   window.DISCIPLINA_CONFIG = {
     supabaseUrl: 'https://abcd1234.supabase.co',
     supabaseAnonKey: 'eyJ...'
   };
   ```
   Essa chave é feita para ficar pública. O que protege os seus dados é o login e as regras de segurança do `setup.sql`.
2. Crie uma conta em **github.com** e depois um repositório **público** chamado `disciplina`.
3. No repositório, clique em **Add file → Upload files** e arraste **o conteúdo da pasta `app`**: `index.html`, `app.js`, `styles.css`, `config.js`, `manifest.webmanifest`, `sw.js` e a pasta `icons`. Clique em **Commit changes**.
4. Vá em **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**, depois **main** e **/ (root)**, e salve.
5. Em 1 ou 2 minutos o app estará em `https://SEU-USUARIO.github.io/disciplina/`.

Para atualizar o app depois, é só subir os arquivos novos do mesmo jeito.

## 3. No iPhone

1. Abra o endereço do app no **Safari**.
2. Toque em **Compartilhar → Adicionar à Tela de Início**.
3. Abra pelo ícone novo e entre com o e-mail e a senha do passo 1.3.

No notebook, é só abrir o mesmo endereço no navegador. A aba **Ajustes** é onde você configura os dias de aula, os itens e as metas.

## 4. Widget e notificações das 00h (Scriptable + Atalhos)

### Script
1. Instale o app **Scriptable** (gratuito) da App Store.
2. Toque em **+**, cole todo o conteúdo de `scriptable/Disciplina.js` e renomeie o script para **Disciplina**, exatamente com esse nome.
3. No topo do script, preencha `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `APP_URL` (o endereço do passo 2.5).
4. Toque em ▶︎ para rodar. Ele pede seu e-mail e senha uma vez, guarda tudo no Keychain do iPhone e mostra a prévia do widget.
5. Quando o iPhone perguntar, permita as notificações do Scriptable.

### Widget
1. Segure a tela de início, toque em **Editar → Adicionar Widget** e escolha **Scriptable**, no tamanho pequeno ou médio.
2. Segure o widget, toque em **Editar Widget** e escolha **Script: Disciplina**. O resto pode ficar como está. Tocar no widget abre o app, porque o script já aponta para o `APP_URL`.

O widget mostra o % do dia, a água e a semana (no tamanho médio aparecem as barras de segunda a sexta). O iOS atualiza o widget a cada 15 minutos, mais ou menos. É o próprio sistema que decide a hora exata.

### Notificações da meia-noite
1. Abra o app **Atalhos → Automação → + → Hora do Dia**.
2. Escolha **00:00** e **Diariamente**, marque **Executar Imediatamente** e toque em Seguinte.
3. Adicione a ação **Run Script**, do Scriptable. Em Script, escolha **Disciplina**. Em **Parameter**, escreva `meianoite`. Deixe **Run In App** desligado.

O que acontece à meia-noite:
- Chega **"Hora de dormir"**. Segure a notificação para ver os botões **Estou indo dormir** e **Ainda não**.
- Logo depois de tocar em um deles, chega **"O dia acabou: você fez X% das metas diárias. Boa noite e até amanhã."**. Tocar em "Estou indo dormir" já marca o item de sono antes de calcular o %.
- Se o sono já estiver marcado, chega direto o resumo do dia.
- Nas madrugadas de sábado para domingo e de domingo para segunda não chega nada, porque o fim de semana é livre.

Se você mudar o horário de dormir em Ajustes, mude também o horário da automação.

---

## Regras do app

- **Nota do dia:** itens marcados ÷ itens ativos. Todos têm o mesmo peso, e a água conta quando bate a meta.
- **Prazo:** dá para marcar o dia de hoje e o de ontem. Antes de ontem, o dia fica fechado.
- **Exceção:** o dia sai da média e o motivo fica registrado.
- **Fim de semana:** é livre. Musculação e atividade diversificada contam como bônus e não entram na nota.
- **Semana:** a média dos dias de segunda a sexta, sem contar as exceções.
- **Gráfico:** mostra o % de cada semana contra a linha da meta (80%). A semana em andamento aparece como um círculo vazado.
- **Mudanças no checklist:** criar, desligar ou apagar um item vale a partir do dia em que você mudou. As semanas que já passaram mantêm a nota.
- **Início:** a contagem começa em 01/02/2027. Para testar antes, mude a data de início em Ajustes e depois volte para 01/02/2027.
- **Sem internet:** o app continua funcionando e sincroniza sozinho quando a conexão volta.
