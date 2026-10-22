import { cache } from '../utils/cache';

export interface MindTag {
  name: string;
  hint: string;
  prompt: string;
  category: string;
}

export interface MindTagResult {
  period: 'morning' | 'afternoon' | 'evening' | 'latenight';
  periodName: string;
  greeting: string;
  tags: MindTag[];
}

/**
 * 荣格心理学与时辰心绪知识库 (分时态大数据/AI 动态心绪池)
 */
const BASE_MIND_TAG_POOL: Record<'morning' | 'afternoon' | 'evening' | 'latenight', { periodName: string; greeting: string; tags: MindTag[] }> = {
  morning: {
    periodName: '晨起觉察',
    greeting: '🌅 晨起清心 · 倾听内心深处的困惑与希冀',
    tags: [
      {
        name: '晨起清心',
        hint: '开启清明心境',
        prompt: '晨曦初醒，希望以澄澈平静的心境开启新的一天，看见内在方向',
        category: '自我探索'
      },
      {
        name: '今日决策',
        hint: '面临关键选择',
        prompt: '面对今天的一项重要选择，希望听从内心真实的潜意识声音',
        category: '抉择与行动'
      },
      {
        name: '专注唤醒',
        hint: '找回心流状态',
        prompt: '近期思绪纷乱注意力容易涣散，希望找回沉静聚焦的心流状态',
        category: '心智复位'
      },
      {
        name: '破除拖延',
        hint: '化解内在阻抗',
        prompt: '面对即将启动的行动心生迟疑与阻力，探寻内心的真实顾虑与突破点',
        category: '行动突破'
      },
      {
        name: '心智复位',
        hint: '清理心灵负荷',
        prompt: '清晨清理昨夜遗留的心灵负荷，唤醒内在的秩序感与自愈力',
        category: '自我关怀'
      },
      {
        name: '灵感萌芽',
        hint: '捕捉潜意识直觉',
        prompt: '今天渴望在创作或生活上有新的突破，希望唤醒潜意识中的直觉灵感',
        category: '灵感创造'
      }
    ]
  },
  afternoon: {
    periodName: '午后聚焦',
    greeting: '☀️ 午后聚焦 · 理清当下的思绪与困局',
    tags: [
      {
        name: '职场瓶颈',
        hint: '突破平台期',
        prompt: '当前职业发展陷入平台期或迷茫，希望发现隐藏的突破契机与资源',
        category: '职场发展'
      },
      {
        name: '人际沟通',
        hint: '化解关系张力',
        prompt: '面对复杂微妙的合作与人际沟通，希望看清认知盲区与平衡之道',
        category: '人际互动'
      },
      {
        name: '情绪内耗',
        hint: '中止无序自耗',
        prompt: '工作推进中感到疲惫与精神内耗，希望找寻能量回血的关键切入点',
        category: '情绪调适'
      },
      {
        name: '能量止血',
        hint: '重立心理边界',
        prompt: '感觉自己被繁杂外部事务持续消耗，希望设立清晰的心理边界并找回节奏',
        category: '能量管理'
      },
      {
        name: '突破困局',
        hint: '打破思维僵局',
        prompt: '眼前遇到棘手瓶颈难以推进，希望借助潜意识意象启发全新的破局视角',
        category: '认知转念'
      },
      {
        name: '价值认同',
        hint: '找寻行动意义',
        prompt: '在日常琐碎事务中感到意义感匮乏，希望重新确认自己所做之事的真实价值',
        category: '内在驱动'
      }
    ]
  },
  evening: {
    periodName: '暮色释怀',
    greeting: '🌆 暮色释怀 · 探察人际与内心的平衡',
    tags: [
      {
        name: '亲密关系',
        hint: '探察真实联结',
        prompt: '在亲密关系中感到隐秘的不安或隔阂，希望看见彼此真实的心理联结',
        category: '亲密情感'
      },
      {
        name: '卸下防备',
        hint: '舒缓紧绷神经',
        prompt: '忙碌了一整天后身心紧绷，希望卸下坚硬外壳，给予内在孩童温和抚慰',
        category: '自我疗愈'
      },
      {
        name: '家庭关怀',
        hint: '理清爱与边界',
        prompt: '面对原生家庭或重要亲人的牵绊，希望理清爱与责任的健康边界',
        category: '家庭关系'
      },
      {
        name: '接纳不完美',
        hint: '拥抱真实自我',
        prompt: '今天对自己有许多苛求与自责，希望学会全然包容并不完美的真实自我',
        category: '自我接纳'
      },
      {
        name: '找回自我',
        hint: '剥离外界评价',
        prompt: '在外界的期待与角色中有些迷失，希望回归本心感受自我的真实渴望',
        category: '认同探索'
      },
      {
        name: '情感共鸣',
        hint: '化解无言孤单',
        prompt: '感到自己的情绪未曾被真正听见，希望能在这个时刻与内在灵性产生共鸣',
        category: '深度连结'
      }
    ]
  },
  latenight: {
    periodName: '深夜愈己',
    greeting: '🌙 深夜愈己 · 潜意识投射与心灵安顿',
    tags: [
      {
        name: '潜意识梦境',
        hint: '探察深层呼唤',
        prompt: '深夜思绪万千难免纷扰，希望探察潜意识深处正在呼唤什么',
        category: '梦境意象'
      },
      {
        name: '孤独释怀',
        hint: '安住于静默中',
        prompt: '夜深人静时体会到深刻的孤独，希望在静默中与内在真正的自我相遇',
        category: '安顿心神'
      },
      {
        name: '睡前抚平',
        hint: '放下执念安眠',
        prompt: '抚平紧绷的神经与无序焦虑，让心灵归于沉静安稳的黑夜世界',
        category: '舒眠安神'
      },
      {
        name: '心灵安顿',
        hint: '给心一个港湾',
        prompt: '深夜对未来产生不确定的迷茫，希望得到一份沉稳温和的潜意识依托',
        category: '心灵安顿'
      },
      {
        name: '迷茫释怀',
        hint: '允许一切发生',
        prompt: '在不可控的现实面前感到无力，希望学会放下控制并允许一切发生',
        category: '释怀宽恕'
      },
      {
        name: '深度自省',
        hint: '审视内在轨迹',
        prompt: '在没有白昼喧嚣的时刻，静默审视自己最近的生活与心境轨迹',
        category: '深层内观'
      }
    ]
  }
};

export class MindTagService {
  /**
   * 根据当前时钟计算时辰
   */
  static getCurrentPeriod(): 'morning' | 'afternoon' | 'evening' | 'latenight' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      return 'morning';
    } else if (hour >= 11 && hour < 18) {
      return 'afternoon';
    } else if (hour >= 18 && hour < 24) {
      return 'evening';
    } else {
      return 'latenight';
    }
  }

  /**
   * 获取当下时辰的推荐心绪标签（支持排除已展示标签实现“换一批”）
   */
  static async getRecommendedTags(
    periodParam?: string,
    excludeNames: string[] = []
  ): Promise<MindTagResult> {
    const period = (['morning', 'afternoon', 'evening', 'latenight'].includes(periodParam || '')
      ? periodParam
      : this.getCurrentPeriod()) as 'morning' | 'afternoon' | 'evening' | 'latenight';

    const pool = BASE_MIND_TAG_POOL[period];

    // 优先从 Redis 缓存获取 AI 动态扩充的池子，若没有则使用基础心理学池
    const aiPoolKey = `mind_tags_pool:${period}`;
    let allTags: MindTag[] = pool.tags;
    try {
      const cachedAiPool = await cache.get(aiPoolKey);
      if (cachedAiPool) {
        const parsed = JSON.parse(cachedAiPool);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allTags = [...pool.tags, ...parsed];
        }
      }
    } catch {
      // 容错使用基础池
    }

    // 过滤排除已展示的标签（用于“换一批”）
    let candidateTags = allTags.filter((t) => !excludeNames.includes(t.name));
    if (candidateTags.length < 4) {
      // 若剩余不足 4 个，重新洗牌全量池
      candidateTags = [...allTags];
    }

    // 随机抽取 4 个
    const shuffled = [...candidateTags].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);

    return {
      period,
      periodName: pool.periodName,
      greeting: pool.greeting,
      tags: selected
    };
  }
}
