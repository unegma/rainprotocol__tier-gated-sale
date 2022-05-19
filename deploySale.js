import * as rainSDK from "rain-sdk";

export default async function deploySale(signer, tierContract) {
  try {
    const address = await signer.getAddress()

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
      tier: tierContract.address, // to gate the sale, we are actually setting the tiering on the token (which will be bought from the sale) itself
      minimumTier: 0, // minimum tier a user needs to take part // todo may need to be 1 (although this could be equal to 2 tokens)
      distributionEndForwardingAddress: "0x0000000000000000000000000000000000000000" // the rTKNs that are not sold get forwarded here (0x00.. will burn them)
    }

    // Opcode Configurations
    saleState.canStartStateConfig = {
      constants: [1],
      sources: [ethers.utils.concat([rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 0)])],
      stackLength: 1,
      argumentsLength: 0,
    };
    saleState.canEndStateConfig = {
      constants: [1],
      sources: [ethers.utils.concat([rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 0)])],
      stackLength: 1,
      argumentsLength: 0,
    };

    // define the parameters for the VM which will be used whenever the price is calculated, for example, when a user wants to buy a number of units
    saleState.calculatePriceStateConfig = {
      constants: [staticPrice, walletCap, ethers.constants.MaxUint256],
      sources: [
        ethers.utils.concat([
          rainSDK.VM.op(rainSDK.Sale.Opcodes.CURRENT_BUY_UNITS),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.TOKEN_ADDRESS),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.SENDER),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.IERC20_BALANCE_OF),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.ADD, 2),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 1),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.GREATER_THAN),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 2),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.VAL, 0),
          rainSDK.VM.op(rainSDK.Sale.Opcodes.EAGER_IF),
        ]),
      ],
      stackLength: 10,
      argumentsLength: 0,
    };
    saleState.recipient = address;

    console.log("Creating: Sale (Using Tier contract which uses GatedNFT) with the following State:", saleState, redeemableState);
    const saleContract = await rainSDK.Sale.deploy(signer, saleState, redeemableState); // todo should this be then passed to the constructor in the sdk or used as is?
    console.log('Result: Sale Contract:', saleContract); // the Sale contract and corresponding address
    return saleContract;
  } catch (err) {
    console.log(`Error deploying Sale`, err);
  }
}
