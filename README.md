# template-bun-whatsapp

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.js
```

This project was created using `bun init` in bun v1.1.22. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

Installation on no-gui systems
If you want to install whatsapp-web.js on a system without a GUI, such as a linux server image, and you need puppeteer to emulate the Chromium browser, there are a few additional steps you'll need to take.

First, you'll need to install dependencies required by puppeteer, such as the necessary libraries and tools for running a headless Chromium browser.

```
sudo apt install -y gconf-service libgbm-dev libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

After installing these dependencies, you can proceed with installing whatsapp-web.js and puppeteer as usual. When puppeteer installs, it will download a version of Chromium suitable for headless environments.
