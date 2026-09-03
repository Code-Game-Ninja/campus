export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: 'Why an APK instead of the Play Store?',
    answer:
      'CampusSphere is distributed directly while it is early. The build published here is the same one the team runs, signed and uploaded to GitHub Releases so you can see the version, the file size and the publish date before you install anything.',
  },
  {
    question: 'Android will warn me about installing this. Is that normal?',
    answer:
      'Yes. Android blocks installs from outside the Play Store until you allow it for the app doing the installing, usually your browser or file manager. The warning is about the source, not about this specific file. If you would rather not sideload, wait for the Play Store listing.',
  },
  {
    question: 'How do I actually install it?',
    answer:
      'Download the APK, open it from your notifications or Downloads folder, and approve the one-time prompt that asks whether your browser can install unknown apps. The installer takes over from there.',
  },
  {
    question: 'Does it work on iPhone?',
    answer:
      'Not yet. The current build ships for Android only. The codebase is React Native, so an iOS build is possible, but there is nothing to download for iOS today.',
  },
  {
    question: 'What do I need to sign in?',
    answer:
      'An email address you can open. CampusSphere emails you a six-digit code instead of asking you to invent another password. After the code you pick your university and set up a profile, and everything you see from then on is scoped to that campus.',
  },
  {
    question: 'Will it update itself?',
    answer:
      'No. A sideloaded APK does not receive Play Store updates. When a new version is published, come back to this page and install the newer APK over the old one. Your account and data are on the server, so nothing is lost.',
  },
  {
    question: 'Who can see what I post?',
    answer:
      'Content is scoped to your campus and enforced on the database, not in the app. You can request a data export, request a campus change, or request account deletion from Privacy and account inside the app, and you can sign out a single device or every device from Security and devices.',
  },
  {
    question: 'I found a bug. Where does it go?',
    answer:
      'The form on this page. Pick what kind of problem it is, describe what you were doing, and attach a screenshot if you have one. It reaches the same three people who build the app.',
  },
];
