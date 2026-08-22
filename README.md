# Mural da Alice v1

Versão pronta para subir no GitHub e publicar na Vercel, baseada no mesmo sistema do Mural do Texugo / Mural do Empório.

## Identidade
- Fundo rosa com detalhes roxo/creme
- Foto original da Alice no destaque lateral do telão e na página inicial
- Logo Tex Pub
- Hashtag `#MuralDaAlice`

## Firebase
Usa o mesmo projeto Firebase já configurado, porém em coleção separada: `alice_posts`.
Assim, as publicações da Alice não se misturam com os outros murais.

## Rotas
- `/` apresentação
- `/post/` envio por celular
- `/wall/` telão / TV
- `/admin/` administração

## Admin
PIN: o mesmo definido em `config.js`.

## Deploy
1. Suba todo o conteúdo desta pasta em um repositório GitHub.
2. Importe o repositório na Vercel.
3. Deploy sem framework e sem comando de build.
4. Para o QR funcionar, abra `/wall/` pelo domínio final da Vercel.

## Firestore
O arquivo `firebase/firestore.rules` inclui a coleção `alice_posts`. Caso as regras atuais do projeto Firebase não permitam essa coleção, publique esse arquivo no Firebase antes de usar o mural em produção.
