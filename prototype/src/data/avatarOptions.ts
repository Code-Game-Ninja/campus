export type AvatarOption = {
  id: string;
  label: string;
  provider: 'DiceBear' | 'OpenMoji';
  url: (seed: string) => string;
  license: string;
  source: string;
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'pixel', label: 'Pixel Art', provider: 'DiceBear', url: (seed) => `https://api.dicebear.com/9.x/pixel-art/png?seed=${encodeURIComponent(seed)}`, license: 'Style license: check DiceBear style page', source: 'dicebear.com' },
  { id: 'adventurer', label: 'Adventurer', provider: 'DiceBear', url: (seed) => `https://api.dicebear.com/9.x/adventurer/png?seed=${encodeURIComponent(seed)}`, license: 'Style license: check DiceBear style page', source: 'dicebear.com' },
  { id: 'notionists', label: 'Notionists', provider: 'DiceBear', url: (seed) => `https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(seed)}`, license: 'Style license: check DiceBear style page', source: 'dicebear.com' },
  { id: 'bottts', label: 'Bottts', provider: 'DiceBear', url: (seed) => `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(seed)}`, license: 'Style license: check DiceBear style page', source: 'dicebear.com' },
  { id: 'openmoji-wave', label: 'OpenMoji Wave', provider: 'OpenMoji', url: () => 'https://openmoji.org/data/color/svg/1F44B.svg', license: 'CC BY-SA 4.0 · attribution required', source: 'openmoji.org' },
  { id: 'openmoji-star', label: 'OpenMoji Star', provider: 'OpenMoji', url: () => 'https://openmoji.org/data/color/svg/1F31F.svg', license: 'CC BY-SA 4.0 · attribution required', source: 'openmoji.org' },
];

export const getAvatarOption = (id?: string) => AVATAR_OPTIONS.find((option) => option.id === id) ?? AVATAR_OPTIONS[0];
