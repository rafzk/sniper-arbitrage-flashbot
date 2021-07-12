pragma solidity 0.8.4;

import "./aave/FlashLoanReceiverBase.sol";
import "./aave/ILendingPoolAddressesProvider.sol";
import "./aave/ILendingPool.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

contract uniToSushiFlashloan is FlashLoanReceiverBase {
  ISwapRouter immutable uniRouter;
  address WETH9 = 0xc778417E063141139Fce010982780140Aa0cD5Ab;
  IUniswapV2Router02 immutable sushiRouter;
  constructor(address _addressProvider) FlashLoanReceiverBase(_addressProvider)  {
    uniRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    sushiRouter = IUniswapV2Router02(0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506);
  }


  /**
    This function is called after your contract has received the flash loaned amount
   */
  function executeOperation(
    address _reserve,
    uint256 _amount,
    uint256 _fee,
    bytes calldata _params  
  )
  external
  override
  returns (bool)  
  {
    require(_amount <= getBalanceInternal(address(this), _reserve), "Invalid balance, was the flashLoan successful?");
    (
      address token0,
      address token1,
      uint24 fee
    ) = abi.decode(_params, (address, address, uint24)); 
    
    ISwapRouter.ExactInputSingleParams memory uniV3Params = 
      ISwapRouter.ExactInputSingleParams(
      WETH9,
      token0,
      fee,
      address(this),
      block.timestamp + 900,
      _amount,
      0,
      0
    );
    uint256 token = uniRouter.exactInputSingle(uniV3Params);
    address[] memory path = new address[](2);
    path[0] = token1;
    path[1] = WETH9;
    uint256[] memory amounts = sushiRouter.swapExactTokensForTokens(
      token,
      0,
      path,
      address(this),
      block.timestamp + 900
    );

    //
    // Your logic goes here.
    // !! Ensure that *this contract* has enough of `_reserve` funds to payback the `_fee` !!
    //


    uint totalDebt = _amount + _fee;
    transferFundsBackToPoolInternal(_reserve, totalDebt);
  }

  /**
  Flash loan 1000000000000000000 wei (1 ether) worth of `_asset`
  */
  function flashloan(
    uint256 ethAmount,
    bytes calldata _params
  ) public onlyOwner {
   /* params 
    address token0
    address token1
   */
    ILendingPool lendingPool = ILendingPool(addressesProvider.getLendingPool());
    lendingPool.flashLoan(
      address(this), //should this be address(this)?
      WETH9,
      ethAmount,
      _params
      
    );
  }
}
