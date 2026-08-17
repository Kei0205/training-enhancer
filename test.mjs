import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  page.on('response', response => {
    if (!response.ok()) {
      console.log('RESPONSE FAILED:', response.url(), response.status());
    }
  });

  console.log('Navigating to Vercel app...');
  await page.goto('https://training-enhancer.vercel.app', { waitUntil: 'networkidle0' });
  
  // Wait for React to render
  await page.waitForSelector('#root > *', { timeout: 5000 }).catch(e => console.log('Root is empty!'));
  
  console.log('Page title:', await page.title());
  
  const rootHTML = await page.$eval('#root', el => el.innerHTML);
  console.log('Root HTML:', rootHTML.substring(0, 200));
  
  await browser.close();
})();
