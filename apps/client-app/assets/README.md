# Mobile assets (icons / splash)

Place source art here, then run:

```bash
pnpm update-assets
```

Required for `@capacitor/assets`:

| File                         | Notes                |
| ---------------------------- | -------------------- |
| `icon.png`                   | 1024×1024 app icon   |
| `splash.png`                 | Light splash         |
| `splash-dark.png`            | Optional dark splash |
| `logo.png` / `logo-dark.png` | Optional             |

Do not commit generated native resources unless intentionally refreshing store assets.
