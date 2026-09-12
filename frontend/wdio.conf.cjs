const path = require('path');

exports.config = {
    runner: 'local',
    
    specs: [
        './e2e/tests/**/*.test.cjs',
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
    
    afterTest: async function(test, context, { error, result, duration, passed, retries }) {
        if (!passed) {
            browser.takeScreenshot();
        }
    },
};
