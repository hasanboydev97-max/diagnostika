import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # Go straight to StudentDashboard page with a query parameter/path if needed
        # Or mock local storage if the app requires student name

        await page.goto('http://localhost:3000/dashboard')
        await page.wait_for_timeout(3000)

        await page.screenshot(path='/home/jules/verification/student_dashboard_direct.png', full_page=True)
        print("Screenshot saved to /home/jules/verification/student_dashboard_direct.png")
        await browser.close()

asyncio.run(main())
