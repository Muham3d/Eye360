# EJS & Tailwind CSS Setup Guide

## Overview

This guide explains the EJS templating and Tailwind CSS setup for the PatrolManager admin panel.

## Installation

The required dependencies are already included in `package.json`:

```json
{
  "dependencies": {
    "ejs": "^3.1.9",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35"
  }
}
```

## Configuration Files

### 1. Tailwind CSS Configuration (`tailwind.config.js`)

Defines the design system:
- Custom color palette (primary, secondary, success, warning, error)
- Typography (Inter font family)
- Spacing, shadows, animations
- Content paths for EJS templates

### 2. PostCSS Configuration (`postcss.config.js`)

Processes CSS with Tailwind and Autoprefixer plugins.

### 3. EJS Configuration (`src/interfaces/web/config/ejs.js`)

Configures EJS view engine and provides helper functions:
- `configureEJS()` - Initialize EJS with Express
- `setFlashMessage()` - Set flash messages
- `renderView()` - Render views with consistent options

## Layouts

### Base Layout (`layouts/base.ejs`)

Standard layout with navigation, flash messages, and footer.

Usage:
```ejs
<% layout = 'layouts/base' %>
<% title = 'Page Title' %>

<div class="max-w-7xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold">My Page</h1>
</div>
```

### Auth Layout (`layouts/auth.ejs`)

Centered card layout for authentication pages.

Usage:
```ejs
<% layout = 'layouts/auth' %>
<% title = 'Sign In' %>
<% subtitle = 'Enter your credentials' %>

<form>...</form>
```

## Components

### Navigation (`components/navigation.ejs`)

Responsive navigation bar with:
- Logo and branding
- Main navigation links
- User menu with dropdown
- Mobile hamburger menu

The navigation automatically highlights the active page.

## Design System

### Colors

```css
/* Primary - Blue */
.text-primary-600  /* #2563eb */
.bg-primary-600    /* #2563eb */

/* Secondary - Slate */
.text-secondary-600  /* #64748b */
.bg-secondary-100    /* #f1f5f9 */

/* Semantic */
.text-success-600  /* #22c55e */
.text-warning-600  /* #eab308 */
.text-error-600    /* #ef4444 */
```

### Typography

```html
<!-- Headings -->
<h1 class="text-2xl font-bold">Heading</h1>

<!-- Body text -->
<p class="text-sm text-secondary-500">Description</p>

<!-- Links -->
<a href="#" class="text-primary-600 hover:text-primary-700">Link</a>
```

### Buttons

```html
<button class="btn btn-primary">Primary Button</button>
<button class="btn btn-secondary">Secondary Button</button>
<button class="btn btn-success">Success Button</button>
<button class="btn btn-error">Delete Button</button>
```

### Forms

```html
<div class="input-group">
  <label for="email" class="input-label">Email</label>
  <input type="email" id="email" class="input" placeholder="you@example.com">
  <p class="input-error">Error message</p>
</div>
```

### Cards

```html
<div class="card">
  <div class="card-header">
    <h2 class="text-lg font-semibold">Card Title</h2>
  </div>
  <div class="card-body">
    <p>Card content goes here...</p>
  </div>
  <div class="card-footer">
    <button class="btn btn-primary">Action</button>
  </div>
</div>
```

### Tables

```html
<div class="table-container">
  <table class="data-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>John Doe</td>
        <td>john@example.com</td>
        <td><span class="badge badge-primary">Admin</span></td>
      </tr>
    </tbody>
  </table>
</div>
```

### Badges

```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Active</span>
<span class="badge badge-warning">Pending</span>
<span class="badge badge-error">Inactive</span>
```

## Flash Messages

### Setting Flash Messages

```javascript
import { setFlashMessage } from '@/interfaces/web/config/ejs.js';

// In route handler
setFlashMessage(req, 'success', 'Operation completed successfully');
setFlashMessage(req, 'error', 'Something went wrong');
setFlashMessage(req, 'warning', 'Please review your input');
setFlashMessage(req, 'info', 'New feature available');
```

### Displaying Flash Messages

Flash messages are automatically available in all templates and displayed by the base layout.

## Creating New Pages

1. Create a new EJS file:

```ejs
<!-- src/interfaces/web/views/users/index.ejs -->
<% title = 'Users - PatrolManager' %>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-secondary-900">Users</h1>
    <a href="/users/new" class="btn btn-primary">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
      </svg>
      Add User
    </a>
  </div>

  <!-- Page content -->
</div>
```

2. Add the route:

```javascript
// src/interfaces/web/routes/index.js
router.get('/users', requireAuth, (req, res) => {
  renderView(res, 'users/index', {
    title: 'Users - PatrolManager',
  });
});
```

## Build Commands

### Development

Watch CSS changes during development:
```bash
npm run watch:css
```

### Production

Build minified CSS for production:
```bash
npm run build:css
```

## Directory Structure

```
backend/
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
└── src/interfaces/web/
    ├── config/
    │   └── ejs.js              # EJS configuration & helpers
    ├── views/
    │   ├── layouts/
    │   │   ├── base.ejs        # Main layout
    │   │   └── auth.ejs        # Auth layout
    │   ├── components/
    │   │   └── navigation.ejs  # Navigation component
    │   ├── auth/
    │   │   └── login.ejs       # Login page
    │   └── dashboard/
    │       └── index.ejs       # Dashboard page
    ├── routes/
    │   └── index.js            # Web routes
    └── public/
        └── assets/
            └── css/
                ├── main.css    # Tailwind source
                └── dist.css    # Compiled output
```

## Best Practices

1. **Use Layouts**: Always extend base or auth layout for consistency
2. **Responsive Design**: Use Tailwind's responsive utilities (`sm:`, `md:`, `lg:`)
3. **Accessibility**: Include proper ARIA labels and semantic HTML
4. **Component Classes**: Use pre-defined component classes from `main.css`
5. **Flash Messages**: Use flash messages for user feedback
6. **Security**: Always sanitize user input in templates

## Testing Locally

1. Start the development server:
```bash
npm run dev
```

2. Access the admin panel:
```
http://localhost:3000
```

3. Login page:
```
http://localhost:3000/login
```

## Troubleshooting

### CSS Not Updating

1. Make sure Tailwind watch process is running: `npm run watch:css`
2. Clear browser cache
3. Check content paths in `tailwind.config.js`

### Layout Not Loading

1. Verify layout path is correct
2. Check EJS is configured in `app.ts`
3. Ensure views directory is set correctly

### Navigation Not Highlighting

1. Verify `currentPath` is set in EJS middleware
2. Check route paths match navigation item paths
