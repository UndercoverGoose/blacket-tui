import { BASE_HEADERS, type FetchError } from '.';

type Data = {
  config: {
    name: string;
    version: string;
    welcome: string;
    description: string;
    pronunciation: string;
    discord: string;
    store: Record<
      string,
      {
        price: string;
        sale: {
          price: string;
          name: string | null;
        };
      }
    >;
    rewards: number[];
    exp: {
      difficulty: number;
    };
    pages: Record<
      string,
      {
        link: string | null;
        icon: string;
        isNews: boolean;
        isChat: boolean;
        location: 'left' | 'bottom';
        perm: string;
      }
    >;
    chat: {
      tokens: number;
      exp: number;
      cooldown: number;
    };
    reports: {
      user: Record<string, string[]>;
      messages: Record<string, string[]>;
    };
    credits: {
      user: number;
      nickname: string;
      image: null;
      note: string;
      top?: true;
    }[];
  };
  booster: {
    active: boolean;
    multiplier: number;
    time: number;
    user: number;
  };
  credits: {
    nickname: string;
    image: null;
    note: string;
    top?: true;
    user: {
      id: number;
      username: string;
      avatar: string;
      banner: string;
      badges: string[];
      role: string;
      color: string;
    };
  }[];
  news: {
    title: string;
    image: string;
    body: string;
    date: number;
  }[];
  presets: Record<
    string,
    {
      color: string;
      perms: string[];
      badges: string[];
    }
  >;
  blooks: Record<
    string,
    {
      rarity: string;
      chance: number;
      price: number;
      image: string;
      art: string;
      bazaarMinimumListingPrice: number | null;
      bazaarMaximumListingPrice: number | null;
    }
  >;
  rarities: Record<
    string,
    {
      color: string;
      animation: string;
      exp: number;
      wait: number;
    }
  >;
  packs: Record<
    string,
    {
      price: number;
      color1: string;
      color2: string;
      image: string;
      blooks: string[];
      hidden: boolean;
    }
  >;
  banners: Record<
    string,
    {
      image: string;
    }
  >;
  badges: Record<
    string,
    {
      image: string;
      description: string;
    }
  >;
  emojis: Record<
    string,
    {
      image: string;
    }
  >;
  weekly_shop: Record<
    string,
    {
      price: number;
      glow: boolean;
    }
  >;
};

type APIResponse = {
  error: false;
  data: Data;
};

/**
 * Gets default data like Blooks, Packs, and more.
 * @returns The default data.
 */
export default async function (): Promise<APIResponse | FetchError> {
  const res = await fetch('https://blacket.org/data/index.json', {
    headers: BASE_HEADERS,
    method: 'GET',
  });
  switch (res.status) {
    case 200: {
      const json = (await res.json()) as Data;
      return {
        error: false,
        data: json,
      };
    }
    default: {
      return {
        error: true,
        reason: `Unexpected status code: ${res.status}.`,
        internal: true,
      };
    }
  }
}
