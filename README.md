<p align="middle">
    <img src="https://www.rifos.org/assets/img/logo.svg" alt="logo" height="100" >
</p>
<h3 align="middle">RIF Scheduler services</h3>
<p align="middle">
    Schedule RSK transactions
</p>

## Setup

### 1. Install dependencies

```
npm i
```

### 2. Environment variables

Create a .env file in the root directory and put the following variables:

```bash
# directory and name of the cache database
DB_NAME=sample.db
# number of confirmations you want to require
REQUIRED_CONFIRMATIONS=100
# RPC server url with ws or wss protocol
BLOCKCHAIN_WS_URL=ws://127.0.0.1:8545 
# RPC server url with http or https protocol
BLOCKCHAIN_HTTP_URL=http://127.0.0.1:8545

# 12 words mnemonic phrase of the wallet you want to use to pay the executions
MNEMONIC_PHRASE=sample
# Address of the one shoot scheduler smart contract
ONE_SHOOT_SCHEDULER_ADDRESS=sample
# Address of the token smart contract
TOKEN_ADDRESS=sample

# Address of the counter smart contract (this is only for demo propose)
COUNTER_ADDRESS=sample
```

## Test

1. Start ganache

  ```
  npx ganache-cli
  ```

2. Run tests

  ```
  npm test
  ```

  or watch mode with

  ```
  test:watch
  ```

## Lint

```
npm run lint
```