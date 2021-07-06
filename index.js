require('dotenv').config()
const Web3 = require("web3")
const WETH9 = require('./abi/WETH9.json')
const UniswapV3RouterAbi = require("./abi/UniswapV3Router.json")
const UniswapV3FactoryAbi = require("./abi/UniswapV3Factory.json")
// ropsten specific
const addresses = {
  WETH: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
  factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', 
  router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
}

const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.INFURA_URL_ROPSTEN))
// RIP HDWallet Provider, still unable to .on websockets
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY)
const factory = new web3.eth.Contract(
  UniswapV3FactoryAbi,
  addresses.factory,
);
const router = new web3.eth.Contract(
  UniswapV3RouterAbi,
  addresses.router,
);
const weth9 = new web3.eth.Contract(
  WETH9,
  addresses.WETH
)


factory.events.PoolCreated({
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
    }

    if(token1 == addresses.WETH) {
      tokenIn = token1; 
      tokenOut = token0; 
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

    const swap = await router.methods.exactInputSingle(params)
    let encodedSwap = swap.encodeABI()
    let tx = {
      gas: 500000,
      data: swap.encodeABI(),
      from: account.address,
      // this is why inputting eth for swap needn't have an approve
      value: web3.utils.toWei('0.000001', 'ether'),
      to: addresses.router
    }
    web3.eth.accounts.signTransaction(tx, account.privateKey, (error, stx) => {
      if (error) {
        console.log(error)
      } else {
        web3.eth.sendSignedTransaction(stx.rawTransaction).on('receipt', (receipt) => {
          console.log(receipt)
        })
      }
    })
  }
  )
  .on('error', console.error)

