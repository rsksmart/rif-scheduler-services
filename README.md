<p align="middle">
    <img src="https://www.rifos.org/assets/img/logo.svg" alt="logo" height="100" >
</p>
<h3 align="middle">RIF Scheduler services</h3>
<p align="middle">
    <a href="https://developers.rsk.co/rif/scheduler/services">
        <img src="https://img.shields.io/badge/-docs-brightgreen" alt="docs" />
    </a>
    <a href="https://github.com/rsksmart/rif-scheduler-services/actions/workflows/ci.yml" alt="ci">
        <img src="https://github.com/rsksmart/rif-scheduler-services/actions/workflows/ci.yml/badge.svg" alt="ci" />
    </a>
    <a href="https://lgtm.com/projects/g/rsksmart/rif-scheduler-services/alerts/">
        <img src="https://img.shields.io/lgtm/alerts/github/rsksmart/rif-scheduler-services" alt="alerts">
    </a>
    <a href="https://lgtm.com/projects/g/rsksmart/rif-scheduler-services/context:javascript">
        <img src="https://img.shields.io/lgtm/grade/javascript/github/rsksmart/rif-scheduler-services">
    </a>
    <a href="https://codecov.io/gh/rsksmart/rif-scheduler-services">
        <img src="https://codecov.io/gh/rsksmart/rif-scheduler-contracts/branch/develop/graph/badge.svg?token=72T5TQ34HT"/>
    </a>
</p>

RIF Scheduler services are used by service providers willing to offer scheduling services. Run this service to:

- Collect the transactions that need execution
- Execute the transactions in proper time and collect reward

## Run for development

Install dependencies:

```sh
npm i
```

### Run unit tests

1. Start ganache

    ```sh
    npx ganache-cli
    ```

2. Run tests

    ```sh
    npm test
    ```

    or watch mode with

    ```sh
    npm run test:watch
    ```

3. Run coverage report:

    ```sh
    npm run coverage
    ```

### Run linter

```sh
npm run lint
```

Auto-fix:

```sh
npm run lint:fix
```

### Build

```sh
npm run build
```

For production:

```sh
npm run build:prod
```

## Run the service

1. Run build script

2. Create a `.env` file in the root directory and put the following variables:

    ```dosini
    # directory and name of the cache database
    DB_NAME=scheduler.sqlite
    # number of confirmations you want to require
    REQUIRED_CONFIRMATIONS=12
    # RPC server url with ws or wss protocol
    BLOCKCHAIN_WS_URL=ws://127.0.0.1:8545
    # RPC server url with http or https protocol
    BLOCKCHAIN_HTTP_URL=http://127.0.0.1:8545

    # 12 words mnemonic phrase of the wallet you want to use to pay the executions
    MNEMONIC_PHRASE=confirm fragile hobby...
    # Address of the one shot scheduler smart contract
    ONE_SHOT_SCHEDULER_ADDRESS=0x...

    # [Optional] Cron expression that specifies the frequency of the Scheduler execution. Default: each 5 minutes.
    SCHEDULER_CRON_EXPRESSION=*/5 * * * *
    ```

3. Run

    ```sh
    npm run start
    ```

> See [here](#deployment-with-docker) how to run it with Docker

#### About Confirmations and window time

As a service provider you must to take into account that the execution window is related to the confirmations required, because you must wait until the confirmations are reached to execute the transaction in order to avoid the execution of unconfirmed transactions.

We recommend at least 12 confirmations with a window of 3-5 minutes. This is directly related to the recurrence of the transaction executions, that runs each 5 minutes (Configurable by `SCHEDULER_CRON_EXPRESSION` environment variable).  

You can configure the *required confirmations* with their own environment variable (`REQUIRED_CONFIRMATIONS`) and the window time is set by the `addPlan` method of the `OneShotSchedule` smart contract.

## Demo

If you like to run the demo, you'll need the following environment variables in addition to what you already have in your .env file.

```dosini
# Address of the token smart contract
TOKEN_ADDRESS=0x...
# Address of the counter smart contract
COUNTER_ADDRESS=0x...
```

The `TOKEN_ADDRESS` is the address of the `ERC677` smart contract needed to approve the gas that will be consumed by the transactions executions and the `COUNTER_ADDRESS` is the address of the `Counter` smart contract that have a method called `inc()` useful to illustrate the execution of some smart contract.

Then:

1. Start ganache

    ```sh
    npx ganache-cli
    ```

2. Run demo

    ```sh
    npm run demo
    ```

## Deployment with docker

1. Create a `.env.prod` file with the same variables specified in the `Setup` section.

2. From the root of the project execute the following commands:

    ```sh
    docker-compose build
    docker-compose up -d
    ```

3. *[Optional]* Monitoring with [Datadog](https://www.datadoghq.com/):

    Execute the following command (don't forget to replace `YOUR_DD_API_KEY` with your api key from Datadog):

    ```sh
    docker run -d --name datadog-agent \
              -e DD_API_KEY=YOUR_DD_API_KEY \
              -e DD_LOGS_ENABLED=true \
              -e DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true \
              -e DD_CONTAINER_EXCLUDE_LOGS="name:datadog-agent" \
              -v /var/run/docker.sock:/var/run/docker.sock:ro \
              -v /proc/:/host/proc/:ro \
              -v /opt/datadog-agent/run:/opt/datadog-agent/run:rw \
              -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro datadog/agent:latest
    ```

## Known Issues

This section outlines acknowledged issues, including workarounds if known.

- [ [#3](https://github.com/rsksmart/rif-scheduler-services/issues/3) ]

  **If the service is stopped using the stop method of Core component it couldn't be restarted:**

  This issue is related to Web3 and WebSockets, until now the only solutions is to kill the process and start it again.

  Alternatively you could use a tool such as [PM2](https://www.npmjs.com/package/pm2)
