# The Sniper Arbitrage Flash Loan Flashbot

current version 0.02

```cp .env.example .env ```
Fill it out
```docker-compose up```

## inspiration

- [Jamesbachini](https://github.com/jamesbachini/Uniswap-V3-Experiments/blob/main/uniswap-v3-trader.js)
- [jklepatch](https://github.com/jklepatch/eattheblocks/blob/master/screencast/322-uniswap-trading-bot/bot.js)

## Basic Plan
Snipe altcoins on uniswap and sushiswap
wait for the pair to be deployed on the other respectively
attempt to flashloan arbitrage with AAVE when it does
try using flashbots
