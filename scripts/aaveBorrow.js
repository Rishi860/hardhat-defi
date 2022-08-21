const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("./getWeth");

async function main() {
  // protocol treats everything as ERC20 token
  await getWeth();
  const { deployer } = await getNamedAccounts();
  // abi, address

  // Lending pool address provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5 // from aave docs v2

  const lendingPool = await getLendingPool(deployer);
  console.log(`LendingPool address ${lendingPool.address}`);

  // now in order to deposit or withdraw money from the wallet we need to approve that our sciprt can access the contract
  // deposit!
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  // approve
  // wethTokenAddress has the weth and we want to give our lendingPool approval to get/add Weth from it
  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
  console.log("Depositing....");
  // asset we will deposit in this case it is Weth
  //referral code is 0
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
  console.log("Deposited!");

  // conversion rate on DAI ?
  const daiPrice = await getDaiPrice();
  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer);
  const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber());
  const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString());
  console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`);
  // Borrow
  // how much we have, we have borrowed, we can

  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);

  await getBorrowUserData(lendingPool, deployer);
  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);
  await getBorrowUserData(lendingPool, deployer);
  // here we will have some borrowed money left, cause when we borrowed DAI we were charged intrest with and we are
  // supposed to pay that out
}

async function repay(amount, daiAddress, lendingPool, account) {
  // we need approval again as we interacting with dai again
  await approveErc20(daiAddress, lendingPool.address, amount, account);
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
  await repayTx.wait(1);
  console.log(`Repayed ${amount}`);
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
  const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account);
  await borrowTx.wait(1);
  console.log("You've Borrwed");
}

// chainlink aggregatorv3interface helped us do that
async function getDaiPrice() {
  // no need of signer cause we are just reading the contract
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4"
  );
  const price = (await daiEthPriceFeed.latestRoundData())[1]; // stores answer which we need
  console.log(`DAI/ETH price is ${price.toString()}`);
  return price;
}

async function getBorrowUserData(lendingPool, account) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);
  console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
  console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);
  console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`);
  return { availableBorrowsETH, totalDebtETH };
}

async function getLendingPool(account) {
  const lendingPoolAddressProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  );

  // i manually added the required files from the docs
  // if not working properly do yarn add --dev @aave/protocol-v2
  // then change the address in import required
  // "@aave/protocol-v2/contracts/interfaces/ILendingPoolAddressesProvider.sol"
  // "@aave/protocol-v2/contracts/protocol/libraries/types/DataTypes.sol"

  const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account);
  return lendingPool;
}

// spenderAddress is the address which we are approving to pull weth token from our account
async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
  const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account);
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
