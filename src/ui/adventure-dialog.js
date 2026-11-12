const characterProfiles = {
  pawn: {name:'Camponês', avatar:'05'},
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
  return {show, close, get open() { return dialog.open; }};
}
