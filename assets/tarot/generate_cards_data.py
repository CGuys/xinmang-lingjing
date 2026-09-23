import json

with open("assets/tarot/manifest.json", "r", encoding="utf-8") as f:
    manifest = json.load(f)

major_cn = [
    "愚者", "魔术师", "女祭司", "女皇", "皇帝", 
    "教皇", "恋人", "战车", "力量", "隐士", 
    "命运之轮", "正义", "倒吊人", "死神", "节制", 
    "恶魔", "高塔", "星星", "月亮", "太阳", 
    "审判", "世界"
]

major_elements = [
    "INFINITE POTENTIAL", "MANIFESTATION", "INTUITION & DEPTH", "ABUNDANCE & NURTURE", "STABILITY & ORDER",
    "SPIRITUAL WISDOM", "HARMONY & CHOICE", "WILLPOWER & COURAGE", "INNER RESILIENCE", "SOLITUDE & ILLUMINATION",
    "CHANGE & DESTINY", "TRUTH & BALANCE", "NEW PERSPECTIVE", "TRANSFORMATION & ENDING", "BALANCE & HEALING",
    "SHADOW & LIBERATION", "AWAKENING & BREAKTHROUGH", "HOPE & HEALING", "SUBCONSCIOUS & ILLUSION", "VITALITY & CLARITY",
    "REBIRTH & CALLING", "COMPLETION & WHOLENESS"
]

major_tags = [
    ["破局启程", "纯粹好奇", "归零重启"],
    ["资源整合", "创造力量", "知行合一"],
    ["直觉内观", "静定自守", "智慧觉察"],
    ["丰盛孕育", "生命滋养", "无私接纳"],
    ["秩序确立", "边界掌控", "理性决断"],
    ["精神启引", "价值坚守", "传承智慧"],
    ["同频共振", "灵魂共鸣", "真诚抉择"],
    ["意志破局", "驾驭矛盾", "勇毅前行"],
    ["以柔克刚", "接纳本能", "内在韧性"],
    ["静默深潜", "明灯自照", "内求洞见"],
    ["顺势而为", "周期回转", "拥抱变化"],
    ["因果清晰", "客观明辨", "内在诚实"],
    ["视角转换", "主动臣服", "顿悟解脱"],
    ["旧序消逝", "新生孕育", "彻底蜕变"],
    ["中道融合", "炼金调和", "情绪流动"],
    ["直视执念", "破除枷锁", "阴影整合"],
    ["幻象粉碎", "剧烈重塑", "觉醒契机"],
    ["希望重塑", "潜能觉醒", "自我疗愈"],
    ["潜意识潮汐", "直视迷茫", "接纳未知"],
    ["生机焕发", "纯真喜悦", "澄明澄澈"],
    ["灵性召唤", "重塑自我", "终极释怀"],
    ["圆满达成", "万物一体", "崭新飞跃"]
]

major_quotes = [
    "迈出第一步的勇气，本身就是最深奥的智慧。",
    "如其在上，如其在下。你已备齐所需的每一块拼图。",
    "在喧嚣静止之处，万物的真相自会浮出水面。",
    "允许爱自然流淌，生命自会在丰盛中生长。",
    "真正的力量，源于内心的秩序与自律。",
    "倾听内在导师的呼唤，真理无需向外苦寻。",
    "每一次真诚的选择，都是灵魂对自我的确认。",
    "凝聚意志的力量，冲破所有犹豫的藩篱。",
    "温柔拥有穿透坚石的伟力，接纳自身的脆弱。",
    "在孤独中点燃明灯，照亮不被世俗定义的道路。",
    "万事万物皆有周期，顺应流动方能把握契机。",
    "诚实面对内心，所有的答案早已客观分明。",
    "换一个视角看待困境，牺牲往往是蜕变的起点。",
    "结束并非终结，而是为更盛大的新生腾出空间。",
    "在极端的拉扯中寻找平衡，耐心是最好的淬炼。",
    "看清欲望的锁链，唯有觉察能带来真正的自由。",
    "当虚妄的高楼崩塌，坚实的真理才得以显现。",
    "夜色越是幽暗，星光愈是清冽。保持内在确信。",
    "穿透内心的迷雾，接纳潜意识深处的情绪潮汐。",
    "用赤子之心拥抱生活，阳光会驱散一切阴霾。",
    "听从内心的审判与召唤，放下过往重获新生。",
    "行过千山万水，终在自我圆满中开启新的轮回。"
]

major_insights = [
    "愚者象征着一切可能性的原点。你感知到的焦虑，实则是潜意识对跳出舒适区的兴奋反应。过多的风险权衡正变成沉重的行囊，让你在起跑线前迟疑不决。",
    "所有解决当下难题的工具已经摆在你的桌面上。魔术师提示你，你所欠缺的不是能力与储备，而是将现有零散资源整合并付诸行动的决断力。",
    "外界的声音过于嘈杂，遮蔽了你敏锐的本能洞察。女祭司提示你：此刻需要的不是向外抓取建议，而是退回内心的静谧之所。",
    "女皇象征滋养与丰盛的母性力量。无需过度紧绷与自我苛责，善待自己的感受，给予种子足够的发芽时间。",
    "皇帝代表建立边界与内在权威。审视你当前生活中缺乏秩序的角落，果断做出界定，建立清晰明确的个人规则。",
    "教皇代表传统智慧与精神指引。向有经验的长辈或书籍求教，同时检验那些教条是否真正符合你内心的真实信念。",
    "恋人牌揭示了价值观的选择与深度链接。在面对分歧或十字路口时，唯有遵循灵魂的真实渴求，才能做出不悔的抉择。",
    "战车象征聚焦意志与克服冲突。将内在互相拉扯的动力调整至同一方向，坚定步伐，直面眼前的挑战。",
    "力量牌提示我们：驯服猛兽靠的不是暴力的压制，而是无条件的接纳与温柔的慈悲。接纳自己的软弱，便是强大的开端。",
    "隐士提醒你适时抽离外界的喧闹。独处不是孤立，而是向内在智慧深潜，在属于你自己的节奏中寻得安宁与澄明。",
    "命运之轮提示我们生命总在周期性起伏中前行。顺应季节的更迭，处于低谷时蓄力，处于顺境时谦卑，一切皆在流动中。",
    "正义牌呼唤客观与内省。放下情绪化的辩解，诚实面对当前的因果因由，理性平衡利弊，做出公正的取舍。",
    "倒吊人代表视角的颠覆与主动的暂停。当常规努力陷入僵局时，不妨换一个角度审视现状，在臣服与沉思中等待顿悟。",
    "死神并不意味着终结，而是旧有模式的必然脱落。勇敢向那些已经不再滋养你的习惯、关系或执念告别，迎接蜕变。",
    "节制牌传达着调和与中庸的艺术。在激进与停滞之间寻找呼吸的节奏，通过微调生活习惯，重建身心的动态平衡。",
    "恶魔牌揭露了潜意识中的恐惧与依赖。觉察那些看似不可或缺的执念，一旦你认清束缚你的锁链并非无懈可击，自由便随之而来。",
    "高塔象征顿悟与突变。当虚假的安稳被打破，虽然伴随着震荡，但这正是摆脱僵化认知、重建真实自我的最强推力。",
    "星星牌表明当前的困惑并非绝境，而是精神秩序的更新期。过往沉重的包袱正被渐渐放下，保持像静谧夜空中恒星般的自我光芒。",
    "月亮牌揭示了潜意识深层的潮汐与未明的情绪。不要急于寻找确定性的逻辑，允许迷雾存在，倾听梦境与直觉的低语。",
    "太阳牌带来毫无保留的生机与热情。驱散心头的阴霾，用赤子般的清澈拥抱生活，将你的温暖与喜悦分享给周围的人。",
    "审判牌宣告自我重生的时刻。放下过去对自己的苛责与懊悔，倾听内心最深切的呼唤，勇敢走出崭新的人生轨迹。",
    "世界牌代表一个重要生命阶段的圆满收官。整合所有的经验与经历，在自我完整与和谐中，踏入下一段更高维度的旅程。"
]

suit_meta = {
    "wands": {"suitCn": "权杖", "element": "PASSION & ACTION", "theme": "行动·意志·创造力"},
    "cups": {"suitCn": "圣杯", "element": "EMOTION & WATER", "theme": "情感·直觉·人际连接"},
    "swords": {"suitCn": "宝剑", "element": "THOUGHT & AIR", "theme": "理性·沟通·真相洞察"},
    "pentacles": {"suitCn": "星币", "element": "REALITY & EARTH", "theme": "物质·实践·稳健落地"}
}

cards = manifest["cards"]
enriched = []

for idx, c in enumerate(cards):
    item = dict(c)
    card_rel = c["card"]
    large_rel = c["large"]
    item["image"] = "assets/tarot/" + card_rel
    item["imageLarge"] = "assets/tarot/" + large_rel
    
    if idx < 22:
        item["nameCn"] = major_cn[idx]
        item["nameEn"] = c["name"]
        item["element"] = major_elements[idx]
        item["tags"] = major_tags[idx]
        item["quote"] = major_quotes[idx]
        item["categoryName"] = "大阿卡纳"
        item["insight"] = major_insights[idx]
        item["challenge"] = "在外界评价与内在感知之间寻求平衡，避免过度自我防卫。"
        item["guidance"] = "今日留出 15-20 分钟静默时间，在笔记本上梳理当下最核心的 1 个内心关切。"
        item["affirmation"] = "“" + major_quotes[idx] + "”"
    else:
        cat = c["category"]
        meta = suit_meta.get(cat, {"suitCn": "小牌", "element": "ELEMENTAL", "theme": "能量实践"})
        suit_name = meta["suitCn"]
        item["nameEn"] = c["name"]
        item["categoryName"] = suit_name
        item["element"] = meta["element"]
        rank_name = c["name"].split(" of ")[0]
        item["tags"] = [suit_name, rank_name + "阶位", meta["theme"].split("·")[0]]
        item["quote"] = "感知" + suit_name + "蕴含的" + meta["theme"] + "力量，在具体的行动中找寻内心节奏。"
        item["insight"] = str(item["nameCn"]) + "（" + c["name"] + "）提醒你关注生活中的" + meta["theme"] + "维度。将感知转化为清晰的行动或梳理，踏实走好当下的每一步。"
        item["challenge"] = "避免在" + suit_name + "能量中陷入极端，注意与现实生活的平衡。"
        item["guidance"] = "今天尝试在" + meta["theme"].split("·")[0] + "方面做一个具体的微小调整，感受内在状态的微妙变化。"
        item["affirmation"] = "“我与当下的能量流动全然同在，安住于每一步的成长之中。”"
    
    item["orientation"] = "正位"
    enriched.append(item)

out_deck = {
    "deck": manifest.get("deck", "ishtar-insights"),
    "deckName": manifest.get("deckName", "Ishtar Insights"),
    "cardCount": len(enriched),
    "backImage": "assets/tarot/back.jpg",
    "backImageLarge": "assets/tarot/large/back.jpg",
    "cards": enriched
}

js_content = "window.TAROT_DECK = " + json.dumps(out_deck, ensure_ascii=False, indent=2) + ";\n"

with open("assets/tarot/cards-data.js", "w", encoding="utf-8") as f:
    f.write(js_content)

print("Generated cards-data.js successfully with", len(enriched), "cards.")
