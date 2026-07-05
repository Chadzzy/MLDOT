/**
 * Copied from siklo/src/data/mockTranslations.js (MOCK_TALK_EXCHANGES only —
 * the Talk single-device mock flow does not use the room/contact-based
 * conversation mocks). Cycled by index in SplitScreen, same as the prototype.
 */
export interface TalkExchangeSide {
  english: string;
  cantonese: string;
}

export interface TalkExchange {
  you: TalkExchangeSide;
  partner: TalkExchangeSide;
}

export const MOCK_TALK_EXCHANGES: TalkExchange[] = [
  {
    you: {
      english: 'Can you come at 3pm instead? I have a meeting at 2.',
      cantonese: '你可唔可以改做下午三點？我兩點有個會議。',
    },
    partner: {
      english: "No problem, 3pm works. I'll bring my colleague.",
      cantonese: '冇問題，三點得。我會帶埋我同事嚟。',
    },
  },
  {
    you: {
      english: 'Will you need to turn off the water for the whole building?',
      cantonese: '你哋需唔需要成棟大廈停水？',
    },
    partner: {
      english: "Just your floor, maybe one hour. I'll let you know before.",
      cantonese: '淨係你嗰層，大概一個鐘。我會事先通知你。',
    },
  },
];
