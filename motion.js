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

const easeOut = 'cubic-bezier(.23,1,.32,1)';
const wordReveal = [
  { opacity: 0, transform: 'translateY(.12em)', clipPath: 'inset(0 0 70% 0)' },
  { opacity: 1, transform: 'none', clipPath: 'inset(-10%)' }
];
const whisper = [{ opacity: 0 }, { opacity: 1 }];
const drop = [
  { opacity: 0, transform: 'translateY(-.55em) rotate(-4deg)' },
  { offset: .68, opacity: 1, transform: 'translateY(.065em) rotate(1deg)' },
  { opacity: 1, transform: 'none' }
];
const impact = [
  { opacity: 0, transform: 'translateY(.1em) scale(.92,1.08)' },
  { offset: .18, opacity: 1, transform: 'translateY(.03em) scale(1.12,.87)' },
  { offset: .49, opacity: 1, transform: 'translateY(-.035em) scale(.985,1.05)' },
  { opacity: 1, transform: 'none' }
];
const lock = [
  { opacity: 0, transform: 'translateX(.16em) skewX(-7deg)' },
  { offset: .38, opacity: 1, transform: 'none' },
  { opacity: 1, transform: 'none' }
];
const swell = [
  { opacity: 0, transform: 'translateY(.14em) rotate(2deg)' },
  { offset: .57, opacity: 1, transform: 'translateY(-.08em) rotate(-1deg)' },
  { opacity: 1, transform: 'none' }
];

// Only the last spoken word receives the full impact. Leave the family passage quiet.
const stamped = new Set([3, 11, 21, 30, 33, 35]);
const endings = new Map([
  [2, whisper], [16, whisper], [17, drop], [18, swell], [19, swell],
  [22, lock], [26, lock], [27, whisper]
]);
const echoes = new Set([3, 22, 35]);

function addEcho(word, text, start) {
  const echo = document.createElement('i');
  echo.className = 'echo';
  echo.dataset.text = text;
  echo.setAttribute('aria-hidden', 'true');
  word.append(echo);
  typeEffects.push(attach(echo, [
    { opacity: 0, transform: 'none' },
    { offset: .2, opacity: .8, transform: 'translate(.035em,-.04em)' },
    { opacity: 0, transform: 'translate(.14em,-.25em)' }
  ], start, .28));
}

export function composeLine(container, cue, index) {
  typeEffects.forEach(effect => effect.animation.cancel());
  typeEffects = [];
  container.replaceChildren();
  if (!cue) return;

  const parts = [
    ['lead', cue.lead, cue.leadStarts],
    ['tail', cue.tail, cue.tailStarts]
  ];
  for (const [part, text, starts] of parts) {
    const row = document.createElement('span');
    row.className = 'row ' + part;
    container.append(row);
    const pieces = text.split(' ');
    pieces.forEach((value, i) => {
      if (i) row.append(' ');
      const word = document.createElement('span');
      word.className = 'word';
      word.textContent = value;
      const isEnding = part === 'tail' && i === pieces.length - 1;
      const punch = isEnding && stamped.has(index);
      if (punch) word.classList.add('stamp');
      row.append(word);

      const start = starts[i];
      let frames = isEnding ? endings.get(index) || wordReveal : wordReveal;
      if (punch) frames = impact;
      if (reduceMotion.matches || index === 16) frames = whisper;
      const duration = frames === wordReveal || reduceMotion.matches ? .12 : .26;
      typeEffects.push(attach(word, frames, start, duration, easeOut));
      if (isEnding && echoes.has(index) && !reduceMotion.matches) addEcho(word, value, start);
    });

    if (part === 'lead' && stamped.has(index)) {
      typeEffects.push(attach(row, [{opacity: 1}, {opacity: .66}], cue.tailStarts.at(-1), .18));
    }
    // A short breath before the stop, with the voice and video continuing through it.
    if (part === 'lead' && index === 26) {
      typeEffects.push(attach(row, [{opacity: 1}, {opacity: 0}], cue.accent - .16, .10));
    }
  }
}

export function renderType(time) {
  sample(typeEffects, time);
}
