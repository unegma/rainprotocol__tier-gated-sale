import * as rainSDK from "rain-sdk";
import { ethers, BigNumber } from "ethers";
const CHAIN_ID = 80001; // Mumbai (Polygon Testnet) Chain ID

// todo move configurations and code to different files?
// todo remember to remind user to approve transactions at each stage (may need to click off and back on to metamask)
// todo remember to remind user who they will be at each point (dev vs user)

// tutorial:
export async function tierGatedSale() {

  // ##########################
  // ## Configurations

  // config for our (not really gated) NFT used in gating
  const gatedNFTState = {
    config: {
      name: 'My Access Token',
      symbol: 'mAT',
      description: 'My Access Token can give me access to things',
      animationUrl: '',
      animationHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      imageUrl: 'https://thumbs.dreamstime.com/b/gold-badge-5392868.jpg',
      imageHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    },
    tier: '0xcd953b94999808ee07a33860dd46689580c90cf4', // this config is needed? // todo check this config
    minimumStatus: 0,
    maxPerAddress: 1, // let's only let people have 2 for this tutorial
    transferrable: 0,
    maxMintable: 1, // for the purposes of this tutorial, we are only allowing there to be 1 token is existance
    // todo check if these are part of tier
    royaltyRecipient: "",
    royaltyBPS: 10
  }

  // config for the tier contract
  const tierState = {
    erc721: undefined, // this will be set to the address of the GatedNFT configured above (after it is deployed)
    // todo may need 8
    // tier 1 means the user needs 1 token, tier 2, 2 tokens (however, we have set users to only be allowed one, so only tier 1 works here)
    tierValues: [
      1,2,2,2,2,2,2,2 // any tiers beyond 1 won't matter because there will only ever be one of these tokens in existence
    ]
  }

  // config for the sale
  const erc20decimals = 18; // See here for more info: https://docs.openzeppelin.com/contracts/3.x/erc20#a-note-on-decimals
  const staticPrice = ethers.utils.parseUnits("100", erc20decimals);
  const walletCap = ethers.utils.parseUnits("10", erc20decimals);
  const saleState = {
    canStartStateConfig: undefined, // config for the start of the Sale (see opcodes section below)
    canEndStateConfig: undefined, // config for the end of the Sale (see opcodes section below)
    calculatePriceStateConfig: undefined, // config for the `calculatePrice` function (see opcodes section below)
    recipient: "", // who will receive the RESERVE token (e.g. Matic/USDCC) after the Sale completes
    reserve: "0x0000000000000000000000000000000000001010", // the reserve token contract address (Polygon Testnet MATIC)
    saleTimeout: 100, // this will be 100 blocks
    cooldownDuration: 100, // this will be 100 blocks
    minimumRaise: ethers.utils.parseUnits("1000", erc20decimals), // minimum to complete a Raise
    dustSize: ethers.utils.parseUnits("0", erc20decimals),
  };
  const redeemableState = {
    erc20Config: { // config for the redeemable token (rTKN) which participants will get in exchange for reserve tokens
      name: "Raise token", // the name of the rTKN
      symbol: "rTKN", // the symbol for your rTKN
      distributor: "0x0000000000000000000000000000000000000000", // distributor address
      initialSupply: ethers.utils.parseUnits("1000", erc20decimals), // initial rTKN supply
    },
    tier: undefined, // tier contract address (used for gating), will be set to the address of the tier contract after deployment
    minimumTier: 0, // minimum tier a user needs to take part
    distributionEndForwardingAddress: "0x0000000000000000000000000000000000000000" // the rTKNs that are not sold get forwarded here (0x00.. will burn them)
  }

  try {
    // ###########################################
    // ## General Blockchain Connections
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
    console.log("Your Account Address:", address);

    // ##########################
    // ### Deploy gated NFT

    // convert royaltyBPS to BigNumber format
    gatedNFTState.royaltyBPS = BigNumber.from(
      Math.floor(gatedNFTState.royaltyBPS * 100)
    );

    // set YOU to be the recipient
    gatedNFTState.royaltyRecipient = address;

    console.log(
      "Creating: GatedNFT for Gating Sale with the following State:",
      gatedNFTState,
    );

    // todo should this be then passed to the constructor in the sdk or used as is?
    const gatedNFTContract = await rainSDK.GatedNFT.deploy(
      signer,
      gatedNFTState
    );

    console.log(`Result: GatedNFT Contract`, gatedNFTContract);

    // ###################################################
    // ### Deploy Tier Contract to be used in Sale
    tierState.erc721 = gatedNFTContract.address; // set tier to use address of token above

    console.log(
      "Creating: Tier Contract (using GatedNFT) with the following State:",
      tierState,
    );

    // todo should this be then passed to the constructor in the sdk or used as is?
    const tierContract = await rainSDK.ERC721BalanceTier.deploy(
      signer,
      tierState
    );

    console.log(`Result: Tier Contract`, tierContract);

    // ####################################
    // ### Sale code below this line

    // to gate the sale, we are actually setting the tiering on the token (which will be bought from the sale) itself
    redeemableState.tier = tierContract.address;

    saleState.canStartStateConfig = {
      constants: [1],
      sources: [
        ethers.utils.concat([
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 0),
        ]),
      ],
      stackLength: 1,
      argumentsLength: 0,
    };

    saleState.canEndStateConfig = {
      constants: [1],
      sources: [
        ethers.utils.concat([
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 0),
        ]),
      ],
      stackLength: 1,
      argumentsLength: 0,
    };

    // define the parameters for the VM which will be used whenever the price is calculated, for example, when a user wants to buy a number of units
    saleState.calculatePriceStateConfig = {
      constants: [staticPrice, walletCap, ethers.constants.MaxUint256], // staticPrice, walletCap, (0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)
      sources: [
        ethers.utils.concat([
          // put onto the stack, the amount the current user wants to buy
          rainSDK.VM.op(rainSDK.Sale.Opcodes.CURRENT_BUY_UNITS),

          // put onto the stack, the current token balance of the user (the Sale's rTKN represented in the smart contract)
          rainSDK.VM.op(rainSDK.Sale.Opcodes.TOKEN_ADDRESS),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.SENDER),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.IERC20_BALANCE_OF),

          // add the first two elements of the stack (current buy units and balance of that user)
          rainSDK.VM.op(rainSDK.Sale.Opcodes.ADD, 2),

          // here we have a potential new value which we will compare to walletCap

          // and then check if it exceeds the walletCap (ie the amount allowed)
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 1),// walletCap ()
          rainSDK.VM.op(rainSDK.Sale.Opcodes.GREATER_THAN), // this will put a boolean on the stack (true: 1, false: 0)

          // this will behave like a minimum wallet cap, so you cant buy below this amount
          // rainSDK.VM.op(rainSDK.Sale.Opcodes.LESS_THAN), // this will put a boolean on the stack (true: 1, false: 0)

          // eager if will get the 1st (result of greater than) and 3rd value
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 2), // `MaxUint256` this will be executed if the check above is true (this is an infinity price so it can't be bought)
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 0), // `staticPrice` this will be executed if the check above is false (staticPrice is the price that the user wants to exchange the tokens for)
          rainSDK.VM.op(rainSDK.Sale.Opcodes.EAGER_IF),
        ]),
      ],
      stackLength: 10,
      argumentsLength: 0,
    };

    saleState.recipient = address;

    console.log(
        "Creating: Sale (Using Tier contract which uses GatedNFT) with the following State:",
        saleState,
        redeemableState
    );

    // todo should this be then passed to the constructor in the sdk or used as is?
    const saleContract = await rainSDK.Sale.deploy(
      signer,
      saleState,
      redeemableState
    );

    console.log('Result: Sale Contract:', saleContract); // the Sale contract and corresponding address

    // #####################################################
    // ### Interact with your newly deployed ecosystem

    let price = await saleContract.calculatePrice(ethers.utils.parseUnits("100", erc20decimals));
    // todo check the price is correct
    console.log(`Info: Checking the Price of tokens in the Sale: ${price}`);

    // configure buy for the sale (We have set this to Matic which is also used for paying gas fees, but this could easily be set to usdcc or some other token)
    const buyConfig = {
      feeRecipient: address,
      fee: price*0.01, // 1 percent fee for the platform
      minimumUnits: 1000000, // 1 million??
      desiredUnits: 1000000,
      maximumPrice: price*10, // TODO VERY ARBITRARY ETHERS CONSTANT MAX AMOUNT
    }


    try {
      console.log(`Info: Buying with parameters:`, buyConfig);
      const buyStatus = await saleContract.buy(buyConfig);
      console.log(`Info: This should never be reached`, buyStatus);
    } catch (err) {
      // console log the error which should be a revert
      console.log(`Info: This should have failed because you don't have one of the NFTs required for taking part`, err);
    }

    // mint and send to you
    console.log(`Info: Minting you a required NFT to take part in Sale:`);
    const result = await gatedNFTContract.mint(address); // get one of the NFTs needed to take part in the sale
    console.log(`Result: of NFT Minting:`, result);

    try {
      console.log(`Info: Buying with parameters:`, buyConfig);
      const buyStatus = await saleContract.buy(buyConfig);
      console.log(`Info: This should have passed because you do have one of the NFTs required for taking part`, buyStatus);
    } catch (err) {
      console.log(`Info: This should never be reached`);
    }

   console.log("Info: Done");

  } catch (err) {
    console.log(err);
  }


}

tierGatedSale();
