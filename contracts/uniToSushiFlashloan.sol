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
  IUniswapV2Router02 immutable sushiRouter;
  constructor(address _addressProvider) FlashLoanReceiverBase(_addressProvider)  {
    uniRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    sushiRouter = IUniswapV2Router02(0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506);
  }


  /**
    This function is called after your contract has received the flash loaned amount
   */
  function executeOperation(
		address[] calldata assets,
		uint256[] calldata amounts,
		uint256[] calldata premiums,
		address initiator,
		bytes calldata params
  )
  external
  override
  returns (bool)  
  {
    //require(_amount <= getBalanceInternal(address(this), _reserve), "Invalid balance, was the flashLoan successful?");

    //
    // Your logic goes here.
    // !! Ensure that *this contract* has enough of `_reserve` funds to payback the `_fee` !!
    //



    //uint totalDebt = _amount + _fee;
    //transferFundsBackToPoolInternal(_reserve, totalDebt);
  }

  /**
    Flash loan 1000000000000000000 wei (1 ether) worth of `_asset`
   */
  function flashloan(
    address token0Addr,
    address token1Addr,
    uint256 token0Amount,
    uint256 token1Amount
  ) public onlyOwner {
    address receiverAddress = 0x3bE057bBAF734770c8a4CA81e2Abbdc29deb39F0;
    address[] memory assets = new address[](2); 
    assets[0] = token0Addr;
    assets[1] = token1Addr;
    uint256[] memory amounts = new uint256[](2);
    amounts[0] = token0Amount;
    amounts[1] = token1Amount;
    uint256[] memory modes = new uint256[](2);
    modes[0] = 0;
    modes[1] = 0;
    address onBehalfOf = 0x3bE057bBAF734770c8a4CA81e2Abbdc29deb39F0;
    bytes memory data = "";
    uint16 referralCode = 0;
    ILendingPool lendingPool = ILendingPool(addressesProvider.getLendingPool());
    lendingPool.flashLoan(
      receiverAddress, //should this be address(this)?
      assets,
      amounts,
      modes,
			onBehalfOf,
      data,
			referralCode
    );
  }
}
