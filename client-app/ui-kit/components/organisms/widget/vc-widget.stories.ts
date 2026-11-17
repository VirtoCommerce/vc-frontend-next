import { VcWidget } from "..";
import type { Meta, StoryObj } from "@storybook/vue3-vite";

const SIZES = ["xs", "sm", "md", "lg"];

const meta: Meta<typeof VcWidget> = {
  title: "Components/Organisms/VcWidget",
  component: VcWidget,
  parameters: {
    docs: {
      description: {
        component: [
          "A plate with an optional header, a body and a footer. A theme or a design restyles it through these CSS variables:",
          "",
          "| Variable | Classic value |",
          "| --- | --- |",
          "| `--vc-widget-radius` | `var(--vc-radius)`, 0.5rem |",
          "| `--vc-widget-border-width` | 1px; a length, so `0px` rather than `0` |",
          "| `--vc-widget-border-color` | neutral-200 |",
          "| `--vc-widget-divide-color` | the border colour |",
          "| `--vc-widget-bg-color` | additional-50 |",
          "| `--vc-widget-shadow` | the `shadow-md` parts |",
          "| `--vc-widget-padding-x` | xs, sm 1rem · md 1rem, 1.5rem from `sm` · lg 1rem, 1.75rem from `lg` |",
          "| `--vc-widget-padding-top`, `--vc-widget-padding-bottom` | the same step as `--vc-widget-padding-x` |",
          "| `--vc-widget-header-min-height` | xs 2.375rem · sm 2.875rem · md 3.125rem · lg 4.375rem |",
          "| `--vc-widget-header-padding-y`, `--vc-widget-header-padding-x` | 0.25rem · the body's inline inset |",
          "| `--vc-widget-title-font-size` | the size's title step |",
          "| `--vc-widget-no-shadow-border-color` | neutral-200 |",
          "| `--vc-widget-container-margin-x` | -1.125rem below `md` inside VcContainer |",
          "| `--vc-widget-icon-shape-size`, `-icon-size`, `-bg-color`, `-icon-stroke` | 2.25rem · 1.25rem · secondary-400 · 1.6 (`icon-shape`) |",
          "| `--vc-widget-title-font-weight` | `var(--vc-heading-font-weight)`, else 700 |",
          "| `--vc-widget-title-text-transform` | `var(--vc-heading-text-transform)`, else uppercase |",
          "| `--vc-widget-title-letter-spacing` | `var(--vc-heading-letter-spacing)`, else inherited |",
        ].join("\n"),
      },
    },
  },
  argTypes: {
    size: {
      control: "inline-radio",
      options: SIZES,
      type: { name: "string", required: false },
      table: {
        type: {
          summary: SIZES.join(" | "),
        },
      },
    },
  },
  render: (args) => ({
    setup: () => ({ args }),
    template: '<VcWidget v-bind="args">Widget text</VcWidget>',
  }),
};

export default meta;
type StoryType = StoryObj<typeof meta>;

const renderWidget = (template: string) => (args: Record<string, unknown>) => ({
  setup: () => ({ args }),
  template,
});

export const Basic: StoryType = {
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget>
            Widget text
          </VcWidget>
        `,
      },
    },
  },
};

export const NoShadow: StoryType = {
  args: {
    shadow: false,
  },
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget :shadow="false">
            Widget text
          </VcWidget>
        `,
      },
    },
  },
};

export const NoBorder: StoryType = {
  args: {
    border: false,
  },
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget :border="false">
            Widget text
          </VcWidget>
        `,
      },
    },
  },
};

// A shadowless widget has only its outline left, so it takes the edge colour from its own knob
// rather than from the one a theme clears in exchange for a shadow.
export const NoShadowBorderCSSVariable: StoryType = {
  args: {
    shadow: false,
    title: "Widget title",
  },
  render: renderWidget(`<div :style="{ '--vc-widget-no-shadow-border-color': '#e5451c' }">
    <VcWidget v-bind="args">Widget text</VcWidget>
  </div>`),
};

// The surface knobs together: a widget can be drawn as a plate that sits straight on the
// canvas, with the shadow as its only edge.
export const SurfaceCSSVariables: StoryType = {
  args: {
    title: "Widget title",
  },
  render: renderWidget(`<div :style="{
    '--vc-widget-radius': '1.75rem',
    '--vc-widget-border-color': 'transparent',
    '--vc-widget-divide-color': '#e7ddce',
    '--vc-widget-shadow': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  }">
    <VcWidget v-bind="args">Widget text</VcWidget>
  </div>`),
};

export const Title: StoryType = {
  args: {
    title: "Widget title",
  },
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget title="Widget title">
            Widget text
          </VcWidget>
        `,
      },
    },
  },
};

export const PrependIcon: StoryType = {
  args: {
    title: "Widget title",
    prependIcon: "academic-cap",
  },
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget title="Widget title" prepend-icon="academic-cap">
            Widget text
          </VcWidget>
        `,
      },
    },
  },
};

export const AppendIcon: StoryType = {
  args: {
    title: "Widget title",
    appendIcon: "check-circle",
  },
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget title="Widget title" append-icon="check-circle">
            Widget text
          </VcWidget>
        `,
      },
    },
  },
};

export const Collapsible: StoryType = {
  args: {
    title: "Widget title",
    collapsible: true,
  },
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget title="Widget title" collapsible>
            Widget text
          </VcWidget>
        `,
      },
    },
  },
};

export const Collapsed: StoryType = {
  args: {
    title: "Widget title",
    collapsible: true,
    collapsed: true,
  },
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget title="Widget title" collapsible collapsed>
            Widget text
          </VcWidget>
        `,
      },
    },
  },
};

export const CollapsibleCustomIcon: StoryType = {
  args: {
    title: "Widget title",
    collapsible: true,
  },
  render: renderWidget(`<VcWidget v-bind="args">
    Widget text

    <template #append="{ collapsed }">
      <VcIcon :name="collapsed ? 'arrow-down' : 'arrow-up'" />
    </template>
  </VcWidget>`),
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget title="Widget title" collapsible>
            Widget text

            <template #append="{ collapsed }">
              <VcIcon :name="collapsed ? 'arrow-down' : 'arrow-up'" />
            </template>
          </VcWidget>
        `,
      },
    },
  },
};

export const PrependSlot: StoryType = {
  args: {
    title: "Widget title",
  },
  render: renderWidget(`<VcWidget v-bind="args">
    <template #prepend>
      <VcIcon class="text-danger" name="cake" size="sm" />
    </template>

    Widget text
  </VcWidget>`),
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget title="Widget title">
            <template #prepend>
              <VcIcon class="text-danger" name="cake" size="sm" />
            </template>

            Widget text
          </VcWidget>
        `,
      },
    },
  },
};

export const AppendSlot: StoryType = {
  args: {
    title: "Widget title",
  },
  render: renderWidget(`<VcWidget v-bind="args">
    Widget text

    <template #append>
      <span class="flex items-center gap-1">
        <a class="text-accent-600 text-sm underline" href="#">Link</a>
        <VcIcon class="text-accent-600" name="arrow-right" size="xs" />
      </span>
    </template>
  </VcWidget>`),
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget title="Widget title">
            Widget text

            <template #append>
              <span class="flex items-center gap-1">
                <a class="text-accent-600 text-sm underline" href="#">Link</a>
                <VcIcon class="text-accent-600" name="arrow-right" size="xs" />
              </span>
            </template>
          </VcWidget>
        `,
      },
    },
  },
};

export const HeaderSlot: StoryType = {
  render: renderWidget(`<VcWidget v-bind="args">
    <template #header>Header text</template>

    Widget text
  </VcWidget>`),
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget>
            <template #header>Header text</template>

            Widget text
          </VcWidget>
        `,
      },
    },
  },
};

export const HeaderContainerSlot: StoryType = {
  render: renderWidget(`<VcWidget v-bind="args">
    <template #header-container>
      <div class="p-4 bg-info text-additional-50">
        Header Container
      </div>
    </template>

    Widget text
  </VcWidget>`),
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget>
            <template #header-container>
              <div class="p-4 bg-info text-additional-50">
                Header Container
              </div>
            </template>

            Widget text
          </VcWidget>
        `,
      },
    },
  },
};

export const DefaultContainerSlot: StoryType = {
  render: renderWidget(`<VcWidget v-bind="args">
    <template #default-container>
      <div class="py-1 px-3 rounded-t-[var(--vc-widget-radius,var(--vc-radius))] bg-neutral-100">
        Default Container
      </div>
      <div class="flex border-t divide-x" v-for="item in [1, 2, 3]">
        <div class="py-1 px-3">{{ item }}</div>
        <div class="grow py-1 px-3">Text</div>
        <div class="grow-[2] py-1 px-3">Text</div>
      </div>
    </template>
  </VcWidget>`),
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget>
            <template #default-container>
              <div class="py-1 px-3 rounded-t-[var(--vc-widget-radius,var(--vc-radius))] bg-neutral-100">
                Default Container
              </div>
              <div v-for="item in [1, 2, 3]" :key="item" class="flex border-t divide-x">
                <div class="py-1 px-3">{{ item }}</div>
                <div class="grow py-1 px-3">Text</div>
                <div class="grow-[2] py-1 px-3">Text</div>
              </div>
            </template>
          </VcWidget>
        `,
      },
    },
  },
};

export const FooterSlot: StoryType = {
  render: renderWidget(`<VcWidget v-bind="args">
    Widget text

    <template #footer>Footer text</template>
  </VcWidget>`),
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget>
            Widget text

            <template #footer>Footer text</template>
          </VcWidget>
        `,
      },
    },
  },
};

export const FooterContainerSlot: StoryType = {
  render: renderWidget(`<VcWidget v-bind="args">
    Widget text

    <template #footer-container>
      <div class="flex divide-x">
        <div class="grow p-2 text-center rounded-bl-[inherit] bg-danger-100">Text 1</div>
        <div class="grow p-2 text-center bg-warning-100">Text 2</div>
        <div class="grow p-2 text-center rounded-br-[inherit] bg-success-100">Text 3</div>
      </div>
    </template>
  </VcWidget>`),
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget>
            Widget text

            <template #footer-container>
              <div class="flex divide-x">
                <div class="grow p-2 text-center rounded-bl-[inherit] bg-danger-100">Text 1</div>
                <div class="grow p-2 text-center bg-warning-100">Text 2</div>
                <div class="grow p-2 text-center rounded-br-[inherit] bg-success-100">Text 3</div>
              </div>
            </template>
          </VcWidget>
        `,
      },
    },
  },
};

export const HeaderOnly: StoryType = {
  args: {
    title: "Widget title",
  },
  render: renderWidget(`<VcWidget v-bind="args" />`),
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget title="Widget title" />
        `,
      },
    },
  },
};

export const FooterOnly: StoryType = {
  render: renderWidget(`<VcWidget>
    <template #footer>Footer text</template>
  </VcWidget>`),
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget>
            <template #footer>Footer text</template>
          </VcWidget>
        `,
      },
    },
  },
};

export const HeaderFooterOnly: StoryType = {
  render: renderWidget(`<VcWidget>
    <template #header>Header text</template>

    <template #footer>Footer text</template>
  </VcWidget>`),
  parameters: {
    docs: {
      source: {
        code: `
          <VcWidget>
            <template #header>Header text</template>

            <template #footer>Footer text</template>
          </VcWidget>
        `,
      },
    },
  },
};

export const Seamless: StoryType = {
  render: renderWidget(`<VcWidget title="Account" size="lg">
    <div class="space-y-6">
      <VcWidget title="Orders" size="sm" seamless>
        <ul class="space-y-2">
          <li>Order history</li>
          <li>Returns</li>
        </ul>
      </VcWidget>

      <VcWidget title="Company" size="sm" seamless>
        <ul class="space-y-2">
          <li>Company info</li>
          <li>Members</li>
        </ul>
      </VcWidget>
    </div>
  </VcWidget>`),
  parameters: {
    docs: {
      description: {
        story:
          "`seamless` draws no plate and no inline padding, so a widget inside another card lines its rows up with that card's heading.",
      },
      source: {
        code: `
          <VcWidget title="Account" size="lg">
            <div class="space-y-6">
              <VcWidget title="Orders" size="sm" seamless>
                <ul class="space-y-2">
                  <li>Order history</li>
                  <li>Returns</li>
                </ul>
              </VcWidget>

              <VcWidget title="Company" size="sm" seamless>
                <ul class="space-y-2">
                  <li>Company info</li>
                  <li>Members</li>
                </ul>
              </VcWidget>
            </div>
          </VcWidget>
        `,
      },
    },
  },
};

// The three padding knobs, set from outside by name. Without them a consumer could only reach
// this widget's inset through `--p-x`/`--p-t`/`--p-b`, which are the block's private spelling.
export const PaddingFromTheOutside: StoryType = {
  args: {
    title: "Roomier plate",
  },
  render:
    renderWidget(`<div style="--vc-widget-padding-x: 2.5rem; --vc-widget-padding-top: 2.5rem; --vc-widget-padding-bottom: 2.5rem">
    <VcWidget v-bind="args">Widget text</VcWidget>
  </div>`),
};

// The block head: the prepended icon drawn on a disc, with the title set in caps and led to the
// disc's height so the two make one row. Off by default, because a widget that is a panel rather
// than a headed block — a checkout section, a cart summary — keeps the bare glyph. The four numbers
// are reachable by name, so a theme retunes every marked widget at once.
export const IconShape: StoryType = {
  args: {
    title: "Product variations",
    prependIcon: "cube",
    iconShape: true,
    size: "lg",
  },
  render: renderWidget(`<div>
    <VcWidget v-bind="args">Marked: the head of a content block.</VcWidget>

    <VcWidget title="Product variations" prepend-icon="cube" size="lg">Unmarked, which is the default.</VcWidget>

    <div style="--vc-widget-icon-shape-size: 3rem; --vc-widget-icon-shape-bg-color: var(--color-primary-500)">
      <VcWidget v-bind="args" title="Retuned from outside" />
    </div>
  </div>`),
};
