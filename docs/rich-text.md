# Rich Text Formatting

Lightning 3 Renderer supports inline BB-code style markup for styling runs of
text within a single text node. Bold, italic, underline, strikethrough, and
per-span color can all be combined freely without creating multiple nodes.

## Quick Start

```ts
const node = renderer.createTextNode({
  fontFamily: 'MyFont',
  fontSize: 48,
  color: 0xffffffff,
  richText: true,
  text: 'Normal [b]bold[/b] [i]italic[/i] [color=0xff0000ff]red[/color]',
  parent: root,
});
```

Set `richText: true` on any text node to enable BB-code parsing. The `text`
property is otherwise unchanged — raw text without tags renders identically to
`richText: false`.

## Supported Tags

| Tag                  | Closing tag | Effect        |
| -------------------- | ----------- | ------------- |
| `[b]`                | `[/b]`      | Bold          |
| `[i]`                | `[/i]`      | Italic        |
| `[u]`                | `[/u]`      | Underline     |
| `[s]`                | `[/s]`      | Strikethrough |
| `[color=0xRRGGBBAA]` | `[/color]`  | Inline color  |

All tag names are lowercase. Tags are nestable and may be combined freely.

## Tag Reference

### Bold `[b]…[/b]`

```
[b]Bold text[/b]
Normal [b]bold word[/b] normal
```

**Canvas renderer** — applies the `bold` CSS font keyword; a bold font face
must be available in the browser or it falls back to synthetic bold.

**SDF renderer** — lowers the SDF threshold by 0.05 (expanding glyph edges),
producing fake bold without a separate font atlas.

---

### Italic `[i]…[/i]`

```
[i]Italic text[/i]
Normal [i]italic word[/i] normal
```

**Canvas renderer** — applies the `italic` CSS font keyword; a separate italic
font face is used when available, otherwise the browser synthesizes one.

**SDF renderer** — applies a horizontal vertex shear of tan(14°) ≈ 0.249 per
design unit relative to the alphabetic baseline, producing fake italic without
a separate font atlas.

---

### Underline `[u]…[/u]`

```
[u]Underlined text[/u]
Click [u]here[/u] to continue
```

Draws a solid line below the text. The line color inherits the span's active
color (or the node's `color` if no `[color]` tag is in effect).

- **Thickness** — `max(1, round(fontSize / 20))` pixels
- **Position** — 10% of `fontSize` below the alphabetic baseline

---

### Strikethrough `[s]…[/s]`

```
[s]Deleted text[/s]
Was $99 now [s]$99[/s] $49
```

Draws a solid line through the vertical midpoint of lowercase letters.

- **Thickness** — same as underline
- **Position** — 75% of the font's base value from the line top, approximating
  the x-height midpoint

---

### Color `[color=0xRRGGBBAA]…[/color]`

```
[color=0xff0000ff]Opaque red[/color]
[color=0x00ff00ff]Green[/color]
[color=0xff000080]50% alpha red[/color]
```

The color value **must** be a `0xRRGGBBAA` hexadecimal literal (8 hex digits
after the `0x` prefix). Other formats — CSS `#rrggbb`, named colors such as
`red` — are not recognised and are emitted as literal text.

The alpha channel is fully respected: `0xRRGGBBAA` with `AA = 80` renders at
50% opacity relative to the node's `worldAlpha`.

---

## Combining Tags

Tags may be freely nested. All combinations produce a single span with the
union of the active styles.

```
[b][i]Bold and italic[/i][/b]
[color=0xff0000ff][b]Red bold[/b][/color]
[i][u]Italic underline[/u][/i]
Plain [color=0x00aaffff][b][i][u]all styles[/u][/i][/b][/color] plain
```

Mis-nested closing tags are handled gracefully: `[/b]` inside `[b][i]…`
implicitly closes the italic span before closing bold, leaving the remainder of
the string unstyled.

```
[b][i]AB[/b]C   →  "AB" is bold+italic, "C" is plain
```

---

## Syntax Rules

- Tags are **case-sensitive** and must be lowercase (`[b]`, not `[B]`).
- Unrecognised or malformed tags (e.g. `[xyz]`, `[color=#ff0000]`) are emitted
  as literal text and do not affect other spans.
- An unclosed opening tag applies its style to the end of the string.
- A closing tag with no matching open tag is silently ignored.
- Tags produce no visible text themselves; only the characters between tags
  appear in the output.

---

## Renderer Differences

| Feature       | Canvas renderer                                            | SDF renderer                                     |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| Bold          | CSS `bold` keyword — uses bold font face if registered     | SDF threshold shift — fake bold, no extra atlas  |
| Italic        | CSS `italic` keyword — uses italic font face if registered | Vertex shear (14°) — fake italic, no extra atlas |
| Underline     | Canvas `fillRect` below baseline                           | Decoration quad appended after glyph quads       |
| Strikethrough | Canvas `fillRect` at x-height                              | Decoration quad appended after glyph quads       |
| Color         | `ctx.fillStyle` per span                                   | Per-vertex packed RGBA attribute                 |

For the Canvas renderer, **bold and italic require the corresponding font faces
to be loaded** under names the browser can resolve (e.g. via `font-weight: bold`
or `font-style: italic` in the `@font-face` rule). If no matching face is
available, the browser synthesizes the style, which may look different from
a genuine bold or italic cut.

For the SDF renderer, bold and italic are always available regardless of which
atlases are loaded, but they are synthetic approximations rather than true
typographic variants.

---

## Performance

- Parsing is O(n) in text length with zero heap allocation in the hot path
  (spans and stack frames are reused from pre-allocated pools).
- The `richText: false` path is completely unchanged; enabling `richText` on a
  node does not affect other nodes.
- SDF rendering allocates one `Float32Array` per layout cache entry (shared
  across frames). Decoration quads are appended after glyph quads in the same
  buffer — no extra draw call.
- The layout result is cached by a cache key derived from all text properties.
  Changing `text` or any layout-affecting property invalidates the cache entry.

---

## Limitations

- **Color format** — only `0xRRGGBBAA` 8-digit hex literals are accepted.
  CSS color strings and named colors are app-level concerns and are not
  supported inside `[color=…]`.
- **Maximum spans** — up to 64 styled spans per text node (configurable via
  `MAX_SPANS` in `RichTextParser.ts`). Spans beyond this limit are merged into
  the previous span.
- **Layout wrapping** — the text layout engine measures widths using the
  stripped (tag-free) text. Bold characters are slightly wider than their
  normal counterparts; the Canvas renderer adjusts per-span, but the SDF
  renderer uses the same atlas metrics for both weights, so wrapping may be
  off by a few pixels at the bold/normal transition.
- **SDF bold vs. Canvas bold** — SDF bold is a threshold shift, not a true
  heavier stroke. At small font sizes or low distance ranges the effect may be
  less pronounced.
- **Decorations and italic** — underline and strikethrough quads are sheared
  in the SDF renderer to follow the italic lean. In the Canvas renderer,
  underline and strikethrough are drawn as axis-aligned rectangles and do not
  tilt with italic text.

---

## See Also

- [Font Loading](./FONTS.md) — how to load Canvas and SDF font faces
- [Getting Started](./GETTING-STARTED.md) — creating text nodes
- [`TrProps.richText`](../src/core/text-rendering/TextRenderer.ts) — TypeScript API reference
- [`RichTextParser`](../src/core/text-rendering/RichTextParser.ts) — parser implementation
