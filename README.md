# How Machines Make Better Guesses

An interactive Quarto/Reveal.js presentation about reasoning under uncertainty.

## View locally

Open `The Machine Mindset.html` directly, or serve this folder with any static web server and open `index.html`.

## Publish with GitHub Pages

The workflow in `.github/workflows/pages.yml` renders `The Machine Mindset.qmd` and publishes the result whenever `main` is pushed. In the GitHub repository, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions** once. Future pushes to `main` will render and deploy automatically.

The published address is:

<https://crumboe.github.io/CyberExplainKalman/>

## Presenting

Press **S** during the talk to open speaker notes. Every slide has a script, a time estimate, and the question to ask the class.

**Before class:** draw a long number line on the board for the "be the sensor" activity and have rulers or tape measures ready. Students need phones to scan the QR code for the "Beat the filter" game.

| Section | Slides | Time |
| --- | --- | --- |
| Hook: GPS tunnel, real-world uses, cart vote | 2–4 | ~5 min |
| Hidden bag + free-throw probability | 5–10 | ~12 min |
| Measuring noise, bar charts, humps, the reveal | 11–17 | ~13 min |
| Seesaw, trust dial, spread score, "You try" | 18–22 | ~10 min |
| Four-step loop, "Beat the filter" game | 23–28 | ~10 min |
| Robot demo and wrap-up | 29–30 | ~6 min |

That is about 55 minutes in total. **For a 40-minute period,** skip the spread-score slide, the four-step loop, and the "You try" challenge problem, and shorten the measuring activity to a quick show of hands.

Slides after "What to remember" are optional:

- **Extension:** two-sensor cart, two-camera robot, camera comparison, calibration.
- **Backup math:** "or", "neither", reversing the question, Bayes' rule.

Colors mean the same thing in every Kalman demo: **green** = motion guess, **blue** = sensor or camera, **orange** = updated guess, **gray/white** = the real position.

## Update the presentation

Edit `The Machine Mindset.qmd`, then render it locally with:

```powershell
quarto render "The Machine Mindset.qmd"
```

Commit and push the source. GitHub Actions performs a fresh render before each deployment, so the hosted presentation always reflects the `.qmd` file.
