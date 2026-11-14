"# park_pilot" 

Vanilla HTML/CSS/JS parking lot system. No build step.

## Run
Open `index.html` in a browser, or use the VS Code Live Server extension.

## Files
- `index.html` page structure
- `style.css` blue theme, light and dark mode
- `app.js` lot state, allocation with mutex, gates, mock payments, admin login

## Notes
- Staff password: `admin123` (see `login()` in `app.js`)
- Rates are in `rates` at the top of `app.js`
- State is in memory, a refresh resets the lot
