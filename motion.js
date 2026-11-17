// These offsets refer to the source video's clock, so seeking re-creates the same pose.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function attach(element, frames, start, duration, easing = 'linear') {
  const animation = element.animate(frames, { duration: duration * 1000, easing, fill: 'both' });
  animation.pause();
  return { animation, start, duration };
}

function sample(effects, time) {
  for (const { animation, start, duration } of effects) {
    const position = Math.min(duration, Math.max(0, time - start)) * 1000;
    if (animation.currentTime !== position) animation.currentTime = position;
  }
}

const photoCuts = [
  {
    id: 'city', start: 17.84, end: 20.26,
    frames: [
      { offset: 0, opacity: 0, transform: 'translate(85%,-20%) rotate(18deg)' },
      { offset: .13, opacity: 1, transform: 'translate(-4%,2%) rotate(3deg)', easing: 'ease-out' },
      { offset: .24, transform: 'rotate(5deg)' },
      { offset: .87, opacity: 1, transform: 'translateY(1%) rotate(5deg)' },
      { offset: 1, opacity: 0, transform: 'translate(28%,-7%) rotate(10deg)' }
    ]
  },
  {
    id: 'ocean', start: 25.92, end: 28.30,
    frames: [
      { offset: 0, opacity: 0, filter: 'brightness(1.8)', transform: 'translate(26%,32%) rotate(10deg)' },
      { offset: .12, opacity: 1, transform: 'translate(-2%,-2%) rotate(-8deg)' },
      { offset: .30, filter: 'brightness(1)', transform: 'rotate(-6deg)' },
      { offset: .90, opacity: 1, transform: 'translateY(-2%) rotate(-5deg)' },
      { offset: 1, opacity: 0, transform: 'translateY(12%) rotate(-9deg)' }
    ]
  },
  {
    id: 'train', start: 35.43, end: 37.10,
    frames: [
      { offset: 0, opacity: 0, transform: 'translateY(-80%) rotate(2deg)' },
      { offset: .19, opacity: 1, transform: 'translateY(4%) rotate(6deg)' },
      { offset: .25, transform: 'rotate(5deg)' },
      { offset: .84, opacity: 1, transform: 'translateY(2%) rotate(5deg)' },
      { offset: 1, opacity: 0, transform: 'translateY(-44%) rotate(7deg)' }
    ]
  }
];
const photos = photoCuts.map(cut => ({ ...cut, element: document.getElementById(cut.id) }));
let activePhoto;
let photoEffects = [];
let typeEffects = [];

export function renderPhoto(time) {
  const next = photos.find(photo => time >= photo.start && time < photo.end);
  if (next !== activePhoto) {
    activePhoto?.element.classList.remove('visible');
    photoEffects.forEach(effect => effect.animation.cancel());
    photoEffects = [];
    activePhoto = next;
    if (next) {
      next.element.classList.add('visible');
      if (!reduceMotion.matches) photoEffects.push(attach(next.element, next.frames, next.start, next.end - next.start));
    }
  }
  sample(photoEffects,time);
}

const wordReveal = [
  { opacity: 0, transform: 'translateY(.22em)', clipPath: 'inset(0 0 85% 0)' },
  { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(-12%)' }
];
const drop = [
  { opacity: 0, transform: 'translateY(-.55em) rotate(-4deg)' },
  { offset: .62, opacity: 1, transform: 'translateY(.055em) rotate(1deg)' },
  { transform: 'translateY(0)' }
];
const freeze = [
  { opacity: .2, transform: 'translateX(.18em)', textShadow: '-.13em 0 #eee8ce' },
  { offset: .45, opacity: 1, transform: 'translateX(0)', textShadow: '-.045em 0 #eee8ce' },
  { textShadow: '0 0 transparent' }
];
const swell = [
  { opacity: 0, transform: 'translateY(.14em) rotate(2deg)' },
  { offset: .57, opacity: 1, transform: 'translateY(-.08em) rotate(-1deg)' },
  { transform: 'translateY(0)' }
];
const stamped = new Set([3,11,21,30,35]);

export function composeLine(container, cue, index) {
  typeEffects.forEach(effect => effect.animation.cancel());
  typeEffects = [];
  container.replaceChildren();
  if (!cue) return;
  const [start, accent, lead, tail] = cue;
  for (const [part, text, entrance] of [['lead',lead,start],['tail',tail,accent]]) {
    const row = document.createElement('span');
    row.className = 'row ' + part;
    if (part === 'tail' && stamped.has(index)) row.classList.add('stamp');
    container.append(row);
    const pieces = text.split(' ');
    pieces.forEach((value, i) => {
      if (i) row.append(' ');
      const word = document.createElement('span');
      word.className = 'word';
      word.textContent = value;
      row.append(word);
      if (reduceMotion.matches) return;
      let frames = wordReveal;
      if (part === 'tail') {
        if (index === 17) frames = drop;
        if (index === 26 || index === 22) frames = freeze;
        if (index === 18 || index === 19) frames = swell;
      }
      const delay = i * Math.min(.038, .11 / pieces.length);
      typeEffects.push(attach(word, frames, entrance + delay, frames === wordReveal ? .16 : .32, 'cubic-bezier(.19,.78,.24,1)'));
    });
  }
}

export function renderType(time) {
  sample(typeEffects,time);
}
