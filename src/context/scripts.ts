import { Searchable, Select } from '@component/.';
import type { State } from '@ctx/state';
import Color from '@lib/color';
import { readdirSync, readFileSync } from 'fs';

type ModuleExports = {
  META?: ScriptMeta;
  main: (state: State) => Promise<void>;
};
export interface ScriptMeta {
  author?: string;
  description?: string;
  source?: string;
}

const root_search = new Searchable('Select a script:', []);
const root_select = new Select('Select an action to perform:', [], {
  disabled_indexes: [0],
});

export const states = {
  /**
   * Script manager.
   * @param state The current state.
   */
  root: async (state: State): Promise<void> => {
    try {
      while (true) {
        const fileNames = readdirSync(`${process.cwd()}/scripts/`);
        if (fileNames.length === 0) return;
        root_search.set_choices(fileNames.map(name => `-> ${name}`));
        const script_idx = await root_search.response_bind(state.terminal);
        if (script_idx === -1) return;
        // the script needs imported and the main function executed
        try {
          const scriptSrc: ModuleExports = await import(`${process.cwd()}/scripts/${fileNames[script_idx]}`);
          const meta = scriptSrc.META;
          const entry = scriptSrc.main;
          root_select.set_question(`Select an action to perform on '${Color.bold(fileNames[script_idx])}':`);
          root_select.set_options([
            Color.blue(
              'author ',
              meta?.author ? Color.bold(meta.author) : Color.bright_black('unspecified'),
              '\n',
              'description ',
              meta?.description ? Color.bold(meta.description) : Color.bright_black('unspecified'),
              '\n',
              'source ',
              meta?.source ? Color.bold(meta.source) : Color.bright_black('unspecified')
            ),
            '-> Execute ',
          ]);
          root_select.set_selected_index(1);
          if (!entry) root_select.set_disabled_indexes([0, 1]);
          else root_select.set_disabled_indexes([0]);
          switch (await root_select.response_bind(state.terminal)) {
            case -1:
            case 0:
              return;
            case 1: {
              if (!entry) {
                state.notif_section.push_error('Script has no main function.');
                break;
              }
              try {
                await entry(state);
              } catch (err) {
                state.notif_section.push_error(`[${fileNames[script_idx]}] ${err}`);
              }
              break;
            }
          }
        } catch (err) {
          state.notif_section.push_error(`[exec] ${err}`);
        }
      }
    } catch (err) {
      state.notif_section.push_error(`[internal] ${err}`);
    }
  },
};
