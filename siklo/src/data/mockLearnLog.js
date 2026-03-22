export const MOCK_LEARN_LOG = [
  {
    id: 1,
    english: "Pineapple bun",
    cantonese: "菠蘿包",
    romanization: "boh-loh-baau",
    status: "getting_there",
    note: "Tone on last syllable",
    dateAdded: "3 days ago",
    attempts: 4,
    coachResult: {
      correctPronunciation: "boh-LO-baau",
      userAttempt: "boh-lo-BAU",
      whatWentWrong: "The second syllable 'lo' (蘿) needs a slight rise — like the end of a question in English. \"boh-LO?\"\n\nThe last syllable 'baau' (包) should be flat and short. You were hitting it like an English 'bao' which sounds too open.",
      thinkOfItLike: "Say \"below\" — now drop the 'w' and make the 'o' rise slightly. That's the middle syllable nailed.",
      personalNote: "Tried this ordering at Kam Wah Cafe — got a smile!"
    }
  },
  {
    id: 2,
    english: "Excuse me (on MTR)",
    cantonese: "唔該借借",
    romanization: "m-goi-je-je",
    status: "mastered",
    note: "Mastered ✓",
    dateAdded: "1 week ago",
    attempts: 7,
    coachResult: {
      correctPronunciation: "m-GOI je-JE",
      userAttempt: "m-GOI je-JE",
      whatWentWrong: "Nothing! You nailed it. The double 借借 (je-je) gives it that natural HK urgency. Well done.",
      thinkOfItLike: "Like saying \"excuse, excuse\" — the repetition makes it sound native.",
      personalNote: "Used this on the MTR during rush hour. It works!"
    }
  },
  {
    id: 3,
    english: "One more beer please",
    cantonese: "再要多一杯啤酒",
    romanization: "joi-yiu-doh-yat-bui-be-jau",
    status: "struggling",
    note: "Word order",
    dateAdded: "2 weeks ago",
    attempts: 2,
    coachResult: {
      correctPronunciation: "JOI yiu DOH yat bui BE-jau",
      userAttempt: "yat bui be-jau JOI",
      whatWentWrong: "The word order is different from English. In Cantonese, the 'again/more' (再要多) comes BEFORE the item. You put it after, which sounds like 'one beer again' — they'll understand but it marks you as a learner.",
      thinkOfItLike: "Think: 'More-want-additional one cup beer.' The request framing comes first in Cantonese.",
      personalNote: ""
    }
  },
  {
    id: 4,
    english: "How much?",
    cantonese: "幾多錢？",
    romanization: "gei-doh-chin",
    status: "getting_there",
    note: "Rising tone on 幾",
    dateAdded: "3 weeks ago",
    attempts: 5,
    coachResult: {
      correctPronunciation: "GEI-doh chin?",
      userAttempt: "gei-DOH chin",
      whatWentWrong: "The stress is on the first syllable 幾 (gei), not the second. You're putting emphasis on 多 (doh) which changes the meaning slightly — it sounds more like 'how MANY money' rather than the natural 'how much?'",
      thinkOfItLike: "Think of the English \"HOW much\" — the stress on HOW is the same pattern as GEI-doh.",
      personalNote: "Used at the wet market. Mai Ling understood but laughed."
    }
  }
];

export const MOCK_NEW_COACH_RESULT = {
  english: "Pineapple bun",
  cantonese: "菠蘿包",
  correctPronunciation: "boh-LO-baau",
  userAttempt: "boh-lo-BAU",
  whatWentWrong: "The second syllable 'lo' (蘿) needs a slight rise — like the end of a question in English. \"boh-LO?\"\n\nThe last syllable 'baau' (包) should be flat and short. You were hitting it like an English 'bao' which sounds too open.",
  thinkOfItLike: "Say \"below\" — now drop the 'w' and make the 'o' rise slightly. That's the middle syllable nailed."
};
