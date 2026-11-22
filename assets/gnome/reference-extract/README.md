# Gnomo — extração do GIF de referência

Origem: https://img.itch.zone/aW1nLzI5MzY4ODk0LmdpZg==/original/2Xkpgt.gif

O GIF contém 24 quadros de 1600×256, com intervalo de 100 ms. Os três personagens são demonstrações simultâneas de repouso, caminhada e ataque. As folhas Idle.png, Run.png e Strike.png têm 24 células de 192×192. A cor de cada pixel mantido vem do original, sem redesenho; a transparência foi reconstruída separando o papel e a sombra do personagem. Isso pode deixar pequenas diferenças na borda do recorte. O GIF promocional não substitui os arquivos-fonte das animações.

Banner-original.png é o recorte do painel original com o rosto, preservado sem reconstrução. Portrait.png é uma extração auxiliar da medalha; pode conter fragmentos do painel nas bordas, porque os elementos se sobrepõem no GIF. reference.gif preserva o material recebido.

O jogo carrega Idle.png, Run.png e Strike-Combat.png. A sequência de combate usa os quadros 0..6 do ataque original: preparação 0..2, descida 3..4, recuperação 5..6. O impacto é mantido no quadro 4 durante a aplicação do dano. A prévia também usa os novos sprites. Os arquivos anteriores permanecem preservados. Badge.png contém somente o retrato com o emblema, sem o pergaminho, e está registrado como gnomePortrait no carregador. prepare-runtime.ps1 reproduz o recorte final e a folha de combate.

extract.ps1 reproduz o recorte e a remoção do fundo, mantendo o RGB original.