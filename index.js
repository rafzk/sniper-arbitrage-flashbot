require('dotenv').config()
const mongoose = require('mongoose')
mongoose.connect('mongodb://mongo:27017/flashbot')

const Token = mongoose.model('Token', {
  network: String,
  name: String,
  address: String,
  uniPoolAddr: String,
  sushiPoolAddr: String,
  uniAmount: String,
  sushiAmount: String,
})

const Web3 = require("web3")
const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.INFURA_URL_ROPSTEN))
const WETH9 = require('./abi/WETH9.json')
const UniswapV3RouterAbi = require("./abi/UniswapV3Router.json")
const SushiswapV2Router02Abi = require('./abi/SushiswapV2Router02.json')
const UniswapV3FactoryAbi = require("./abi/UniswapV3Factory.json")
const SushiswapV2FactoryAbi = require('./abi/SushiswapV2Factory.json')

// ropsten specific
const addresses = {
  WETH: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
  uniFactory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  sushiFactory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
  uniRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  sushiRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
}

// RIP HDWallet Provider, still unable to .on websockets
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY)
const uniFactory = new web3.eth.Contract(
  UniswapV3FactoryAbi,
  addresses.uniFactory,
);
const sushiFactory = new web3.eth.Contract(
  SushiswapV2FactoryAbi,
  addresses.sushiFactory,
)
const uniRouter = new web3.eth.Contract(
  UniswapV3RouterAbi,
  addresses.uniRouter,
);
const sushiRouter = new web3.eth.Contract(
  SushiswapV2Router02Abi,
  addresses.sushiRouter,
);
const weth9 = new web3.eth.Contract(
  WETH9,
  addresses.WETH
);
(async () => {
  console.log(account.address)
  console.log(await web3.eth.getTransactionCount(account.address, 'pending'))
})()

uniFactory.events.PoolCreated({
  fromBlock: 'latest'
}, (err, event) => console.log(event))
  .on('data', async (event) => {
    const {
      token0,
      token1,
      fee,
      tickSpacing,
      pool
    } = event.returnValues
    let tokenIn, tokenOut

    if(token0 === addresses.WETH) {
      tokenIn = token0; 
      tokenOut = token1;
    } else if(token1 == addresses.WETH) {
      tokenIn = token1; 
      tokenOut = token0; 
    } else {
      console.log('not weth')
      return
    }

    const params = {
      tokenIn,
      tokenOut,
      fee,
      recipient: account.address,
      deadline: Math.floor(Date.now() / 1000) + 900,
      amountIn: web3.utils.toWei('0.000001', 'ether'),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    }

    const swap = await uniRouter.methods.exactInputSingle(params)
    let encodedSwap = swap.encodeABI()
    let tx = {
      nonce: await web3.eth.getTransactionCount(account.address, 'pending'),
      gas: 500000,
      data: swap.encodeABI(),
      from: account.address,
      // this is why inputting eth for swap needn't have an approve
      value: web3.utils.toWei('0.000001', 'ether'),
      to: addresses.uniRouter
    }
    web3.eth.accounts.signTransaction(tx, account.privateKey, (error, stx) => {
      if (error) {
        console.log(error)
      } else {
        web3.eth.sendSignedTransaction(stx.rawTransaction).on('receipt', async (receipt) => {
          console.log(receipt.logs)
          const record = await Token.findOneAndUpdate(
            {address: tokenOut},
            {
              uniPoolAddr: pool,
              uniAmount: web3.utils.hexToNumberString(receipt.logs[0].data),
            }  
          )
          if (!record) {
            const newRecord = new Token({
              network: 'Ropsten',
              name: 'Token',
              address: tokenOut ,
              uniPoolAddr: pool,
              uniAmount: web3.utils.hexToNumberString(receipt.logs[0].data),
            })
            newRecord.save()
          }
        })
      }
    })
  }
  )
  .on('error', console.error)


sushiFactory.events.PairCreated({
  fromBlock: 'latest'
}, (err, event) => console.log(event))
  .on('data', async (event) => {
    console.log(event) 
    const {
      token0,
      token1,
      pair
    } = event.returnValues
    let tokenIn, tokenOut

    if(token0 === addresses.WETH) {
      tokenIn = token0; 
      tokenOut = token1;
    } else if(token1 == addresses.WETH) {
      tokenIn = token1; 
      tokenOut = token0; 
    } else {
      console.log('not weth')
      return
    }
    const amountIn = web3.utils.toWei('0.000001')
    const amounts = await sushiRouter.methods.getAmountsOut(amountIn, [tokenIn, tokenOut]).call()
    console.log(amounts)
    const amountOutMin = web3.utils.toBN(Math.floor(amounts[1] - (amounts[1] / 10)))
    
    console.log(amountOutMin)
    console.log(web3.utils.toBN(amountOutMin))
    const swap = await sushiRouter.methods.swapExactETHForTokens(
      amountOutMin,
      [tokenIn, tokenOut],
      account.address,
      Date.now() + 1000 * 60* 10
    )
    let tx = {
      nonce: await web3.eth.getTransactionCount(account.address, 'pending'),
      gas: 500000,
      data: swap.encodeABI(),
      from: account.address,
      // this is why inputting eth for swap needn't have an approve
      value: web3.utils.toWei('0.000001', 'ether'),
      to: addresses.sushiRouter
    }
    web3.eth.accounts.signTransaction(tx, account.privateKey, (error, stx) => {
      if (error) {
        console.log(error)
      } else {
        web3.eth.sendSignedTransaction(stx.rawTransaction).on('receipt', async (receipt) => {
          console.log(receipt.logs)
          const record = await Token.findOneAndUpdate(
            {address: tokenOut},
            {
              sushiPoolAddr: pair,
              sushiAmount: web3.utils.hexToNumberString(receipt.logs[2].data),
            }
          )
          if (!record) {
            const newRecord = new Token({
              network: 'Ropsten',
              name: 'Token',
              address: tokenOut,
              sushiPoolAddr: pair,
              sushiAmount: web3.utils.hexToNumberString(receipt.logs[2].data),
            })
            newRecord.save()
          } else {

          }
        })
      }
    })
  })
  .on('error', console.error)
