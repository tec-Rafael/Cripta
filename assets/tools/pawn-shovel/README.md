# Pawn — interação com pá

Animação composta com os três quadros originais de `Pawn_Interact Hammer.png`, do pacote Tiny Swords. Não utiliza o personagem redesenhado por IA. O Pawn mantém os pixels, poses, dimensões e alinhamento do sprite original; somente as regiões da ferramenta e seus efeitos de impacto foram adaptadas.

- Folha: `Pawn_Interact Shovel.png`, 576 × 192 pixels, três quadros de 192 × 192.
- Ordem: preparação, contato, recuperação. Reprodução sugerida: 5 quadros/s, ciclo de 0,6 s.
- Ferramenta: lâmina recortada de `../shovel-concept-v1.png`, a pá previamente aprovada, reduzida e girada com amostragem por vizinho mais próximo. O cabo e a pegada usam a animação original.
- Corpo preservado; substituição em coordenadas locais: quadro 0 (115,74,35,26); quadro 1 (124,110,40,32); quadro 2 (123,87,39,44). Efeitos claros de impacto do martelo foram removidos na região da ferramenta.
- Prévia: abrir `preview.html`; inclui os dois sentidos, pausa e controle de velocidade.

Estes arquivos são uma adaptação local dos sprites existentes. A animação está vinculada à pá no quinto espaço do inventário: três movimentos removem um toco permanentemente no Lar. A árvore cortada continua renascendo após uma hora se o toco não for removido.

`stump-preview.html` demonstra o corte e a escavação com os mesmos sistemas do jogo, usando o armazenamento separado `cripta.preview.stump.v1`. O botão de reiniciar limpa apenas os dados desta prévia.
