// Weth is wrapped ETH: ETH wrapped in ERC20 token
// this will convert our ETH into Weth

const { getNamedAccounts, ethers } = require("hardhat");

const AMOUNT = ethers.utils.parseEther("0.02");

async function getWeth() {
  // in order to interact with the contract we need a address
  const { deployer } = await getNamedAccounts();
  // call the "deposit" function  on the Weth contract
  // in order to interact with a contract we need abi , contract address
  // 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 weth mainnet grabbed when converted ETH into Weth from etherscan

  const iWeth = await ethers.getContractAt(
    "IWeth",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    deployer
  );
  const tx = await iWeth.deposit({ value: AMOUNT });
  await tx.wait(1);
  const wethBalance = await iWeth.balanceOf(deployer);
  console.log(`Got ${wethBalance.toString()} WETH`);
}

module.exports = { getWeth, AMOUNT };
