/**
 * Base E2E Test Utilities
 * Provides common helper functions for E2E testing
 */

/**
 * Wait for an element to be visible
 */
async function waitForElement(selector, timeout = 10000) {
    const element = await $(selector);
    await element.waitForDisplayed({ timeout });
    return element;
}

/**
 * Fill form field with value
 */
async function fillInput(selector, value) {
    const element = await waitForElement(selector);
    await element.clearValue();
    await element.setValue(value);
}

/**
 * Click element and wait for it to be clickable
 */
async function clickElement(selector) {
    const element = await waitForElement(selector);
    await element.waitForClickable();
    await element.click();
}

/**
 * Wait for navigation to a specific URL
 */
async function waitForNavigation(urlPattern, timeout = 10000) {
    await browser.waitUntil(
        async () => {
            const currentUrl = await browser.getUrl();
            return currentUrl.includes(urlPattern);
        },
        { timeout }
    );
}

/**
 * Get current page URL
 */
async function getCurrentUrl() {
    return await browser.getUrl();
}

/**
 * Wait for text to appear in element
 */
async function waitForText(selector, text, timeout = 10000) {
    const element = await $(selector);
    await element.waitForDisplayed({ timeout });
    await browser.waitUntil(
        async () => {
            const elementText = await element.getText();
            return elementText.includes(text);
        },
        { timeout }
    );
}

/**
 * Check if element is visible
 */
async function isElementVisible(selector) {
    try {
        const element = await $(selector);
        return await element.isDisplayed();
    } catch (error) {
        return false;
    }
}

module.exports = {
    waitForElement,
    fillInput,
    clickElement,
    waitForNavigation,
    getCurrentUrl,
    waitForText,
    isElementVisible,
};
