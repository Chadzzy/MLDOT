export const MOCK_CONVERSATIONS = {
  1: [
    {
      id: 101,
      cantonese: "喺8樓嗰條水管有問題，需要入去你個單位檢查一下。",
      english: "The pipe on the 8th floor has a problem. We need to come into your unit to check it.",
      time: "10:32 AM",
      reactions: ["✓"],
      duration: "0:12"
    },
    {
      id: 102,
      cantonese: "你聽日下午得唔得閒？大概兩點左右。",
      english: "Are you free tomorrow afternoon? Around 2pm.",
      time: "10:33 AM",
      reactions: ["❓"],
      duration: "0:06"
    },
    {
      id: 103,
      cantonese: "唔緊要，我哋可以改期。你幾時方便？",
      english: "No problem, we can reschedule. When are you available?",
      time: "10:35 AM",
      reactions: ["✓", "❤️"],
      duration: "0:08"
    }
  ],
  2: [
    {
      id: 201,
      cantonese: "喂，我聽日唔得閒，後日先得。你個廁所水龍頭問題，我估計要換零件，大概八百蚊左右，你覺得點？",
      english: "Hey, I'm not available tomorrow, only the day after. For your bathroom tap issue, I think we need to replace parts — around $800 or so. What do you think?",
      time: "3:15 PM",
      reactions: ["✓"],
      duration: "0:14"
    },
    {
      id: 202,
      cantonese: "好，咁我後日朝早十點嚟，記住開門畀我。",
      english: "OK, I'll come the day after tomorrow at 10am. Remember to open the door for me.",
      time: "3:18 PM",
      reactions: [],
      duration: "0:07"
    }
  ],
  3: [
    {
      id: 301,
      cantonese: "你嘅血液報告返嚟喇，整體上都係正常，但係膽固醇高咗少少，我建議你少食油膩嘢，多做運動。下次覆診係三個月後。",
      english: "Your blood test results are back. Everything is generally normal, but your cholesterol is slightly elevated. I'd suggest cutting down on oily food and exercising more. Your next follow-up is in three months.",
      time: "11:00 AM",
      reactions: ["✓"],
      duration: "0:22"
    }
  ],
  4: [
    {
      id: 401,
      cantonese: "今日石斑好靚，平咗好多，四十蚊一斤。你要唔要？",
      english: "The grouper today is really good, much cheaper — $40 per catty. Do you want some?",
      time: "8:45 AM",
      reactions: ["❤️"],
      duration: "0:09"
    },
    {
      id: 402,
      cantonese: "仲有新鮮蝦，啱啱返嚟，好生猛㗎。",
      english: "Also got fresh prawns, just arrived, very lively.",
      time: "8:46 AM",
      reactions: [],
      duration: "0:06"
    }
  ]
};

export const MOCK_NEW_TRANSLATION = {
  contactId: 1,
  cantonese: "唔好意思打擾你，我係管理處嘅陳生。8樓嗰條主水管有少少問題，我哋需要入去你個單位查一查。聽日下午兩點左右得唔得閒？",
  english: "Sorry to disturb you, this is Mr. Chan from building management. There's a small issue with the main water pipe on the 8th floor — we need to come into your unit to take a look. Would you be free tomorrow afternoon around 2pm?",
  context: "Building maintenance request. Polite tone — standard for building management in HK.",
  duration: "0:18"
};

export const MOCK_TALK_EXCHANGES = [
  {
    you: { english: "Can you come at 3pm instead? I have a meeting at 2.", cantonese: "你可唔可以改做下午三點？我兩點有個會議。" },
    partner: { english: "No problem, 3pm works. I'll bring my colleague.", cantonese: "冇問題，三點得。我會帶埋我同事嚟。" }
  },
  {
    you: { english: "Will you need to turn off the water for the whole building?", cantonese: "你哋需唔需要成棟大廈停水？" },
    partner: { english: "Just your floor, maybe one hour. I'll let you know before.", cantonese: "淨係你嗰層，大概一個鐘。我會事先通知你。" }
  }
];
