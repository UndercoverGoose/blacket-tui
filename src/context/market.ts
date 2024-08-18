import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Searchable, Configure } from '@component/.';
import type { Data } from '@lib/api/src/v1/data';
import type { Schema } from '@component/configure';
import type { State } from '@ctx/state';

const root_select = new Select('Select a page to view:', ['-> Open Packs ', '-> Pack Rates ', '-> Items & Weekly Shop ']);
const pack_search = new Searchable('Select a pack to view:', []);
pack_search.component.v_wrap = false;
const blook_view = new Select('Blooks:', ['-> Exit '], {
  header_func: s => s,
});
blook_view.component.v_wrap = false;
const item_select = new Select('Items:', []);
const opener_stop = new Select('', ['-> Stop '], {
  header_func: s => s,
});
const item_buy_confirm = new Select('', ['-> No ', '-> Yes ']);

type OpenConfig = {
  /** The pack to open. */
  pack: string;
  /** Limitations that stop the opener automatically. */
  limits?: {
    /** The maximum amount of tokens to spend. */
    tokens?: number;
    /** The maximum amount of packs to open. */
    packs?: number;
    /** Whether to continue opening attempts when the user has run out of tokens. */
    ignore_out_of_tokens?: boolean;
    /** A list of blooks that will stop the opening process once received. */
    blooks?: string[];
    /** The minimum booster rate to open packs at. */
    min_booster?: number;
  };
  /** Configuration for selling blooks. */
  sell?: {
    /**
     * The mode of selling.
     * - `instant`: Sell the blook immediately after it is received.
     * - `batch`: Sell the blooks in batches of higher quantities less frequently.
     * - `end`: Sell the blooks at the end of the opening process or when tokens run out.
     * - `off`: Do not sell any blooks.
     */
    mode: 'instant' | 'batch' | 'end' | 'off';
    /** A list of blooks to not sell. */
    blacklist?: string[];
    /** A list of rarities to not sell. */
    blacklist_rarities?: string[];
    /** Whether to force sell remaining blooks after conclusion. */
    sell_at_end?: boolean;
  };
};
type StaticConfig = {
  /** The pack to open. */
  pack: string;
  /** Limitations that stop the opener automatically. */
  limits: {
    /** The maximum amount of tokens to spend. */
    tokens: number;
    /** The maximum amount of packs to open. */
    packs: number;
    /** Whether to continue opening attempts when the user has run out of tokens. */
    ignore_out_of_tokens: boolean;
    /** A list of blooks that will stop the opening process once received. */
    blooks: string[];
    /** The minimum booster rate to open packs at. */
    min_booster: number;
  };
  /** Configuration for selling blooks. */
  sell: {
    /**
     * The mode of selling.
     * - `instant`: Sell the blook immediately after it is received.
     * - `batch`: Sell the blooks in batches of higher quantities less frequently.
     * - `end`: Sell the blooks at the end of the opening process or when tokens run out.
     * - `off`: Do not sell any blooks.
     */
    mode: 'instant' | 'batch' | 'end' | 'off';
    /** A list of blooks to not sell. */
    blacklist: string[];
    /** A list of rarities to not sell. */
    blacklist_rarities: string[];
    /** Whether to force sell remaining blooks after conclusion. */
    sell_at_end: boolean;
  };
};
type Metrics = {
  /** Whether the opening process has concluded or not. */
  complete: boolean;
  /** Net packs opened this run. */
  packs_opened: number;
  /** Tokens spent on packs opened. */
  tokens_spent: number;
  /** Tokens earned on blooks sold. */
  tokens_earned: number;
  /** Log of all blooks receieved. */
  blooks: Record<string, number>;
  /** Net record of blooks receieved. */
  net_blooks: Record<string, number>;
  /** Instant sell value of `net_blooks`. */
  instant_sell_value: 0;
  /** The blook received from this yield if an error did not occur. */
  last_blook?: {
    name: string;
    /** Whether the blook received from this yield is a new blook if an error did not occur. */
    new?: boolean;
  } & Data['blooks'][keyof Data['blooks']];
  /** The error received from this yield if an error did occur. */
  last_error?: string;
};

const ConfigSchema = {
  type: 'object',
  display: 'Opener Configuration',
  description: 'Configure the opener to open packs automatically.',
  props: {
    pack: {
      type: 'select',
      display: 'Pack',
      description: 'The pack to open.',
      choices: ['Pack1', 'Pack2', 'Pack3'],
      required: true,
    },
    limits: {
      type: 'object',
      display: 'Limitations',
      description: 'Limits that stop the opener',
      props: {
        tokens: {
          type: 'number',
          display: '# of Tokens',
          description: 'The maximum amount of tokens to spend',
          default: 0,
          min: 0,
        },
        packs: {
          type: 'number',
          display: '# of Packs',
          description: 'The maxmium amount of packs to open',
          default: 0,
          min: 0,
        },
        ignore_out_of_tokens: {
          type: 'boolean',
          static: true,
          display: 'Ignore Out of Tokens',
          description: 'Continue opening attempts when out of tokens',
          default: false,
        },
        blooks: {
          type: 'array',
          display: 'Blooks',
          description: 'List of blooks that will stop the opener when receieved',
          default: [],
          choices: ['Blook1', 'Blook2', 'Blook3'],
        },
        min_booster: {
          type: 'number',
          display: 'Min Booster',
          description: 'Minimum booster rate to open packs at',
          default: 0,
          min: 0,
          max: 2,
          allow_float: true,
        },
      },
    },
    sell: {
      type: 'object',
      display: 'Auto Sell',
      description: 'Configuration for selling blooks',
      props: {
        mode: {
          type: 'select',
          display: 'Mode',
          description: 'The mode of selling',
          default: 'off',
          choices: ['instant', 'batch', 'end', 'off'],
        },
        blacklist: {
          type: 'array',
          display: 'Blacklist',
          description: 'List of blooks to not sell',
          default: [],
          choices: ['Blook1', 'Blook2', 'Blook3'],
        },
        blacklist_rarities: {
          type: 'array',
          display: 'Blacklist Rarities',
          description: 'List of rarities to not sell',
          default: [],
          choices: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mystical'],
        },
        sell_at_end: {
          type: 'boolean',
          display: 'Sell at End',
          description: 'Force sell remaining blooks after conclusion',
          default: false,
        },
      },
    },
  },
};

/**
 * Configures and runs an opener to open packs automatically. Consistently returns metrics on the opening process.
 * @param token The token of the authenticated account.
 * @param opener_config The configuration for the opener.
 * @returns An async generator that yields metrics on the opening process.
 */
export async function* opener(token: string, opener_config: OpenConfig): AsyncGenerator<Metrics, void, void> {
  const config: StaticConfig = {
    pack: opener_config.pack,
    limits: {
      tokens: Infinity,
      packs: Infinity,
      ignore_out_of_tokens: false,
      blooks: [],
      min_booster: 0,
      ...opener_config.limits,
    },
    sell: {
      mode: 'off',
      blacklist: [],
      blacklist_rarities: [],
      sell_at_end: false,
      ...opener_config.sell,
    },
  };
  const metrics: Metrics = {
    complete: false,
    packs_opened: 0,
    tokens_spent: 0,
    tokens_earned: 0,
    blooks: {},
    net_blooks: {},
    instant_sell_value: 0,
  };
  const _data = await v1.data(true);
  if (_data.error) {
    metrics.last_error = _data.reason;
    yield metrics;
    return;
  }
  const data = _data.data;
  const pack_price = data.packs[config.pack]?.price ?? 0;
  let limit_reached = false;
  let booster_rate = data.booster.multiplier;
  let booster_end: Date | null = data.booster.time ? new Date(data.booster.time * 1000) : null;

  function can_sell_blook(blook_name: string, quantity?: number): boolean {
    if (config.sell.blacklist.includes(blook_name)) return false;
    if (config.sell.blacklist_rarities.includes(data.blooks[blook_name]?.rarity)) return false;
    if (config.limits.blooks.includes(blook_name)) return false;
    if (typeof quantity === 'number' && quantity <= 0) return false;
    return true;
  }
  async function sell_all_blooks(): Promise<void> {
    for (const [blook_name, quantity] of Object.entries(metrics.blooks)) {
      if (!can_sell_blook(blook_name, quantity)) continue;
      const res = await v1.sell(token, blook_name, quantity);
      if (res.error) {
        await Bun.sleep(1200);
        continue;
      }
      metrics.tokens_earned += data.blooks[blook_name].price * quantity;
      delete metrics.blooks[blook_name];
      await Bun.sleep(1200);
    }
  }
  async function sell_blook(blook_name: string, quantity: number): Promise<void> {
    if (!can_sell_blook(blook_name, quantity)) return;
    metrics.blooks[blook_name] -= quantity;
    v1.sell(token, blook_name, quantity).then(res => {
      if (res.error) {
        metrics.blooks[blook_name] += quantity;
        return;
      }
      metrics.tokens_earned += data.blooks[blook_name].price * quantity;
      if (metrics.blooks[blook_name] <= 0) delete metrics.blooks[blook_name];
    });
  }

  while (!limit_reached) {
    delete metrics.last_blook;
    delete metrics.last_error;
    if (metrics.tokens_spent + pack_price >= config.limits.tokens) break;
    if (metrics.packs_opened >= config.limits.packs) break;
    if (booster_rate < config.limits.min_booster && booster_end) {
      await Bun.sleep(booster_end);
      await Bun.sleep(60_000);
      booster_rate = 0;
      booster_end = null;
    }
    if (config.limits.min_booster > 0 && (booster_rate === 0 || !booster_end)) {
      const _data = await v1.data(false);
      if (_data.error) {
        await Bun.sleep(2000);
        continue;
      }
      const booster = _data.data.booster;
      if (!booster.active) {
        await Bun.sleep(5000);
        continue;
      }
      booster_rate = booster.multiplier;
      booster_end = new Date(booster.time * 1000);
      continue;
    }
    if (booster_end && config.limits.min_booster > 0 && new Date() > booster_end) {
      booster_rate = 0;
      booster_end = null;
      continue;
    }
    const res = await v1.open(token, config.pack);
    if (res.error) {
      metrics.last_error = res.reason;
      yield metrics;
      await Bun.sleep(100);
      if (res.reason.toLowerCase().includes('tokens')) {
        if (!config.limits.ignore_out_of_tokens) limit_reached = true;
        else if (config.sell.mode === 'end') await sell_all_blooks();
      }
      continue;
    }
    const blook_name = res.blook;
    const blook = data.blooks[blook_name];
    if (config.limits.blooks.includes(blook_name)) limit_reached = true;
    metrics.packs_opened++;
    metrics.tokens_spent += pack_price;
    metrics.blooks[blook_name] = (metrics.blooks[blook_name] ?? 0) + 1;
    metrics.net_blooks[blook_name] = (metrics.net_blooks[blook_name] ?? 0) + 1;
    metrics.instant_sell_value += blook.price;
    metrics.last_blook = {
      name: blook_name,
      new: res.new ?? false,
      ...blook,
    };
    yield metrics;
    if (config.sell.mode === 'instant') sell_blook(blook_name, metrics.blooks[blook_name]);
    await Bun.sleep((data.rarities[blook.rarity].wait ?? 50) - 50);
    if (config.sell.mode === 'batch' && metrics.packs_opened % 3 === 0) {
      const filtered_blooks = Object.entries(metrics.blooks).filter(([blook_name, quantity]) => can_sell_blook(blook_name, quantity));
      const [blook_name, quantity] = filtered_blooks.reduce((a, b) => (a[1] > b[1] ? a : b), ['', 0]);
      if (blook_name) sell_blook(blook_name, quantity);
    }
  }
  if (config.sell.mode === 'end' || config.sell.sell_at_end) await sell_all_blooks();
  metrics.complete = true;
  yield metrics;
}

const default_config: StaticConfig = {
  pack: '',
  limits: {
    tokens: Infinity,
    packs: Infinity,
    ignore_out_of_tokens: false,
    blooks: [],
    min_booster: 0,
  },
  sell: {
    mode: 'off',
    blacklist: [],
    blacklist_rarities: [],
    sell_at_end: false,
  },
};

export const states = {
  /**
   * The root state for the market context.
   * @param state The current state.
   */
  root: async (state: State): Promise<void> => {
    while (true) {
      switch (await root_select.response_bind(state.terminal)) {
        case -1: {
          return;
        }
        case 0: {
          await states.run_opener(state);
          break;
        }
        case 1: {
          await states.view_packs(state);
          break;
        }
        case 2: {
          await states.shop(state);
          break;
        }
      }
    }
  },
  /**
   * Generates a configuration for the opener.
   * @param state The current state.
   * @returns The configuration for the opener or null if cancelled.
   */
  configure_opener: async (state: State): Promise<StaticConfig | null> => {
    const data = await v1.data(true);
    if (data.error) return null;
    const config = new Proxy(default_config, {
      set: (target, prop, value) => {
        target[prop as keyof StaticConfig] = value;

        if (prop === 'pack' && value) {
          const blooks = data.data.packs[value].blooks;
          const blook_rarities = blooks.map(blook => data.data.blooks[blook].rarity);
          const rarities = Object.keys(data.data.rarities).filter(rarity => blook_rarities.includes(rarity));
          ConfigSchema.props.limits.props.blooks.choices = blooks;
          ConfigSchema.props.sell.props.blacklist.choices = blooks;
          ConfigSchema.props.sell.props.blacklist_rarities.choices = rarities;
          target.limits.blooks = [];
          target.sell.blacklist = [];
          target.sell.blacklist_rarities = [];
        }

        return true;
      },
    });
    ConfigSchema.props.pack.choices = Object.keys(data.data.packs);
    const configure = new Configure<StaticConfig>(config, ConfigSchema as Schema);
    const res = await configure.response_bind(state.terminal);
    if (res) return config;
    return null;
  },
  /**
   * Runs the opener with the provided configuration or generates one if necessary.
   * @param state The current state.
   * @param configuration The configuration for the opener.
   */
  run_opener: async (state: State, configuration?: StaticConfig): Promise<void> => {
    const data = await v1.data(true);
    if (data.error) return;
    const config = configuration ?? (await states.configure_opener(state));
    if (!config) return;

    let stop = false;
    opener_stop.set_options([Color.bold('-> Stop ')]);
    opener_stop.response_bind(state.terminal).then(() => {
      stop = true;
    });
    for await (const metrics of opener(state.token, config)) {
      opener_stop.set_question(
        [
          Color.green(Color.underline('Opening pack'), ': ', Color.bold(config.pack)),
          Color.yellow(
            Color.underline('Packs Opened'),
            ': ',
            Color.bold(metrics.packs_opened.toLocaleString()),
            config.limits.packs ? `/${config.limits.packs.toLocaleString()}` : ''
          ),
          Color.yellow(
            Color.underline('Tokens Spent'),
            ': ',
            Color.bold(metrics.tokens_spent.toLocaleString()),
            config.limits.tokens ? `/${config.limits.tokens.toLocaleString()}` : ''
          ),
          Color.yellow(Color.underline('Instant Sell Value'), ': ', Color.bold(metrics.instant_sell_value.toLocaleString())),
          Color.yellow('Net Unlocks:'),
          ...Object.entries(metrics.net_blooks)
            .sort(([blook1], [blook2]) => {
              return data.data.blooks[blook2].price - data.data.blooks[blook1].price || blook1.localeCompare(blook2);
            })
            .map(([blook_name, count]) => {
              const blook = data.data.blooks[blook_name];
              const hex = data.data.rarities[blook.rarity].color;
              const func = metrics.last_blook?.name === blook_name ? Color.bold : Color.join;
              return func(`[${Color.hex(hex, blook.rarity)}] ${Color.hex(hex, blook_name)} - ${Color.green(count + 'x')}`);
            }),
        ].join('\n')
      );
      if (stop) {
        state.terminal.pop(opener_stop.component);
        return;
      }
    }
    opener_stop.set_options([Color.bold('-> Exit ', Color.reset(' ', Color.red(Color.blink_slow('(Opener has finished)'))))]);
    await opener_stop.response_bind(state.terminal);
  },
  /**
   * Displays the shop and allows the user to purchase items.
   * @param state The current state.
   */
  shop: async (state: State): Promise<void> => {
    const data = await v1.data(true);
    if (data.error) return;
    const items = {
      'Clan Shield': { price: 100000, glow: false },
      'Fragment Grenade (Item)': { price: 100000, glow: false },
      'Stealth Disguise Kit (Item)': { price: 250000, glow: false },
      ...data.data.weekly_shop,
    };
    const items_map = Object.entries(items);
    item_select.set_options(items_map.map(([k, v]) => `-> ${k} - ${v.price.toLocaleString()} tokens `));
    while (true) {
      const select5_idx = await item_select.response_bind(state.terminal);
      if (select5_idx === -1) break;
      const [item_name, item_info] = items_map[select5_idx];
      await states.shop_buy_confirm(state, item_name, item_info.price);
    }
  },
  /**
   * Confirms the purchase of an item from the shop.
   * @param state The current state.
   * @param item_name The name of the item to purchase.
   * @param item_price The price of the item to purchase.
   * @returns Whether the purchase was confirmed and successful or not.
   */
  shop_buy_confirm: async (state: State, item_name: string, item_price: number): Promise<boolean> => {
    item_buy_confirm.set_question(`Are you sure you want to purchase ${Color.bold(item_name)} for ${Color.bold(item_price.toLocaleString())} tokens?`);
    item_buy_confirm.set_selected_index(0);
    switch (await item_buy_confirm.response_bind(state.terminal)) {
      case -1:
      case 0: {
        return false;
      }
      case 1: {
        const buy_res = await v1.buy(state.token, item_name);
        if (buy_res.error) state.notif_section.push_error(buy_res.reason);
        else {
          state.notif_section.push_success(buy_res.message);
          state.tokens.remove_tokens(item_price);
          return true;
        }
        return false;
      }
    }
    return false;
  },
  /**
   * Displays the packs available and allows the user to view the blooks in each pack.
   * @param state The current state.
   */
  view_packs: async (state: State): Promise<void> => {
    const data = await v1.data(true);
    if (data.error) return;
    const packs = Object.keys(data.data.packs);
    pack_search.set_choices(packs.map(pack => `-> ${pack} `));
    while (true) {
      const select2_idx = await pack_search.response_bind(state.terminal);
      if (select2_idx === -1) break;
      await states.view_blooks(state, packs[select2_idx]);
    }
  },
  /**
   * Displays the blooks in a pack.
   * @param state The current state.
   * @param pack The pack to view.
   */
  view_blooks: async (state: State, pack: string): Promise<void> => {
    const data = await v1.data(true);
    if (data.error) return;
    const blooks = data.data.packs[pack].blooks;
    const rarities = data.data.rarities;
    blook_view.set_question(
      [
        Color.underline(`Blooks in ${Color.bold(pack)}:`),
        ...blooks
          .sort((a, b) => data.data.blooks[a].chance - data.data.blooks[b].chance || a.localeCompare(b))
          .map(blook => {
            const rarity = data.data.blooks[blook].rarity;
            const chance = data.data.blooks[blook].chance;
            const hex = rarities[rarity].color;
            return Color.bright_black(`[${Color.hex(hex, rarity)}] ${Color.hex(hex, blook)} - ${Color.hex(hex, chance + '%')}`);
          }),
      ].join('\n')
    );
    await blook_view.response_bind(state.terminal);
  },
};
