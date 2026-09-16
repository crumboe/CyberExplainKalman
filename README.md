# Probability, Bayes, and Kalman Filter

An interactive Quarto/Reveal.js presentation about reasoning under uncertainty.

## View locally

Open `The Machine Mindset.html` directly, or serve this folder with any static web server and open `index.html`.

## Publish with GitHub Pages

The workflow in `.github/workflows/pages.yml` renders `The Machine Mindset.qmd` and publishes the result whenever `main` is pushed. In the GitHub repository, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions** once. Future pushes to `main` will render and deploy automatically.

The published address is:

<https://crumboe.github.io/CyberExplainKalman/>

## Update the presentation

Edit `The Machine Mindset.qmd`, then render it locally with:

```powershell
quarto render "The Machine Mindset.qmd"
```

Commit and push the source. GitHub Actions performs a fresh render before each deployment, so the hosted presentation always reflects the `.qmd` file.
