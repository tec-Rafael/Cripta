const characterProfiles = {
  pawn: {name:'CamponÃªs', avatar:'05'},
  knight: {name:'Cavaleiro', avatar:'01'},
  archer: {name:'Arqueiro', avatar:'02'},
  monk: {name:'Monge', avatar:'04'},
  lancer: {name:'Lanceiro', avatar:'03'},
};

function portraitUrl(character) {
  return 'assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_'+character.avatar+'.png';
}

function showCharacterBanner(id) {
  const banner = document.querySelector('#character-banner');
  const profile = characterProfiles[id];
  banner.querySelector('img').src = portraitUrl(profile);
  banner.querySelector('span').textContent = profile.name;
  banner.hidden = false;
}

function createAdventureDialog() {
  const dialog = document.querySelector('#adventure-dialog');
  const title = dialog.querySelector('h1');
  const choices = dialog.querySelector('.character-options');
  const actions = dialog.querySelector('.dialog-actions');
  const route=document.createElement('div');
  route.className='adventure-map-route';route.hidden=true;
  route.innerHTML='<svg viewBox="0 0 600 320" preserveAspectRatio="none" aria-hidden="true"><path d="M 85 230 C 160 230 155 95 260 95 S 445 100 480 45"/></svg><button type="button" class="adventure-map-emblem" aria-label="Selecionar aventura"><img src="assets/enemies/mbqmms-reference/Badge.png" alt=""></button>';
  dialog.querySelector('.adventure-panel').append(route);
  route.querySelector('button').onclick=()=>confirm?.();
  let confirm = null;
  let cancel = null;
  let returnFocus = null;
  function close() {
    dialog.close();
    returnFocus?.focus({preventScroll:true});
  }
  function dismiss() { close(); cancel?.(); }
  dialog.querySelector('.dialog-cancel').addEventListener('click', dismiss);
  dialog.querySelector('.dialog-no').addEventListener('click', dismiss);
  dialog.querySelector('.dialog-play').addEventListener('click', () => confirm?.());
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  for (const id of ['knight','archer','monk','lancer']) {
    const character = characterProfiles[id];
    const button = document.createElement('button');
    button.className = 'character-choice';
    button.type = 'button';
    button.title = character.name;
    const image = document.createElement('img');
    image.src = portraitUrl(character);
    image.alt = '';
    const label = document.createElement('span');
    label.textContent = character.name;
    button.append(image, label);
    button.addEventListener('click', () => confirm?.(id));
    choices.append(button);
  }
  function show(message, selecting, onConfirm, onCancel) {
    route.hidden=true;dialog.classList.remove('map-view');
    title.textContent = message;
    choices.hidden = !selecting;
    actions.hidden = selecting;
    dialog.classList.toggle('selecting', selecting);
    confirm = onConfirm;
    cancel = onCancel;
    if (!dialog.open) {
      returnFocus = document.activeElement;
      dialog.showModal();
    }
    dialog.focus({preventScroll:true});
  }
  const future=document.createElement('button');future.type='button';future.className='future-region';future.disabled=true;future.textContent='Região 2 · Em breve';route.append(future);
  function showMap(onConfirm,onCancel){
    future.hidden=progression.checkpoint<5;
    show('Mapa de Aventura',false,onConfirm,onCancel);
    actions.hidden=true;choices.hidden=true;route.hidden=false;
    dialog.classList.add('map-view');
  }
  return {show, showMap, close, get open() { return dialog.open; }};
}
