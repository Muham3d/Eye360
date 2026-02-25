# Web Interface (Admin Panel)

## Overview

This directory contains the admin web panel for PatrolManager, built with EJS templates and Tailwind CSS.

## Directory Structure

```
web/
├── config/
│   └── ejs.js                    # EJS configuration and helpers
├── views/
│   ├── layouts/
│   │   ├── base.ejs              # Main layout template
│   │   └── auth.ejs              # Authentication layout
│   ├── components/
│   │   └── navigation.ejs        # Navigation component
│   ├── auth/
│   │   └── login.ejs             # Login page
│   ├── dashboard/
│   │   └── index.ejs             # Dashboard page
│   ├── users/                    # User management views
│   ├── sites/                    # Site management views
│   ├── patrols/                  # Patrol management views
│   └── incidents/                # Incident reporting views
└── public/
    └── assets/
        ├── css/
        │   ├── main.css           # Tailwind CSS source
        │   └── dist.css           # Compiled CSS
        ├── js/                    # Custom JavaScript
        └── images/                # Static images
```

## Design System

### Colors

| Color      | Hex     | Usage                          |
|------------|---------|--------------------------------|
| Primary    | #2563eb | Main brand color, CTAs         |
| Secondary  | #64748b | Text, borders, backgrounds     |
| Success    | #22c55e | Success states, confirmations  |
| Warning    | #eab308 | Warnings, pending states       |
| Error      | #ef4444 | Errors, destructive actions    |

### Typography

- **Font Family**: Inter (with fallbacks to system fonts)
- **Weights**: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semi-bold), 700 (Bold)
- **Sizes**: XS (0.75rem), SM (0.875rem), Base (1rem), LG (1.125rem), XL (1.25rem), etc.

### Components

Pre-built component classes are available in `main.css`:

- `.card` - Card container with shadow
- `.btn`, `.btn-primary`, `.btn-secondary` - Button styles
- `.input`, `.input-label` - Form input styles
- `.badge`, `.badge-primary` - Badge/notification styles
- `.data-table` - Table styles
- `.pagination` - Pagination styles
- `.modal-*` - Modal dialog styles

## Flash Messages

Flash messages are automatically available in all templates:

```ejs
<% if (flash.success) { %>
  <div class="alert alert-success">
    <%= flash.success %>
  </div>
<% } %>
```

### Setting Flash Messages

```javascript
import { setFlashMessage } from '@/interfaces/web/config/ejs.js';

// In a route handler
setFlashMessage(req, 'success', 'Operation completed successfully');
setFlashMessage(req, 'error', 'Something went wrong');
```

## Layouts

### Base Layout (`layouts/base.ejs`)

Standard layout with:
- Navigation bar
- Flash messages
- Footer
- Content area

Usage:
```ejs
<% layout = 'layouts/base' %>
<% title = 'Page Title' %>

<p>Your content here</p>
```

### Auth Layout (`layouts/auth.ejs`)

Centered card layout for:
- Login
- Registration
- Password reset

Usage:
```ejs
<% layout = 'layouts/auth' %>
<% title = 'Sign In' %>
<% subtitle = 'Enter your credentials' %>

<form>...</form>
```

## Navigation

The navigation component automatically highlights the active page based on `currentPath`.

Available navigation items:
- Dashboard (`/`)
- Users (`/users`)
- Sites (`/sites`)
- Patrols (`/patrols`)
- Incidents (`/incidents`)
- Reports (`/reports`)

## Development

### Watching CSS Changes

```bash
npm run watch:css
```

### Building CSS for Production

```bash
npm run build:css
```

### Development Server

```bash
npm run dev
```

The admin panel will be available at `http://localhost:3000`

## Best Practices

1. **Views are presentation only** - No business logic in templates
2. **Use EJS helpers** - Complex formatting should be in helpers
3. **Accessibility first** - Use semantic HTML and ARIA labels
4. **Responsive design** - Mobile-first approach with Tailwind breakpoints
5. **Consistent styling** - Use pre-defined component classes

## Adding New Pages

1. Create a new view file in the appropriate directory
2. Extend the base or auth layout
3. Add the route in the web routes file
4. Update navigation if needed

Example:

```ejs
<% layout = 'layouts/base' %>
<% title = 'New Page' %>

<div class="max-w-7xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold">New Page</h1>
  <!-- Content -->
</div>
```
