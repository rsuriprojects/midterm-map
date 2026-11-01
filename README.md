# 2026 Midterm Map

Interactive map of the November 3, 2026 Senate and governor races. Hover or tap a state for the matchup, rating and latest polling.

Live site: https://rsuriprojects.github.io/midterm-map/

## Updating

All race data lives in `data.js`. To show results on election night, add a `result` to a race:

```js
TX: { ..., result: { d: 50.4, r: 48.1, reporting: 72, called: null } }
```

States with votes counted are colored by who leads, and called races turn solid. The seat totals update on their own.

Ratings: Cook Political Report. Map shapes: [us-atlas](https://github.com/topojson/us-atlas).
