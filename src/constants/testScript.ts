import { AdventureStory } from "../types";

export const TEST_STORY: AdventureStory = {
  title: "小勇士的森林寶藏大冒險 (測試版)",
  category: "RETROFLEX",
  prologue: "陽光穿透濃密的樹蔭，森林深處傳來一陣低沉的震動。小勇士感覺腳下的泥土似乎在低聲訴說著什麼，一種久違的寧靜中透著不安。這不是普通的探險，每一步呼吸都與古老的自然律動交織在一起...",
  ending: "故事圓滿結束了！小勇士成功守護了森林，所有的精靈都為你歡呼呢！",
  achievement: {
    icon: "🎖️",
    title: "森林守護小英雄"
  },
  challenges: [
    {
      id: "test-1",
      word: "種子",
      pinyin: "zhǒng zi",
      instruction: "舌尖向上捲，「像在舌頭下藏了一個休息的小山洞」。",
      hint: "就像把一個秘密小球藏在舌尖下面。",
      storySegment: "小勇士踏入了一片乾涸的土地，森林精靈星寶告訴他，必須播下神奇的「種子」，才能讓森林恢復生機。",
      visualMotif: "🌱🌳✨"
    },
    {
      id: "test-2",
      word: "竹子",
      pinyin: "zhú zi",
      instruction: "翹舌音 zh，舌尖輕輕頂住上齶。",
      hint: "想像舌頭在給上顎做按摩。",
      storySegment: "走著走著，小勇士來到了一片翠綠的「竹子」林。這裡藏著通往下一關的鑰匙。",
      visualMotif: "🎍🐼🎋"
    },
    {
      id: "test-3",
      word: "獅子",
      pinyin: "shī zi",
      instruction: "翹舌 sh，氣流在舌尖和上齶間流出。",
      hint: "發出獅子般的勇敢呼聲，但要溫柔一點點。",
      storySegment: "突然，一隻溫柔的「獅子」擋住了去路。別擔心，它只是守護森林的門衛。",
      visualMotif: "🦁👑🗺️"
    },
    {
      id: "test-4",
      word: "手札",
      pinyin: "shǒu zhá",
      instruction: "連續翹舌，注意氣流的轉換。",
      hint: "像小船在波浪上穩穩滑過。",
      storySegment: "小勇士打開了古老的「手札」，上面記載著開啟森林之心所需的咒語。",
      visualMotif: "📜🖋️🕯️"
    },
    {
      id: "test-5",
      word: "正直",
      pinyin: "zhèng zhí",
      instruction: "舌尖到位，感受聲調的穩定。",
      hint: "保持身板挺直，聲音也要一樣有力。",
      storySegment: "最後，小勇士展現了「正直」的品質，森林之心終於被點亮了！",
      visualMotif: "💎💖🔥"
    }
  ]
};
