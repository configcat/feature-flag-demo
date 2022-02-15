# ConfigCat feature management demo app

The purpose of this app is to demonstrate ConfigCat feature management by simulating a number of clients or SDKs connected to the ConfigCat CDN.

If you connect this app to one of your feature flags and play around with percentage and targeting rules.

## Usage
1. Run locally or open https://feature-flag-demo.configcat.now.sh
1. Enter your SDK Key (API Key), get it from https://app.configcat.com/sdkkey
2. Select a flag you'd like to use, it must be of a bool type (on/off).
3. Flip the flag and see how the client change color.
4. Add email or percentage based targeting rules and see what happens. 

### Set a base URL
Example: https://feature-flag-demo-configcat.vercel.app/?baseUrl=https:%2F%2Ftest-cdn-eu.configcat.com%2F

## To run locally
Open terminal and run:
```sh
npm i && npm start
```
