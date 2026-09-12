const path = require('path');

exports.config = {
    runner: 'local',
    
    specs: [
        './e2e/tests/**/*.test.js',
    ],
    
    maxInstances: 1,
    
    capabilities: [{
        maxInstances: 1,
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
    }],
    
    logLevel: 'warn',
    bail: 0,
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },
    
    reporters: ['spec'],
    before: function (capabilities, specs) {
        browser.overwriteCommand('click', async function (origClickFunction) {
            try {
                await origClickFunction();
            } catch (err) {
                if (err.message.includes('not clickable') || err.message.includes('intercepted') || err.message.includes('obstructed')) {
                    await browser.execute("arguments[0].click();", this);
                } else {
                    throw err;
                }
            }
        }, true);
    },
    
    afterTest: async function(test, context, { error, result, duration, passed, retries }) {
        if (!passed) {
            browser.takeScreenshot();
        }
    },
};
