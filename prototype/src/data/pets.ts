export type PetId = 'broke-lowpoly-cat' | 'meowbyte' | 'yier';

export type PetDefinition = {
  id: PetId;
  displayName: string;
  description: string;
  accent: string;
  sourcePath: string;
  initials: string;
};

// Native virtual pets. No image assets required.
export const PETS: PetDefinition[] = [
  { id: 'broke-lowpoly-cat', displayName: 'Lowpoly Cat', description: 'Playful low-poly cat with expressive reactions.', accent: '#FFF0D5', sourcePath: 'assets/broke-lowpoly-cat.zip', initials: 'LC' },
  { id: 'meowbyte', displayName: 'Meowbyte', description: 'Cyan-powered robot cat for focused study.', accent: '#D9FBFF', sourcePath: 'assets/meowbyte.zip', initials: 'MB' },
  { id: 'yier', displayName: 'Yier', description: 'Cheeky digital pet with big friendly energy.', accent: '#FFE6DE', sourcePath: 'assets/yier.zip', initials: 'YI' },
];

export const getPet = (id: string) => PETS.find((pet) => pet.id === id) ?? PETS[0];
