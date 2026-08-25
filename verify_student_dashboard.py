import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # Wait until the page loads
        await page.goto('http://localhost:3000/')
        # Click Start Test button
        await page.click('button:has-text("Testni Boshlash")')
        await page.wait_for_selector('input[placeholder*="Ismingizni"]')
        # Enter a test name
        await page.fill('input[placeholder*="Ismingizni"]', 'Test Student')
        await page.click('button:has-text("Keyingi")')

        # Navigate to summary manually to test the 'Mening Natijalarim' button
        await page.goto('http://localhost:3000/summary')
        await page.wait_for_timeout(1000)

        # Click on "Mening Natijalarim"
        await page.click('button:has-text("Mening Natijalarim")')

        # Take a screenshot of the dashboard
        await page.wait_for_timeout(2000)
        await page.screenshot(path='/home/jules/verification/student_dashboard2.png', full_page=True)
        print("Screenshot saved to /home/jules/verification/student_dashboard2.png")
        await browser.close()

asyncio.run(main())
