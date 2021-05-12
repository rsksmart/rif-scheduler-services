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
MNEMONIC_PHRASE=confirm fragile hobby...
# Address of the one shoot scheduler smart contract
ONE_SHOOT_SCHEDULER_ADDRESS=0x...
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

## Demo

If you like to run the demo, you'll need the following environment variables in addition to what you already have in your .env file.

```bash
# Address of the token smart contract
TOKEN_ADDRESS=0x...
# Address of the counter smart contract
COUNTER_ADDRESS=0x...
```

The `TOKEN_ADDRESS` is the address of the `ERC677` smart contract needed to approve the gas that will be consumed by the transactions executions and the `COUNTER_ADDRESS` is the address of the `Counter` smart contract that have a method called `inc()` useful to illustrate the execution of some smart contract.

Then:
1. Start ganache

  ```
  npx ganache-cli
  ```

2. Run demo

  ```
  npm run demo
  ```

## Lint

```
npm run lint
```