# Public Assets

This directory contains static assets for the admin web panel.

## Directory Structure

```
assets/
├── css/
│   ├── main.css           # Tailwind CSS source file
│   ├── dist.css           # Compiled CSS (generated)
│   └── main.css.map       # Source map (generated)
├── js/
│   └── main.js            # Custom JavaScript (optional)
├── images/
│   └── favicon.ico        # Site favicon
└── fonts/                 # Custom fonts (if needed)
```

## Building CSS

### Development
```bash
npm run watch:css
```

### Production
```bash
npm run build:css
```

## CSS Customization

Edit `css/main.css` to customize:
- Tailwind directives
- Custom component styles
- Utility classes

The compiled output will be in `css/dist.css`.
