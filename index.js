import * as rainSDK from "rain-sdk";
import { ethers, BigNumber } from "ethers";
import deployGatedNFTContract from "./deployGatedNFTContract.js";
import deployTierContract from "./deployTierContract.js";
import deploySaleContract from "./deploySaleContract.js";
const CHAIN_ID = 80001; // Mumbai (Polygon Testnet) Chain ID

// tutorial:
export async function tierGatedSale() {
  try {
    const {ethereum} = window;

    if (!ethereum) {
      console.log("No Web3 Wallet installed");
    }

    const provider = new ethers.providers.Web3Provider(ethereum, {
      name: 'Mumbai',
      chainId: CHAIN_ID,
    });

    // Prompt user for account connections
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    console.log("Info: Your Account Address:", address);
    console.log('------------------------------'); // separator

    // Deploy gated NFT
    const gatedNFTContract = deployGatedNFTContract(signer);
    console.log('------------------------------'); // separator

    // Deploy Tier Contract to be used in Sale
    const tierContract = deployTierContract(signer, gatedNFTContract);
    console.log('------------------------------'); // separator

    // Deploy Sale
    const saleContract = deploySaleContract(signer, tierContract);
    console.log('------------------------------'); // separator

    // ### Interact with your newly deployed ecosystem

    let price = await saleContract.calculatePrice(ethers.utils.parseUnits("100", erc20decimals));
    console.log(`Info: Checking the Price of tokens in the Sale: ${price}`); // todo check the price is correct

    // configure buy for the sale (We have set this to Matic which is also used for paying gas fees, but this could easily be set to usdcc or some other token)
    const buyConfig = {
      feeRecipient: address,
      fee: price*0.01, // 1 percent fee for the platform
      minimumUnits: 1000000, // 1 million??
      desiredUnits: 1000000,
      maximumPrice: price*10, // TODO VERY ARBITRARY ETHERS CONSTANT MAX AMOUNT
    }

    try {
      console.log(`Info: Buying from Sale with parameters:`, buyConfig);
      const buyStatus = await saleContract.buy(buyConfig);
      console.log(`Info: This should never be reached`, buyStatus);
    } catch (err) {
      console.log(`Info: This should have failed because you don't have one of the NFTs required for taking part`, err); // console log the error which should be a revert
    }

    console.log('------------------------------'); // separator

    console.log(`Info: Minting you a required NFT to take part in Sale:`); // mint and send to you
    const result = await gatedNFTContract.mint(address); // get one of the NFTs needed to take part in the sale
    console.log(`Result: of NFT Minting:`, result);

    console.log('------------------------------'); // separator

    try {
      console.log(`Info: Buying from Sale with parameters:`, buyConfig);
      const buyStatus = await saleContract.buy(buyConfig);
      console.log(`Info: This should have passed because you do have one of the NFTs required for taking part`, buyStatus);
    } catch (err) {
      console.log(`Info: Failed, this should never have been reached, error:`, err);
    }

   console.log('------------------------------'); // separator

   console.log("Info: Done");

  } catch (err) {
    // separator
    console.log('------------------------------');
    console.log(`Info: Something went wrong:`, err);
  }
}

tierGatedSale();
