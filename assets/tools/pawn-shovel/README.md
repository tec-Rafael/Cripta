# Versão ativa: native-v3

O jogo e a prévia usam as três folhas de native-v3/. São novos quadros completos de repouso, movimento e escavação, gerados com o Pawn original como referência e braços, mãos e pá desenhados juntos. A normalização mantém a paleta original, o corpo com 70 pixels de altura, a linha dos pés e as células de 192 × 192. Repouso e movimento têm oito quadros; a escavação tem seis em 0,6 segundo. Consulte native-v3/README.md para a origem e normalize.ps1 para a normalização.

As seções abaixo documentam tentativas anteriores. Seus arquivos e scripts permanecem como histórico e não são carregados pelo jogo.

---
# Pawn — interação com pá

Animação composta com os três quadros originais de `Pawn_Interact Hammer.png`, do pacote Tiny Swords. Não utiliza o personagem redesenhado por IA. O Pawn mantém os pixels, poses, dimensões e alinhamento do sprite original; somente as regiões da ferramenta e seus efeitos de impacto foram adaptadas.

- Folha: `Pawn_Interact Shovel.png`, 576 × 192 pixels, três quadros de 192 × 192.
- Ordem: preparação, contato, recuperação. Reprodução sugerida: 5 quadros/s, ciclo de 0,6 s.
- Ferramenta: lâmina recortada de `../shovel-concept-v1.png`, a pá previamente aprovada, reduzida e girada com amostragem por vizinho mais próximo. O cabo e a pegada usam a animação original.
- Corpo preservado; substituição em coordenadas locais: quadro 0 (115,74,35,26); quadro 1 (124,110,40,32); quadro 2 (123,87,39,44). Efeitos claros de impacto do martelo foram removidos na região da ferramenta.
- Prévia: abrir `preview.html`; inclui os dois sentidos, pausa e controle de velocidade.

Estes arquivos são uma adaptação local dos sprites existentes. A animação está vinculada à pá no quinto espaço do inventário: três movimentos removem um toco permanentemente no Lar. A árvore cortada continua renascendo após uma hora se o toco não for removido.

`stump-preview.html` demonstra o corte e a escavação com os mesmos sistemas do jogo, usando o armazenamento separado `cripta.preview.stump.v1`. O botão de reiniciar limpa apenas os dados desta prévia.


## Repouso e movimento com a pá

- `Pawn_Idle Shovel.png`: 8 quadros originais, 1536 × 192, 10 quadros/s.
- `Pawn_Run Shovel.png`: 6 quadros originais, 1152 × 192; caminhada a 8 quadros/s e corrida a 15 quadros/s.
- `Pawn_Interact Shovel.png`: 3 quadros, 576 × 192; mantém as poses originais da interação com martelo.
- As três animações estão ativas no jogo. A prévia `preview.html` permite alternar entre elas.
- A pá acompanha o deslocamento da mão em cada quadro. Não há ícone estático sobreposto durante o movimento.
- O metal usa a paleta original de Tool_03.png: RGB (22,28,46), (105,119,127), (160,179,182), (218,243,238). A transparência dos recortes é limpa, sem RGB branco invisível nas bordas.
- `build-sprites.ps1` reproduz a composição a partir dos sprites originais de martelo e da pá aprovada, sem gerar um novo personagem. Executar com PowerShell no Windows.


## Versão ativa: novos sprites completos

A pasta `generated-v2/` contém a versão ativa gerada a partir das referências originais de picareta e martelo. O Pawn, as mãos e a pá foram desenhados como poses completas. Os arquivos antigos e `build-sprites.ps1` permanecem apenas como histórico e não geram nem substituem a versão ativa. A interação atual tem 6 quadros, em ciclo de 0,6 segundo; ver `generated-v2/README.md` para a origem e o prompt.


## Versão ativa corrigida — Pawn base do pacote

O jogo e a prévia usam novamente os arquivos desta pasta, feitos com o Pawn original do pacote. Corpo, cabelo, rosto e poses são preservados; a adaptação é restrita à ferramenta. Idle: 8 quadros a 10 fps; caminhada: 6 quadros a 8 fps; corrida: 6 quadros a 15 fps; escavação: 3 poses originais em ciclo de 0,6 s. Os arquivos de generated-v2 permanecem apenas como histórico e não são carregados.
