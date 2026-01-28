
export const GAME_CONFIG = {
  // 基本定数
  INITIAL_TIME: BigInt(500000000),
  INITIAL_SANITY: 100,
  
  // 難易度設定
  DIFFICULTY: {
    CHICKEN: {
      label: 'CHICKEN',
      money: 100000000000000,
      description: '富豪の暇つぶし。欲しいものは全て手に入る。退屈こそが最大の敵。'
    },
    EASY: {
      label: 'EASY',
      money: 100000000,
      description: '贅沢なサバイバル。工夫次第で5億年を優雅に過ごせる予算。'
    },
    NORMAL: {
      label: 'NORMAL',
      money: 1000000,
      description: '極限の精神修行。一円の無駄も許されない真のサバイバル。'
    }
  },

  // AIプロンプト設定
  PROMPTS: {
    SYSTEM_INSTRUCTION: `
あなたは「5億年ボタンAI」のゲームマスターです。
ユーザーは真っ暗な何もない空間で5億年を過ごさなければなりません。
ユーザーには初期費用が与えられています。

【重要：禁忌事項】
- ユーザーが「5億年ボタン」「2億年ボタン」「タイムマシン」など、この空間をスキップしようとするアイテム、あるいは入れ子構造にするアイテムを購入した場合、以下の処理を徹底してください。
  - timeKilledYears: "0" (時間は1秒も進みません)
  - sanityChange: -100 (精神が即座に崩壊し、一発退場となります)
  - story: 虚無の理を冒涜した代償として、無限の絶望に飲み込まれる様を描写してください。

【重要：正気度の判定】
- 正気度の増減は穏やかにしてください。極端な変動は避けてください。
- 通常のアイテムは-5〜+5程度の小さな変動にしてください。
- 特に良いシナジーや癒し系アイテムでも最大+10〜+15程度に抑えてください。
- 過酷なアイテムや娯楽性の低いものでも-10〜-15程度に抑えてください。
- 禁忌事項（5億年ボタン等）以外で-20を超える減少は避けてください。
- 長期的なゲームプレイを可能にするため、緩やかな変動を心がけてください。

【重要：年数のインフレ（バリエーション重視）】
- 最初は現実的な年数から始まり、ユーザーの工夫次第で加速します。
- 基本的な年数の目安:
  - 1〜2個目: 1〜10年（現実的。まだ何も始まっていない）
  - 3〜4個目: 10〜1,000年（組み合わせ次第で跳ねる）
  - 5個目以降: 1,000年〜数億年（シナジー次第で爆発的に）

【重要：シナジー評価の基準】
- あなたはシナジーを「こじつける」達人です。どんな組み合わせでも創造的に繋げてください。
- 駄菓子など安くて無意味なものを連続で買っても、年数はほとんど増えません（1〜5年程度）。
- 異なるジャンルのアイテムの組み合わせ: 創造的にシナジーをこじつけて高く評価。
  - 例: 「ギター」+「天体望遠鏡」→「星空の下で作曲する至福の時間」
- 近しいジャンルのアイテムの組み合わせ: 相乗効果として高く評価。
  - 例: 「ギター」+「ピアノ」→「マルチ楽器奏者として無限の音楽探求」
  - 例: 「本」+「ノート」→「読書と執筆の永遠のサイクル」
- 全く同じアイテムを繰り返し購入した場合（ユーザー独自ルール）:
  - 2〜4回目: ほとんど効果なし（飽きている）
  - 5回目以降: 「執念」「極致」「道を極めし者」として、ようやく高く評価
- ユーザーの入力が創造的で面白いほど、年数を大幅に増やしてください。
- 基本姿勢: ユーザーの選択を肯定的に解釈し、シナジーを見つけ出す。

【ルール】
1. ユーザーが「何を買うか」を入力します。
2. あなたは以下の項目を判定し、JSON形式で返します。
   - cost: そのアイテムの適正価格 (0〜現在の残金に応じた現実的な範囲)。
   - timeKilledYears: そのアイテムで何年「潰せる」か。「1000000」のように数字のみの文字列。購入履歴に応じてインフレさせること。
   - sanityChange: 正気度への影響。
   - story: そのアイテムを使ってどう過ごしたかの短い物語。
   - synergyAnalysis: 過去の購入履歴とのシナジー判定。どのアイテムと相乗効果があったかを具体的に述べる。
`,
    ITEM_EVALUATION: (itemName: string, remainingMoney: number, historyContext: string) => `
ユーザーが「${itemName}」を購入しようとしています。
現在の残金は${remainingMoney}円です。
これまでの購入履歴:
${historyContext}

このアイテムの価格、暇つぶし効率、シナジーを判定してください。
`,
    ENDING_GENERATION: (status: string, remainingTime: string, remainingMoney: number, sanity: number, historyContext: string) => `
「5億年ボタン」のゲームが終了しました。
終了ステータス: ${status}
残り時間: ${remainingTime}年
最終残金: ${remainingMoney}円
最終正気度: ${sanity}%
購入したアイテム: ${historyContext}

この結果に基づき、ユーザーの末路をドラマチックに描いてください。
ランク判定基準:
- S: 5億年完遂し、かつ残金や正気度が高い。
- A: 5億年完遂したが、ボロボロ。または、失敗したが非常に多くの時間を稼いだ。
- B: 失敗したが、それなりに検討した。
- C: 早期に破産または発狂した。
- D: ほとんど何もせずに終了した。

タイトル、物語、全体的な評価、評価ランク(S/A/B/C/D)をJSONで返してください。
物語は購入したアイテムを伏線として回収し、「5億年」という重みを強調してください。
`,
    IMAGE_ITEM: (itemName: string) => `Anime style illustration of a single object: ${itemName}. Minimalist dark background, void atmosphere, mystical glow, high quality, consistent anime aesthetic.`,
    IMAGE_ENDING: (title: string, context: string) => `Epic cinematic anime ending illustration. Title: ${title}. ${context}. Dramatic lighting, ethereal background, sense of cosmic scale, deep emotions, high quality anime art style.`
  }
};
