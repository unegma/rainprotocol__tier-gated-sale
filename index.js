import { ethers } from "ethers";
import deployGatedNFT from "./deployGatedNFT.js";
import deployTier from "./deployTier.js";
import deploySale from "./deploySale.js";
const CHAIN_ID = 80001; // Mumbai (Polygon Testnet) Chain ID

// tutorial:
export async function runTierGatedSale() {
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

    // Deploy Contracts
    const gatedNFTContract = await deployGatedNFT(signer); // Deploy gated NFT
    const tierContract = await deployTier(signer, gatedNFTContract); // Deploy Tier Contract to be used in Sale
    const saleContract = await deploySale(signer, tierContract); // Deploy Sale
    console.log('------------------------------'); // separator

    // ### Interact with the newly deployed ecosystem

    let price = await saleContract.calculatePrice(ethers.utils.parseUnits("100", erc20decimals));
    console.log(`Info: Price of tokens in the Sale: ${price}`); // todo check the price is correct

    // configure buy for the sale (We have set this to Matic which is also used for paying gas fees, but this could easily be set to usdcc or some other token)
    const buyConfig = {
      feeRecipient: address,
      fee: price*0.01, // 1 percent fee for the platform
      minimumUnits: 1000000, // 1 million??
      desiredUnits: 1000000,
      maximumPrice: price*10, // TODO VERY ARBITRARY ETHERS CONSTANT MAX AMOUNT // todo why do we set this?
    }

    try { // separate try block as we want to catch the error separately
      console.log(`Info: Buying from Sale with parameters:`, buyConfig);
      await saleContract.buy(buyConfig); // this should trigger the catch below
    } catch (err) {
      console.log(`Info: This should have failed because you don't have one of the NFTs required for taking part`, err); // console log the error which should be a revert
      console.log('------------------------------'); // separator
    }

    console.log(`Info: Minting you a required NFT to take part in Sale:`); // mint and send to you
    const result = await gatedNFTContract.mint(address); // get one of the NFTs needed to take part in the sale
    console.log(`Result: of NFT Minting:`, result);

    console.log(`Info: Buying from Sale with parameters:`, buyConfig);
    const buyStatus = await saleContract.buy(buyConfig);
    console.log(`Info: This should have passed because you do have one of the NFTs required for taking part`, buyStatus);

    console.log('------------------------------'); // separator
    console.log("Info: Done");

  } catch (err) {
    // separator
    console.log('------------------------------');
    console.log(`Info: Something went wrong:`, err);
  }
}

runTierGatedSale();
