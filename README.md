# Image Processing Lab – interactive site

A small website for the Image Processing lab (2nd year). Students learn the first labs, histograms,
point operations and binarization by playing with images and Python/OpenCV code.

Plain HTML, CSS and JavaScript. No frameworks, no build step, no server, no external libraries,
no tracking. It works on GitHub Pages and when `index.html` is opened straight from the folder.

## Publish on GitHub Pages

1. Push this folder to a GitHub repository.
2. Settings → Pages → "Deploy from a branch" → choose the branch and the `/ (root)` folder.

## Files

```
index.html            home page
grid.html             1. The image as a grid of numbers (labs 1–2)
color.html            2. Color and grayscale (lab 3)
quantization.html     3. Quantization and dithering (lab 3)
histograms.html       4. Histograms
pointops.html         5. Point operations (lecture 4)
binarization.html     6. Binarization (lab: histograms and binarization)
glossary.html         Glossary (built from js/glossary-data.js)

css/style.css         all styles; light and dark colors are variables at the top
js/core.js            header, image loading, image operations, code blocks, pop-ups, expected values
js/games.js           the 7 reusable game types
js/glossary-data.js   every term: short text for the pop-up, page where it is explained
js/test-image.js      landscape.png as text (generated, do not edit)
js/pages/*.js         the demos and games of each section

images/landscape.png  the test image used by the site and the Python exercises
tools/make_test_image.py   draws landscape.png and regenerates js/test-image.js
tools/check_expected.py    prints what every exercise solution prints (to check the site)
```

## How things fit together

- **Same numbers as Python.** Every operation in `js/core.js` copies the Python line it stands for
  (the line is in the comment above it). `cv2.cvtColor(..., COLOR_BGR2GRAY)` uses OpenCV's exact
  whole-number formula, checked against OpenCV for all 16.7 million colors. Rounding follows NumPy
  (halves go to the even number).
- **Expected values are computed live** by the site, for the test image and for an uploaded photo.
  To double-check them against real Python, run (needs numpy and opencv-python):

  ```
  cd images
  python ../tools/check_expected.py              # test image
  python ../tools/check_expected.py my_photo.png # a photo saved with "Save my photo as PNG"
  ```

- **Photos** are shrunk to at most 480 px per side, kept in `sessionStorage` for the open tab, and
  never leave the browser. "Save my photo as PNG" downloads exactly those pixels, so Python gets
  the same numbers.
- **The test image is embedded** in `js/test-image.js` because browsers block reading pixels from
  image files when a page is opened from the folder (file://). If you change `landscape.png`, run
  `python tools/make_test_image.py` (or re-embed your own PNG the same way).

## Editing

- **Look:** light theme only, four colors (text, muted gray, blue accent, red for mistakes), set at the top of `css/style.css`. Every topic page has four `<section class="part">` blocks (Theory, Demo, Code, No code); `buildLayout()` in `js/core.js` turns them into tabs and sidebar links.
- **Text** is plain HTML in each page. Underline a glossary word with
  `<span class="term" data-term="pixel">pixels</span>`; the id must exist in `js/glossary-data.js`.
- **New glossary term:** add an entry to `js/glossary-data.js`; the glossary page and pop-ups update by themselves.
- **Code blocks:** `<div class="code"><pre>...</pre></div>` gets colors and a Copy button automatically
  (write `<` as `&lt;` inside HTML).
- **Quick questions:** copy a `<div class="quiz">` block; mark the right button with `data-correct`.
- **Games:** see the comment at the top of `js/games.js`; each section's `js/pages/*.js` shows examples.
