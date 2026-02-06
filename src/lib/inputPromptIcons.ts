export const INPUT_PROMPT_ICONS = {
  keyboardMouse: {
    mouseLeft: new URL(
      "../assets/input-prompts/keyboard-mouse/Default/mouse_left.png",
      import.meta.url,
    ).href,
    space: new URL(
      "../assets/input-prompts/keyboard-mouse/Default/keyboard_space.png",
      import.meta.url,
    ).href,
  },
  xboxSeries: {
    buttonB: new URL(
      "../assets/input-prompts/xbox-series/Default/xbox_button_b.png",
      import.meta.url,
    ).href,
    buttonY: new URL(
      "../assets/input-prompts/xbox-series/Default/xbox_button_y.png",
      import.meta.url,
    ).href,
  },
} as const;

export type InputPromptIconSet = typeof INPUT_PROMPT_ICONS;
