const path = require('path');

exports.config = {
    runner: 'local',
    port: 4444,
    
    specs: [
        './e2e/tests/**/*.test.js',
    ],
    
    maxInstances: 1,
    
    capabilities: [{
        maxInstances: 1,
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--no-sandbox', '--disable-dev-shm-usage']
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
