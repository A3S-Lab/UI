# Reference Coverage Matrix

This matrix pins the public component documentation of `@lobehub/ui` v5.29.3 at revision `f1d2a7e7b342f76ffc64602e32f3cb47ae96e0aa`. The authoritative inventory is the repository's `navigationSections.json`, public barrel exports, and rendered component routes at <https://ui.lobehub.com/>.

The pinned catalog contains 160 public component documents:

| Reference section | Documents |
| ----------------- | --------: |
| Components        |        75 |
| Awesome           |        10 |
| Base UI           |        16 |
| Brand             |         9 |
| Chat              |        11 |
| Color             |         2 |
| Hooks & Providers |         1 |
| Icons             |        24 |
| MDX               |         7 |
| Mobile            |         4 |
| StoryBook         |         1 |
| **Total**         |   **160** |

## Decision vocabulary

- **Direct** keeps the durable component job and implements it through the canonical A3S semantic HTML contract.
- **Adapt** keeps the user job while changing the boundary, naming, or behavior for A3S products.
- **Compose** documents and tests a composition of existing A3S contracts instead of creating a duplicate root.
- **Foundation** implements the capability through tokens, utilities, providers, localization, or motion policy.
- **Brand substitute** uses the official A3S OS logo and A3S Brand Lockup contract.
- **Host integration** leaves externally owned assets or services with the host and documents a typed slot or renderer boundary.

Every completed row records one checked evidence kind: `component`, `composition`, `foundation`, `brand`, `integration`, or `route`. Strict validation resolves component slugs through the manifest, requires aligned Chinese and English framework guides, resolves bilingual boundary pages, and verifies standalone route sources. A status without one of those resolvable targets is incomplete.

## Components

| Reference source                                                   | Decision         | A3S target                                                                      | Current state                                                  |
| ------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/Accordion/index.mdx`                                          | Direct           | Accordion                                                                       | Verified — component: `accordion`                              |
| `src/ActionIcon/index.mdx`                                         | Compose          | Button with icon-only size and accessible name                                  | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/ActionIconGroup/index.mdx`                                    | Compose          | Button Group of icon-only Buttons                                               | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/Alert/index.mdx`                                              | Direct           | Alert                                                                           | Verified — component: `alert`                                  |
| `src/AutoComplete/index.mdx`                                       | Adapt            | Combobox                                                                        | Verified — component: `combobox`                               |
| `src/Avatar/index.mdx`                                             | Direct           | Avatar                                                                          | Verified — component: `avatar`                                 |
| `src/Block/index.mdx`                                              | Compose          | Card or Item surface                                                            | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/Burger/index.mdx`                                             | Compose          | App Shell or Sidebar trigger using Button                                       | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/Button/index.mdx`                                             | Direct           | Button                                                                          | Verified — component: `button`                                 |
| `src/Checkbox/index.mdx`                                           | Direct           | Checkbox                                                                        | Verified — component: `checkbox`                               |
| `src/CodeDiff/index.mdx`                                           | Adapt            | Code Diff renderer inside Change Review                                         | Verified — component: `code-diff`, `change-review`             |
| `src/CodeEditor/index.mdx`                                         | Direct           | Code Editor                                                                     | Verified — component: `code-editor`                            |
| `src/Collapse/index.mdx`                                           | Adapt            | Collapsible and Accordion                                                       | Verified — component: `collapsible`, `accordion`               |
| `src/ColorSwatches/index.mdx`                                      | Direct           | Color Swatches                                                                  | Verified — component: `color-swatches`                         |
| `src/ConfigProvider/index.mdx`                                     | Foundation       | Theme configuration and adapter context                                         | Verified — foundation: `foundations/runtime-configuration.mdx` |
| `src/ContextMenu/index.mdx`                                        | Direct           | Context Menu                                                                    | Verified — component: `context-menu`                           |
| `src/CopyButton/index.mdx`                                         | Direct           | Copy Button and clipboard hook                                                  | Verified — component: `copy-button`                            |
| `src/DatePicker/index.mdx`                                         | Adapt            | Date Picker with native fallback                                                | Verified — component: `date-picker`                            |
| `src/DownloadButton/index.mdx`                                     | Compose          | Button plus download helper and hook                                            | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/DraggablePanel/index.mdx`                                     | Adapt            | Split Pane and resizable Task Pane                                              | Verified — component: `split-pane`, `task-pane`                |
| `src/DraggableSideNav/index.mdx`                                   | Compose          | Sidebar inside Split Pane                                                       | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/Drawer/index.mdx`                                             | Direct           | Drawer                                                                          | Verified — component: `drawer`                                 |
| `src/Dropdown/index.mdx`                                           | Adapt            | Dropdown Menu trigger composition                                               | Verified — component: `dropdown-menu`                          |
| `src/DropdownMenu/index.mdx`                                       | Direct           | Dropdown Menu                                                                   | Verified — component: `dropdown-menu`                          |
| `src/EditableText/index.mdx`                                       | Direct           | Editable Text                                                                   | Verified — component: `editable-text`                          |
| `src/EditorSlashMenu/index.mdx`                                    | Compose          | Command anchored to an editor caret                                             | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/EmojiPicker/index.mdx`                                        | Adapt            | Emoji Picker with host-provided data and upload boundary                        | Verified — component: `emoji-picker`                           |
| `src/Empty/index.mdx`                                              | Direct           | Empty                                                                           | Verified — component: `empty`                                  |
| `src/FileTypeIcon/index.mdx`                                       | Direct           | File Type Icon                                                                  | Verified — component: `file-type-icon`                         |
| `src/Flex/index.mdx`                                               | Foundation       | Flex layout utilities                                                           | Verified — foundation: `patterns/composition-recipes.mdx`      |
| `src/FluentEmoji/index.mdx`                                        | Host integration | Avatar or Icon with host-provided emoji assets                                  | Verified — integration: `patterns/host-integrations.mdx`       |
| `src/FontLoader/index.mdx`                                         | Foundation       | Font loading recipe and token fallbacks                                         | Verified — foundation: `foundations/typography.mdx`            |
| `src/Footer/index.mdx`                                             | Compose          | App Page footer and Status Bar                                                  | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/Form/index.mdx`                                               | Direct           | Form, Field, and submit state                                                   | Verified — component: `form`, `field`                          |
| `src/FormModal/index.mdx`                                          | Compose          | Dialog containing Form                                                          | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/Freeze/index.mdx`                                             | Compose          | Inert busy surface using Progress or Skeleton                                   | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/Grid/index.mdx`                                               | Foundation       | Grid layout utilities                                                           | Verified — foundation: `patterns/composition-recipes.mdx`      |
| `src/GroupAvatar/index.mdx`                                        | Compose          | Avatar Group                                                                    | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/GuideCard/index.mdx`                                          | Adapt            | Resource Card                                                                   | Verified — component: `resource-card`                          |
| `src/Header/index.mdx`                                             | Adapt            | Workspace Header and App Page identity                                          | Verified — component: `workspace-header`, `app-page`           |
| `src/Highlighter/index.mdx`                                        | Direct           | Highlighter and Code Block                                                      | Verified — component: `highlighter`                            |
| `src/Hotkey/index.mdx`                                             | Adapt            | Kbd                                                                             | Verified — component: `kbd`                                    |
| `src/HotkeyInput/index.mdx`                                        | Direct           | Hotkey Input and recording hook                                                 | Verified — component: `hotkey-input`                           |
| `src/HtmlPreview/index.mdx`                                        | Adapt            | Device Simulator preview and sandboxed frame                                    | Verified — component: `device-simulator`                       |
| `src/Icon/index.mdx`                                               | Direct           | Icon                                                                            | Verified — component: `icon`                                   |
| `src/Image/index.mdx`                                              | Adapt            | Image and Image Viewer                                                          | Verified — component: `image`, `image-viewer`                  |
| `src/ImageSelect/index.mdx`                                        | Direct           | Image Select                                                                    | Verified — component: `image-select`                           |
| `src/Input/index.mdx`                                              | Direct           | Input, Textarea, Native Select, and number/password variants                    | Verified — component: `input`, `textarea`, `native-select`     |
| `src/Layout/index.mdx`                                             | Adapt            | App Shell, App Page, and layout regions                                         | Verified — component: `app-shell`, `app-page`                  |
| `src/List/index.mdx`                                               | Adapt            | Item and semantic List composition                                              | Verified — component: `item`                                   |
| `src/Markdown/index.mdx`                                           | Direct           | Markdown Surface with renderer slots                                            | Verified — component: `markdown-surface`                       |
| `src/MaskShadow/index.mdx`                                         | Compose          | Scroll Area edge shadows                                                        | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/MaterialFileTypeIcon/index.mdx`                               | Host integration | File Type Icon with host icon registry                                          | Verified — integration: `patterns/host-integrations.mdx`       |
| `src/Menu/index.mdx`                                               | Compose          | Dropdown Menu, Context Menu, or Command by task                                 | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/Mermaid/index.mdx`                                            | Host integration | Markdown diagram renderer inside a Diagram Surface                              | Verified — integration: `patterns/host-integrations.mdx`       |
| `src/Modal/index.mdx`                                              | Adapt            | Dialog and Alert Dialog                                                         | Verified — component: `dialog`, `alert-dialog`                 |
| `src/MotionProvider/index.mdx`                                     | Foundation       | Motion tokens, reduced-motion policy, and adapter context                       | Verified — foundation: `foundations/runtime-configuration.mdx` |
| `src/NeuralNetworkLoading/index.mdx`                               | Compose          | Spinner, Skeleton, Progress, or Brand Loading by information need               | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/ScrollArea/index.mdx`                                         | Direct           | Scroll Area                                                                     | Verified — component: `scroll-area`                            |
| `src/ScrollShadow/index.mdx`                                       | Compose          | Scroll Area with edge shadows                                                   | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/SearchBar/index.mdx`                                          | Adapt            | Filter Bar or Combobox by search scope                                          | Verified — component: `filter-bar`, `combobox`                 |
| `src/Segmented/index.mdx`                                          | Compose          | Tabs or Button Group with single-selection semantics                            | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/Select/index.mdx`                                             | Direct           | Select and Native Select                                                        | Verified — component: `select`, `native-select`                |
| `src/SideNav/index.mdx`                                            | Adapt            | Sidebar and Activity Bar                                                        | Verified — component: `sidebar`, `activity-bar`                |
| `src/Skeleton/index.mdx`                                           | Direct           | Skeleton                                                                        | Verified — component: `skeleton`                               |
| `src/SliderWithInput/index.mdx`                                    | Compose          | Slider with Input Group                                                         | Verified — composition: `patterns/composition-recipes.mdx`     |
| `src/Snippet/inde…1731 tokens truncated…i/FloatingSheet/index.mdx` | Adapt            | Floating Panel responsive sheet presentation; snap persistence stays host-owned | Verified — component: `floating-panel`                         |
| `src/SortableList/index.mdx`                                       | Direct           | Sortable List with pointer and keyboard reordering                              | Verified — component: `sortable-list`                          |
| `src/Tabs/index.mdx`                                               | Direct           | Tabs                                                                            | Verified — component: `tabs`                                   |
| `src/Tag/index.mdx`                                                | Adapt            | Badge for annotation and Status Badge for state                                 | Verified — component: `badge`, `status-badge`                  |
| `src/Text/index.mdx`                                               | Foundation       | Typography utilities and semantic text roles                                    | Verified — foundation: `foundations/typography.mdx`            |
| `src/ThemeProvider/index.mdx`                                      | Foundation       | Theme tokens, runtime bridge, and framework contexts                            | Verified — foundation: `foundations/runtime-configuration.mdx` |
| `src/ThemeSwitch/index.mdx`                                        | Direct           | Theme Switcher                                                                  | Verified — component: `theme-switcher`                         |
| `src/Toc/index.mdx`                                                | Direct           | Table of Contents                                                               | Verified — component: `table-of-contents`                      |
| `src/Video/index.mdx`                                              | Compose          | Native Video inside Media Surface                                               | Verified — composition: `patterns/composition-recipes.mdx`     |

## Awesome

| Reference source                             | Decision         | A3S target                                   | Current state                                               |
| -------------------------------------------- | ---------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `src/awesome/AuroraBackground/index.mdx`     | Compose          | Optional Ambient Background pattern          | Verified — composition: `patterns/landmarks-and-mobile.mdx` |
| `src/awesome/BottomGradientButton/index.mdx` | Compose          | Branded Button variant                       | Verified — composition: `patterns/landmarks-and-mobile.mdx` |
| `src/awesome/Features/index.mdx`             | Compose          | Semantic feature list using Item             | Verified — composition: `patterns/landmarks-and-mobile.mdx` |
| `src/awesome/Giscus/index.mdx`               | Host integration | Comment service slot                         | Verified — integration: `patterns/host-integrations.mdx`    |
| `src/awesome/GradientButton/index.mdx`       | Compose          | Branded Button variant                       | Verified — composition: `patterns/landmarks-and-mobile.mdx` |
| `src/awesome/GridBackground/index.mdx`       | Compose          | Optional subject-specific background pattern | Verified — composition: `patterns/landmarks-and-mobile.mdx` |
| `src/awesome/Hero/index.mdx`                 | Compose          | Documentation Home or App Page landmark      | Verified — composition: `patterns/landmarks-and-mobile.mdx` |
| `src/awesome/Spotlight/index.mdx`            | Host integration | Optional pointer spotlight behavior          | Verified — integration: `patterns/host-integrations.mdx`    |
| `src/awesome/SpotlightCard/index.mdx`        | Compose          | Card plus optional spotlight behavior        | Verified — composition: `patterns/landmarks-and-mobile.mdx` |
| `src/awesome/TypewriterEffect/index.mdx`     | Adapt            | Streaming Text status pattern                | Verified — component: `streaming-text`                      |

## Base UI

| Reference source                      | Decision | A3S target                                                                      | Current state                                              |
| ------------------------------------- | -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/base-ui/Button/index.mdx`        | Direct   | Button                                                                          | Verified — component: `button`                             |
| `src/base-ui/ContextMenu/index.mdx`   | Direct   | Context Menu                                                                    | Verified — component: `context-menu`                       |
| `src/base-ui/Drawer/index.mdx`        | Direct   | Drawer                                                                          | Verified — component: `drawer`                             |
| `src/base-ui/DropdownMenu/index.mdx`  | Direct   | Dropdown Menu                                                                   | Verified — component: `dropdown-menu`                      |
| `src/base-ui/FloatingPanel/index.mdx` | Adapt    | Floating Panel for non-blocking auxiliary work                                  | Verified — component: `floating-panel`                     |
| `src/base-ui/FloatingSheet/index.mdx` | Adapt    | Floating Panel responsive sheet presentation; snap persistence stays host-owned | Verified — component: `floating-panel`                     |
| `src/base-ui/Modal/index.mdx`         | Adapt    | Dialog and Alert Dialog                                                         | Verified — component: `dialog`, `alert-dialog`             |
| `src/base-ui/Popover/index.mdx`       | Direct   | Popover                                                                         | Verified — component: `popover`                            |
| `src/base-ui/Radio/index.mdx`         | Direct   | Radio Group                                                                     | Verified — component: `radio-group`                        |
| `src/base-ui/ScrollArea/index.mdx`    | Direct   | Scroll Area                                                                     | Verified — component: `scroll-area`                        |
| `src/base-ui/Segmented/index.mdx`     | Compose  | Tabs or single-select Button Group                                              | Verified — composition: `patterns/composition-recipes.mdx` |
| `src/base-ui/Select/index.mdx`        | Direct   | Select                                                                          | Verified — component: `select`                             |
| `src/base-ui/Switch/index.mdx`        | Direct   | Switch                                                                          | Verified — component: `switch`                             |
| `src/base-ui/Tabs/index.mdx`          | Direct   | Tabs                                                                            | Verified — component: `tabs`                               |
| `src/base-ui/Toast/index.mdx`         | Direct   | Toast                                                                           | Verified — component: `toast`                              |
| `src/base-ui/Tooltip/index.mdx`       | Direct   | Tooltip                                                                         | Verified — component: `tooltip`                            |

## Brand

| Reference source                   | Decision         | A3S target                                                  | Current state                                                                        |
| ---------------------------------- | ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/brand/BrandLoading/index.mdx` | Brand substitute | A3S Brand Lockup with bounded loading status                | Verified — brand: `components/brand-lockup.mdx`, `patterns/landmarks-and-mobile.mdx` |
| `src/brand/LobeChat/index.mdx`     | Brand substitute | A3S Brand Lockup using official OS logo                     | Verified — brand: `components/brand-lockup.mdx`, `patterns/landmarks-and-mobile.mdx` |
| `src/brand/LobeChatText/index.mdx` | Brand substitute | A3S Brand Lockup text treatment                             | Verified — brand: `components/brand-lockup.mdx`, `patterns/landmarks-and-mobile.mdx` |
| `src/brand/LobeHub/index.mdx`      | Brand substitute | A3S Brand Lockup using official OS logo                     | Verified — brand: `components/brand-lockup.mdx`, `patterns/landmarks-and-mobile.mdx` |
| `src/brand/LobeHubText/index.mdx`  | Brand substitute | A3S Brand Lockup text treatment                             | Verified — brand: `components/brand-lockup.mdx`, `patterns/landmarks-and-mobile.mdx` |
| `src/brand/Logo3d/index.mdx`       | Brand substitute | Official A3S OS logo; no fabricated 3D mark                 | Verified — brand: `components/brand-lockup.mdx`, `patterns/landmarks-and-mobile.mdx` |
| `src/brand/LogoFlat/index.mdx`     | Brand substitute | Official A3S OS logo flat presentation                      | Verified — brand: `components/brand-lockup.mdx`, `patterns/landmarks-and-mobile.mdx` |
| `src/brand/LogoMono/index.mdx`     | Brand substitute | Official A3S OS logo monochrome presentation                | Verified — brand: `components/brand-lockup.mdx`, `patterns/landmarks-and-mobile.mdx` |
| `src/brand/LogoThree/index.mdx`    | Brand substitute | Official A3S OS logo; animation remains optional host media | Verified — brand: `components/brand-lockup.mdx`, `patterns/landmarks-and-mobile.mdx` |

## Chat

| Reference source                         | Decision | A3S target                                | Current state                                              |
| ---------------------------------------- | -------- | ----------------------------------------- | ---------------------------------------------------------- |
| `src/chat/BackBottom/index.mdx`          | Direct   | Back to Bottom with unread state          | Verified — component: `back-to-bottom`                     |
| `src/chat/ChatHeader/index.mdx`          | Adapt    | Workspace Header                          | Verified — component: `workspace-header`                   |
| `src/chat/ChatInputArea/index.mdx`       | Adapt    | Agent Composer                            | Verified — component: `agent-composer`                     |
| `src/chat/ChatItem/index.mdx`            | Adapt    | Agent Transcript turn composition         | Verified — component: `agent-transcript`                   |
| `src/chat/ChatList/index.mdx`            | Adapt    | Agent Transcript                          | Verified — component: `agent-transcript`                   |
| `src/chat/EditableMessage/index.mdx`     | Compose  | Editable Text inside a transcript turn    | Verified — composition: `patterns/composition-recipes.mdx` |
| `src/chat/EditableMessageList/index.mdx` | Compose  | Agent Transcript with editable turn state | Verified — composition: `patterns/composition-recipes.mdx` |
| `src/chat/LoadingDots/index.mdx`         | Compose  | Message Status or Spinner                 | Verified — composition: `patterns/composition-recipes.mdx` |
| `src/chat/MessageInput/index.mdx`        | Adapt    | Agent Composer or Textarea by scope       | Verified — component: `agent-composer`, `textarea`         |
| `src/chat/MessageModal/index.mdx`        | Compose  | Dialog with Editable Text                 | Verified — composition: `patterns/composition-recipes.mdx` |
| `src/chat/TokenTag/index.mdx`            | Compose  | Status Badge plus Progress                | Verified — composition: `patterns/composition-recipes.mdx` |

## Color

| Reference source                  | Decision   | A3S target                            | Current state                                  |
| --------------------------------- | ---------- | ------------------------------------- | ---------------------------------------------- |
| `src/color/ColorScales/index.mdx` | Foundation | A3S semantic and neutral color scales | Verified — foundation: `foundations/color.mdx` |
| `src/color/CssVar/index.mdx`      | Foundation | CSS custom-property contract          | Verified — foundation: `foundations/color.mdx` |

## Hooks and providers

| Reference source     | Decision   | A3S target                                                            | Current state                                                  |
| -------------------- | ---------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/i18n/index.mdx` | Foundation | Locale resources, direction contract, and React/Vue translation hooks | Verified — foundation: `foundations/runtime-configuration.mdx` |

## Icons

Provider identity is host data. Every provider row is deliberately covered by the same generic slot rather than copied into A3S UI.

| Reference source                     | Decision         | A3S target                                   | Current state                                            |
| ------------------------------------ | ---------------- | -------------------------------------------- | -------------------------------------------------------- |
| `src/icons/Auth0/index.mdx`          | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Authelia/index.mdx`       | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Authentik/index.mdx`      | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Casdoor/index.mdx`        | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Clerk/index.mdx`          | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Cloudflare/index.mdx`     | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/DingTalk/index.mdx`       | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Discord/index.mdx`        | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Github/index.mdx`         | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/GoogleChat/index.mdx`     | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/IMessage/index.mdx`       | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Lark/index.mdx`           | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Line/index.mdx`           | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Logto/index.mdx`          | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/MicrosoftEntra/index.mdx` | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/MicrosoftTeams/index.mdx` | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/NextAuth/index.mdx`       | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/QQ/index.mdx`             | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Slack/index.mdx`          | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Telegram/index.mdx`       | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/WeChat/index.mdx`         | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/WhatsApp/index.mdx`       | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/Zitadel/index.mdx`        | Host integration | Icon or Brand Lockup provider slot           | Verified — integration: `patterns/host-integrations.mdx` |
| `src/icons/lucideExtra/index.mdx`    | Host integration | Icon contract with host-provided outline set | Verified — integration: `patterns/host-integrations.mdx` |

## MDX

| Reference source                  | Decision         | A3S target                                       | Current state                                              |
| --------------------------------- | ---------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `src/mdx/Callout/index.mdx`       | Adapt            | Documentation Callout backed by Alert semantics  | Verified — component: `alert`                              |
| `src/mdx/Cards/index.mdx`         | Compose          | Card and Resource Card documentation composition | Verified — composition: `patterns/composition-recipes.mdx` |
| `src/mdx/FileTree/index.mdx`      | Adapt            | File Explorer or Tree by interaction need        | Verified — component: `file-explorer`, `tree`              |
| `src/mdx/Mdx/index.mdx`           | Adapt            | Markdown Surface and Rspress MDX renderer        | Verified — component: `markdown-surface`                   |
| `src/mdx/Steps/index.mdx`         | Adapt            | Stepper and documentation Steps                  | Verified — component: `stepper`                            |
| `src/mdx/Tabs/index.mdx`          | Adapt            | Tabs and documentation Code Group                | Verified — component: `tabs`                               |
| `src/mdx/mdxComponents/index.mdx` | Host integration | Explicit Markdown renderer registry              | Verified — integration: `patterns/host-integrations.mdx`   |

## Mobile

| Reference source                     | Decision   | A3S target                                      | Current state                                             |
| ------------------------------------ | ---------- | ----------------------------------------------- | --------------------------------------------------------- |
| `src/mobile/ChatHeader/index.mdx`    | Adapt      | Responsive Workspace Header                     | Verified — component: `workspace-header`                  |
| `src/mobile/ChatInputArea/index.mdx` | Adapt      | Responsive Agent Composer                       | Verified — component: `agent-composer`                    |
| `src/mobile/SafeArea/index.mdx`      | Foundation | Safe-area spacing utilities and Composer policy | Verified — foundation: `patterns/composition-recipes.mdx` |
| `src/mobile/TabBar/index.mdx`        | Adapt      | Mobile Tabs or Activity Bar                     | Verified — component: `tabs`, `activity-bar`              |

## StoryBook

| Reference source                    | Decision | A3S target                                 | Current state                                    |
| ----------------------------------- | -------- | ------------------------------------------ | ------------------------------------------------ |
| `src/storybook/StoryBook/index.mdx` | Adapt    | Standalone Playground and Theme Customizer | Verified — route: `site/pages/playground.zh.mdx` |

## Completion gates

The reference objective is not complete until all of the following are true:

1. A verifier confirms exactly 160 unique source rows with the pinned section counts and no unmapped or `TBD` decisions.
2. Every `Add`, `Partial`, `docs gap`, and `redesign` state above is resolved or replaced by stronger evidence.
3. Every Direct or Adapt target has source, export, manifest, bilingual docs, framework usage, applicable hooks, and tests.
4. Every Compose, Foundation, Brand substitute, or Host integration target has a truthful documented example and tested ownership boundary.
5. All A3S component visuals and states conform to `DESIGN.md` in light, dark, narrow, RTL, reduced-motion, and keyboard use.
6. The standalone Playground demonstrates application-scale combinations without entering the documentation hierarchy.
