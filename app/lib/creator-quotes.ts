type Quote = {
  text: string;
  author?: string;
};

export const CREATOR_QUOTES: Quote[] = [
  { text: "Your next viewer might be the person who needed to hear exactly what you said." },
  { text: "Numbers measure reach, not worth. Your impact can't be quantified." },
  { text: "Every creator you admire once had zero subscribers." },
  { text: "The comment section is a conversation, not a scoreboard." },
  { text: "Create for the person you were before you started." },
  { text: "You don't need to go viral. You need to be genuine." },
  { text: "Someone out there is binge-watching your content right now and feeling less alone." },
  { text: "Rest is part of the creative process, not a break from it." },
  { text: "The algorithm doesn't measure the lives you've changed." },
  { text: "Your unique perspective is the one thing nobody else can offer." },
  { text: "Consistency isn't about being perfect. It's about showing up." },
  { text: "Behind every comment is a real person who chose to spend time with your work." },
  { text: "You're not behind. You're on your own timeline." },
  { text: "The best content comes from a place of curiosity, not comparison." },
  { text: "One meaningful connection is worth more than a thousand passive views." },
  { text: "Your voice matters even when the numbers are quiet." },
  { text: "Creating is brave. Sharing is braver." },
  { text: "Not every video needs to be your best. Some just need to exist." },
  { text: "The comments you remember most aren't the ones with the most likes." },
  { text: "You started creating for a reason. That reason is still valid." },
  { text: "Growth isn't always visible in analytics. Sometimes it's in how you feel about your work." },
  { text: "Take a breath. Your community isn't going anywhere." },
  { text: "The internet is vast, and someone is grateful you're part of it." },
  { text: "Creativity is not a performance. It's a practice.", author: "Seth Godin" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
];

export function getRandomQuote(): Quote {
  return CREATOR_QUOTES[Math.floor(Math.random() * CREATOR_QUOTES.length)];
}
