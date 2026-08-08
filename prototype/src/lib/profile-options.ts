export const PROFILE_INTERESTS = [
  'AI',
  'Design',
  'Startups',
  'Music',
  'Sports',
  'Research',
  'Volunteering',
  'Arts',
] as const;

export const PROFILE_SKILLS = [
  'React Native',
  'Programming',
  'UI/UX',
  'Content',
  'Public speaking',
  'Research',
  'Event planning',
  'Leadership',
] as const;

export function toggleProfileValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}
