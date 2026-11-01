import { DailyEntry, PersonalOS } from '../../src/types';

export const INITIAL_PERSONAL_OS: PersonalOS = {
  ifThenStrategies: [
    {
      id: 'strat-1',
      ifText: '遇到預期外的挫折或被指責',
      thenText: '先深呼吸三次，區分「事實」與「情緒」，對自己說「這是對方的課題」',
      active: true,
      category: 'emotion',
      sourceDate: '2026-10-26'
    },
    {
      id: 'strat-2',
      ifText: '晚上 11 點到了',
      thenText: '把手機拿到客廳充電，換看紙本書或拉筋放鬆',
      active: true,
      category: 'health',
      sourceDate: '2026-10-27'
    },
    {
      id: 'strat-3',
      ifText: '開會時被打斷或老闆急躁催促',
      thenText: '先拿起水杯喝一口溫水，延遲 2 秒再回應',
      active: true,
      category: 'work',
      sourceDate: '2026-10-28'
    },
    {
      id: 'strat-4',
      ifText: '下午 3 點感覺腦袋打結、想擺爛',
      thenText: '站起來走到窗邊看遠方 2 分鐘，洗一把臉',
      active: false,
      category: 'work',
      sourceDate: '2026-10-25'
    }
  ],
  habitQuestions: [
    {
      id: 'habit-1',
      text: '我今天有在 12 點前放下手機睡覺嗎？',
      active: true
    },
    {
      id: 'habit-2',
      text: '今天有喝滿 2000cc 的水嗎？',
      active: true
    },
    {
      id: 'habit-3',
      text: '今天有出門曬太陽散步 15 分鐘嗎？',
      active: false
    }
  ],
  emergencyRecipes: [
    {
      id: 'recipe-1',
      title: '睡滿 7.5 小時',
      description: '所有情緒穩定與專注力的最底層物理基礎。睡眠不足時絕不批判自己的智商。',
      tag: '#睡眠品質'
    },
    {
      id: 'recipe-2',
      title: '熱美式 + 20 分鐘公園散步',
      description: '工作卡關時最快重置大腦的方式。曬太陽與步伐節奏會刺激血清素分泌。',
      tag: '#身心充電'
    },
    {
      id: 'recipe-3',
      title: '洗完澡後的無目的閱讀',
      description: '看一本與工作完全無關的小說或科普書，把大腦從產出模式切換到吸收模式。',
      tag: '#無用之美'
    },
    {
      id: 'recipe-4',
      title: '獨自吃一頓熱騰騰的日式拉麵',
      description: '專注在湯頭與麵條的熱度上，啟動五感，切斷一整天的虛擬資訊過載。',
      tag: '#美食自療'
    }
  ],
  avoidanceGuides: [
    {
      id: 'avoid-1',
      title: '絕對不要在肚子餓或血糖低時做決定',
      lesson: '飢餓會讓大腦邊緣系統接管，極易發脾氣或簽署草率決定。先吃顆茶葉蛋再說。',
      tag: '#生理防禦'
    },
    {
      id: 'avoid-2',
      title: '絕對不要在晚上 10 點後討論嚴肅人際關係',
      lesson: '夜間的前額葉皮質疲倦，自我反思容易變成災難化聯想。重要對話一律推遲至隔天白天。',
      tag: '#關係界線'
    },
    {
      id: 'avoid-3',
      title: '不要把「別人的焦慮」當成「自己的過錯」',
      lesson: '主管的急躁多半源於他自身的壓力，不是因為我不夠好。課題分離，專注把手邊事情理清。',
      tag: '#課題分離'
    }
  ]
};

export const INITIAL_ENTRIES: DailyEntry[] = [
  {
    id: 'entry-2026-10-01',
    date: '2026-10-01',
    state: 'good',
    goodWhere: '月初做完了季度規劃，下班準時離開辦公室，去書店翻了兩本心儀已久的新書。',
    goodKeep: '先排大石頭（核心事項），瑣碎小事集中在下午 4 點後處理。',
    tags: ['#高效產出', '#時間管理', '#閱讀'],
    factors: ['[[規劃]]', '[[閱讀]]'],
    createdAt: '2026-10-01T21:00:00Z',
    updatedAt: '2026-10-01T21:00:00Z'
  },
  {
    id: 'entry-2026-10-02',
    date: '2026-10-02',
    state: 'good',
    goodWhere: '早起慢跑 5 公里，早餐煎了雙蛋吐司配黑咖啡，整天精神飽滿。',
    goodKeep: '昨晚 11 點前就寢，睡前做 10 分鐘深層伸展。',
    tags: ['#睡眠品質', '#運動健身', '#活力'],
    factors: ['[[運動]]', '[[咖啡]]', '[[早睡]]'],
    createdAt: '2026-10-02T21:00:00Z',
    updatedAt: '2026-10-02T21:00:00Z'
  },
  {
    id: 'entry-2026-10-03',
    date: '2026-10-03',
    state: 'normal',
    normalMoment: '週末午後在家手沖了一杯曼特寧咖啡，陽光透過窗簾灑在地毯上很溫暖。',
    normalAmplify: '放了一張爵士鋼琴歌單，坐在地毯上發呆了 20 分鐘。',
    tags: ['#微小幸福', '#放鬆儀式'],
    factors: ['[[咖啡]]', '[[音樂]]'],
    createdAt: '2026-10-03T21:00:00Z',
    updatedAt: '2026-10-03T21:00:00Z'
  },
  {
    id: 'entry-2026-10-04',
    date: '2026-10-04',
    state: 'good',
    goodWhere: '和家人一起動手包水餃，餐桌上笑聲不斷，吃得飽足且心裡踏實。',
    goodKeep: '全家人吃飯時都不滑手機，專注於眼前的食物與談話。',
    tags: ['#人際滋養', '#家庭生活', '#正念飲食'],
    factors: ['[[家人]]', '[[美食撫慰]]'],
    createdAt: '2026-10-04T21:00:00Z',
    updatedAt: '2026-10-04T21:00:00Z'
  },
  {
    id: 'entry-2026-10-05',
    date: '2026-10-05',
    state: 'bad',
    badFact: '週一開工信箱塞滿了 40 封急件，臨時被拉進兩個無效跨部門會議。',
    badEmotion: '感到焦慮煩躁，下班後肩膀異常緊繃，對家人講話有點失去耐心。',
    badReason: '沒有在早上先設定防禦界線，隨波逐流被別人的急事牽著走。',
    badImprove: 'If 明天週二上班， Then 開工前 45 分鐘先關閉信箱通知，專心做最重要的第一件事。',
    tags: ['#職場溝通', '#邊界感', '#壓力管理'],
    factors: ['[[會議]]', '[[焦慮]]'],
    createdAt: '2026-10-05T21:00:00Z',
    updatedAt: '2026-10-05T21:00:00Z'
  },
  {
    id: 'entry-2026-10-06',
    date: '2026-10-06',
    state: 'normal',
    normalMoment: '中午獨自去吃熱湯麵，走路途中看到行道樹上幾片微黃的葉子隨風飄落。',
    normalAmplify: '放慢步伐，深吸了一口秋天的涼空氣，感覺焦慮消散了一大半。',
    tags: ['#微小幸福', '#散步療癒'],
    factors: ['[[散步]]', '[[自然]]'],
    createdAt: '2026-10-06T21:00:00Z',
    updatedAt: '2026-10-06T21:00:00Z'
  },
  {
    id: 'entry-2026-10-07',
    date: '2026-10-07',
    state: 'good',
    goodWhere: '按照昨天的改善方案，早上專注吃掉大青蛙，下午順利交出第一版成果！',
    goodKeep: '將手機收進抽屜，開啟蕃茄鐘 25 分鐘單點突破。',
    tags: ['#高效產出', '#專注力'],
    factors: ['[[蕃茄鐘]]', '[[專案進度]]'],
    createdAt: '2026-10-07T21:00:00Z',
    updatedAt: '2026-10-07T21:00:00Z'
  },
  {
    id: 'entry-2026-10-08',
    date: '2026-10-08',
    state: 'normal',
    normalMoment: '下午茶時間同事請吃了一塊剛出爐的可麗露，外脆內軟剛剛好。',
    normalAmplify: '真心跟同事說了謝謝並交流了甜點店清單，辦公室氛圍很愉快。',
    tags: ['#美食撫慰', '#微小幸福'],
    factors: ['[[同事]]', '[[午茶]]'],
    createdAt: '2026-10-08T21:00:00Z',
    updatedAt: '2026-10-08T21:00:00Z'
  },
  {
    id: 'entry-2026-10-09',
    date: '2026-10-09',
    state: 'good',
    goodWhere: '雙十連假前把所有專案待辦清空，下班去健身房運動了 45 分鐘。',
    goodKeep: '每週五下班前花 15 分鐘把桌面與電腦桌面清理乾淨。',
    tags: ['#秩序感', '#運動健身'],
    factors: ['[[運動]]', '[[整理]]'],
    createdAt: '2026-10-09T21:00:00Z',
    updatedAt: '2026-10-09T21:00:00Z'
  },
  {
    id: 'entry-2026-10-10',
    date: '2026-10-10',
    state: 'good',
    goodWhere: '去郊外步道爬山，遠離城市噪音，在大自然中吸收芬多精，心靈被徹底洗滌。',
    goodKeep: '走進森林時把手機設為飛航模式，讓身心真正斷網休眠。',
    tags: ['#自然療癒', '#數位斷捨離'],
    factors: ['[[散步]]', '[[自然]]'],
    createdAt: '2026-10-10T21:00:00Z',
    updatedAt: '2026-10-10T21:00:00Z'
  },
  {
    id: 'entry-2026-10-11',
    date: '2026-10-11',
    state: 'normal',
    normalMoment: '雨天在家整理衣櫃，把換季衣物摺得整整齊齊，屋裡飄著乾燥花香。',
    normalAmplify: '泡了一杯洋甘菊熱茶，坐在沙發上看了一部溫暖的紀錄片。',
    tags: ['#秩序感', '#平靜'],
    factors: ['[[整理]]', '[[喝茶]]'],
    createdAt: '2026-10-11T21:00:00Z',
    updatedAt: '2026-10-11T21:00:00Z'
  },
  {
    id: 'entry-2026-10-12',
    date: '2026-10-12',
    state: 'bad',
    badFact: '連假過後有點收假症候群，天氣降溫喉嚨微痛，工作專注度大減。',
    badEmotion: '對自己進度落後產生自責感，覺得自己意志力薄弱。',
    badReason: '將生理上的免疫力下降誤判為「能力問題」，忽視了身體的警訊。',
    badImprove: 'If 身體發出警訊， Then 立即啟動急救配方：早睡 8 小時 + 補充溫水維他命。',
    tags: ['#生理防禦', '#自我接納'],
    factors: ['[[睡眠品質]]', '[[生病]]'],
    createdAt: '2026-10-12T21:00:00Z',
    updatedAt: '2026-10-12T21:00:00Z'
  },
  {
    id: 'entry-2026-10-13',
    date: '2026-10-13',
    state: 'good',
    goodWhere: '昨晚乖乖 10 點就寢，今天喉嚨不痛了，整個人像重新充好電的電池。',
    goodKeep: '永遠把睡眠當作底層第一順位，不帶罪惡感地休養。',
    tags: ['#睡眠品質', '#自我關懷'],
    factors: ['[[早睡]]', '[[急救箱]]'],
    createdAt: '2026-10-13T21:00:00Z',
    updatedAt: '2026-10-13T21:00:00Z'
  },
  {
    id: 'entry-2026-10-14',
    date: '2026-10-14',
    state: 'normal',
    normalMoment: '搭捷運時剛好遇到有空位，安靜聽完了一集講心理學的 Podcast。',
    normalAmplify: '在手機備忘錄隨手記下一句啟發深遠的金句。',
    tags: ['#微小幸福', '#持續學習'],
    factors: ['[[通勤]]', '[[Podcast]]'],
    createdAt: '2026-10-14T21:00:00Z',
    updatedAt: '2026-10-14T21:00:00Z'
  },
  {
    id: 'entry-2026-10-15',
    date: '2026-10-15',
    state: 'normal',
    normalMoment: '晚飯後出門去便利商店拿包裹，夜風吹在臉上很涼爽很愜意。',
    normalAmplify: '刻意繞遠路多走了 10 分鐘，聽街角麵包店傳來的音樂。',
    tags: ['#散步療癒', '#平凡日常'],
    factors: ['[[散步]]'],
    createdAt: '2026-10-15T21:00:00Z',
    updatedAt: '2026-10-15T21:00:00Z'
  },
  {
    id: 'entry-2026-10-16',
    date: '2026-10-16',
    state: 'good',
    goodWhere: '順利結案本週最棘手的一份分析報告，主動向上級匯報獲得滿意反饋。',
    goodKeep: '報告前先花了 5 分鐘用便利貼梳理架構，思考清晰度翻倍。',
    tags: ['#高效產出', '#職場溝通'],
    factors: ['[[主管]]', '[[專案進度]]'],
    createdAt: '2026-10-16T21:00:00Z',
    updatedAt: '2026-10-16T21:00:00Z'
  },
  {
    id: 'entry-2026-10-17',
    date: '2026-10-17',
    state: 'good',
    goodWhere: '週六睡到自然醒，中午自己煮了羅宋湯，配香烤法國麵包，吃得很滿足。',
    goodKeep: '假日保留無日程時光（No Agenda Time），讓大腦慢下來。',
    tags: ['#美食撫慰', '#無用之美'],
    factors: ['[[煮飯]]', '[[放鬆]]'],
    createdAt: '2026-10-17T21:00:00Z',
    updatedAt: '2026-10-17T21:00:00Z'
  },
  {
    id: 'entry-2026-10-18',
    date: '2026-10-18',
    state: 'normal',
    normalMoment: '下午坐公車去河濱公園看人放風箏，白雲在藍天上慢慢飄動。',
    normalAmplify: '拍了兩張天空的照片當作手機桌布，提醒自己隨時有天空的遼闊。',
    tags: ['#正念當下', '#自然'],
    factors: ['[[散步]]', '[[自然]]'],
    createdAt: '2026-10-18T21:00:00Z',
    updatedAt: '2026-10-18T21:00:00Z'
  },
  {
    id: 'entry-2026-10-19',
    date: '2026-10-19',
    state: 'bad',
    badFact: '週一早上忘記設鬧鐘遲到了 15 分鐘，匆忙趕出門又忘了帶錢包。',
    badEmotion: '整天心情焦躁，不斷在心裡罵自己粗心大意。',
    badReason: '前一天晚上看劇看到半夜 1 點半，大腦過載且前額葉缺氧。',
    badImprove: 'If 晚上 11 點到了， Then 堅決把所有螢幕關閉，躺在床上聽助眠白噪音。',
    tags: ['#睡眠品質', '#自我批判煞車'],
    factors: ['[[熬夜]]', '[[手機離床]]'],
    createdAt: '2026-10-19T21:00:00Z',
    updatedAt: '2026-10-19T21:00:00Z'
  },
  {
    id: 'entry-2026-10-20',
    date: '2026-10-20',
    state: 'normal',
    normalMoment: '下班回家路上發現路邊有一隻很親人的橘貓，摸了牠幾下牠呼嚕呼嚕叫。',
    normalAmplify: '蹲在那裡陪牠玩了 5 分鐘，一整天的疲勞完全被融化了。',
    tags: ['#微小幸福', '#療癒'],
    factors: ['[[散步]]', '[[小動物]]'],
    createdAt: '2026-10-20T21:00:00Z',
    updatedAt: '2026-10-20T21:00:00Z'
  },
  {
    id: 'entry-2026-10-21',
    date: '2026-10-21',
    state: 'good',
    goodWhere: '在跨部門會議上勇敢表達了自己的專業觀點，成功替小組爭取到充裕時間。',
    goodKeep: '說話前先深呼吸兩秒，用數據代替形容詞。',
    tags: ['#職場溝通', '#自信建立'],
    factors: ['[[會議]]', '[[界線建立]]'],
    createdAt: '2026-10-21T21:00:00Z',
    updatedAt: '2026-10-21T21:00:00Z'
  },
  {
    id: 'entry-2026-10-22',
    date: '2026-10-22',
    state: 'normal',
    normalMoment: '工作按部就班地完成了 80%，沒有突發意外，平平穩穩地結束一天。',
    normalAmplify: '泡腳 15 分鐘，閱讀了 10 頁哲學散文。',
    tags: ['#日常平靜', '#秩序感'],
    factors: ['[[閱讀]]', '[[早睡]]'],
    createdAt: '2026-10-22T21:00:00Z',
    updatedAt: '2026-10-22T21:00:00Z'
  },
  {
    id: 'entry-2026-10-23',
    date: '2026-10-23',
    state: 'good',
    goodWhere: '完成了本週的核心任務，晚上和老朋友吃日式料理喝熱麥茶，深度長談。',
    goodKeep: '與能夠互相滋養而不是互相抱怨的朋友保持深度連結。',
    tags: ['#人際滋養', '#深刻對話'],
    factors: ['[[朋友]]', '[[美食撫慰]]'],
    createdAt: '2026-10-23T21:00:00Z',
    updatedAt: '2026-10-23T21:00:00Z'
  },
  {
    id: 'entry-2026-10-24',
    date: '2026-10-24',
    state: 'good',
    goodWhere: '週六下午去美術館看展覽，靜靜欣賞畫作，感受色彩與創作者的心境。',
    goodKeep: '每個月安排一次無功利目的的藝術文化體驗。',
    tags: ['#無用之美', '#靈感充電'],
    factors: ['[[藝術]]', '[[散步]]'],
    createdAt: '2026-10-24T21:00:00Z',
    updatedAt: '2026-10-24T21:00:00Z'
  },
  {
    id: 'entry-2026-10-25',
    date: '2026-10-25',
    state: 'good',
    goodWhere: '早起沒有看手機，專心做完了下週的提案大綱，下午還去公園慢跑了 30 分鐘。',
    goodKeep: '前一天晚上把手機放在書房，早上自然醒來精神非常好。保持「晨間前 30 分鐘無螢幕」。',
    tags: ['#高效產出', '#睡眠品質', '#早起'],
    factors: ['[[晨間儀式]]', '[[運動]]'],
    aiCoached: true,
    aiAdvice: {
      strategies: [
        'If 晚上準備就寢， Then 提前把手機移到書房充電。',
        'If 早上醒來， Then 先喝一杯溫水再去玄關穿鞋。'
      ],
      psychologicalInsight: '掌控晨間就是掌控一天的主動權。微小的物理隔離徹底瓦解了自動化成癮慣性。',
      suggestedTag: '[[晨間儀式]] #掌控感',
      encouragement: '這就是你的黃金生活配方，請放心地繼續複製！'
    },
    createdAt: '2026-10-25T21:30:00Z',
    updatedAt: '2026-10-25T21:30:00Z'
  },
  {
    id: 'entry-2026-10-26',
    date: '2026-10-26',
    state: 'bad',
    badFact: '下午專案進度會上，客戶臨時更換需求，主管在眾人面前語氣嚴厲地質疑了進度。',
    badEmotion: '感到極度委屈、沮喪與被羞辱，回家後什麼都不想做，狂吃甜點並滑手機內耗。',
    badReason: '沒有在第一時間區分「客戶臨時改動」是客觀事實，把主管的焦慮全當成對自己能力的否定。',
    badImprove: 'If 明天主管再詢問， Then 拿出具體的時程調整對照表，平靜陳述選項，不把對方的催促當成人身攻擊。',
    tags: ['#職場溝通', '#情緒煞車', '#壓力管理'],
    factors: ['[[客戶]]', '[[主管]]', '[[課題分離]]'],
    aiCoached: true,
    aiAdvice: {
      strategies: [
        'If 感覺被否定時， Then 默念三遍「他在焦慮進度，不是在評判我的人品」。',
        'If 明天開會前， Then 先花 5 分鐘寫下一張條列式清單，把事實與推論分開。'
      ],
      psychologicalInsight: '阿德勒課題分離：主管的語氣是他自己的修養課題；我的課題是如何專業、具體地交付現有資源下的最佳進度。',
      suggestedTag: '[[課題分離]] #認知重塑',
      encouragement: '今天的挫折是一筆非常寶貴的系統測試數據，它提醒你該建立職場防護罩了。'
    },
    createdAt: '2026-10-26T22:15:00Z',
    updatedAt: '2026-10-26T22:15:00Z'
  },
  {
    id: 'entry-2026-10-27',
    date: '2026-10-27',
    state: 'normal',
    normalMoment: '下班等公車時，微風吹過來很舒服，抬頭看見了非常漂亮的橘粉色夕陽。',
    normalAmplify: '刻意把耳機音樂暫停了 3 分鐘，什麼都不做，只深深吸了一口涼爽的空氣。',
    tags: ['#微小幸福', '#正念當下'],
    factors: ['[[散步]]', '[[自然]]'],
    aiCoached: false,
    createdAt: '2026-10-27T21:00:00Z',
    updatedAt: '2026-10-27T21:00:00Z'
  },
  {
    id: 'entry-2026-10-28',
    date: '2026-10-28',
    state: 'good',
    goodWhere: '把昨天卡關的報表理順了，並且勇敢地向同事拒絕了一件不屬於我職責的雜事。',
    goodKeep: '溫和而堅定地說「我目前手邊在處理最重要的核心項目，這次可能無法支援」。',
    tags: ['#邊界感', '#拒絕力', '#專注力'],
    factors: ['[[說不]]', '[[專案進度]]'],
    aiCoached: true,
    aiAdvice: {
      strategies: [
        'If 他人提出突發請求， Then 先回覆「我查一下行事曆，半小時後回覆你」，為自己爭取思考緩衝。'
      ],
      psychologicalInsight: '學會說不，是為真正重要的事情騰出空間。界線不是冷漠，而是成熟的自我照顧。',
      suggestedTag: '[[界線建立]]',
      encouragement: '替你感到驕傲！界線一旦立起來，日子就會越來越純粹。'
    },
    createdAt: '2026-10-28T21:40:00Z',
    updatedAt: '2026-10-28T21:40:00Z'
  },
  {
    id: 'entry-2026-10-29',
    date: '2026-10-29',
    state: 'normal',
    normalMoment: '午餐點了一碗一直想嘗試的手工餛飩湯，意外地非常鮮美，店家人也很有禮貌。',
    normalAmplify: '把這家店存到 Google 地圖的「私藏撫慰小館」清單，當作未來情緒低落時的補血站。',
    tags: ['#美食撫慰', '#平凡日常'],
    factors: ['[[午餐]]', '[[急救箱]]'],
    aiCoached: false,
    createdAt: '2026-10-29T21:10:00Z',
    updatedAt: '2026-10-29T21:10:00Z'
  },
  {
    id: 'entry-2026-10-30',
    date: '2026-10-30',
    state: 'good',
    goodWhere: '徹底執行了 If-Then 行為煞車，面對突發狀況沒有內耗，晚上復盤時內心非常安定。',
    goodKeep: '每天晚上花 5 分鐘歸零自己，將經驗及時沉澱進個人操作手冊。',
    tags: ['#個人系統', '#安定感', '#復盤'],
    factors: ['[[個人操作手冊]]', '[[早睡]]'],
    aiCoached: true,
    aiAdvice: {
      strategies: [
        'If 每天睡前洗漱完畢， Then 打開個人操作手冊確認明天的 If-Then 護城河。'
      ],
      psychologicalInsight: '閉環系統建立完成後，任何波動都不再是情緒災難，而只是優化人生的寶貴數據。',
      suggestedTag: '[[閉環系統]] #安頓心靈',
      encouragement: '你已經建立起專屬於自己的生活操作系統，把日子過好不再是一句口號，而是每天確鑿發生的現實！'
    },
    createdAt: '2026-10-30T21:30:00Z',
    updatedAt: '2026-10-30T21:30:00Z'
  }
];

