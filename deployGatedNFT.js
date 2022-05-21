import * as rainSDK from "rain-sdk";
import { BigNumber } from "ethers";

export default async function deployGatedNFT(signer) {
  try {
    const address = await signer.getAddress()

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
      minimumStatus: 0, // ??
      maxPerAddress: 1, // let's only let people have 2 for this tutorial
      transferrable: 0, // false
      maxMintable: 1000,
      royaltyRecipient: "",
      royaltyBPS: 10 // ??
    }
    gatedNFTState.royaltyBPS = BigNumber.from(Math.floor(gatedNFTState.royaltyBPS * 100)); // convert royaltyBPS to BigNumber format
    gatedNFTState.royaltyRecipient = address; // set YOU to be the recipient

    console.log("Creating: GatedNFT for Gating Sale with the following State:", gatedNFTState,);
    const gatedNFTContract = await rainSDK.GatedNFT.deploy(signer, gatedNFTState); // todo should this be then passed to the constructor in the sdk or used as is?
    console.log(`Result: GatedNFT Contract`, gatedNFTContract);
    return gatedNFTContract;
  } catch (err) {
    throw new Error('DeployGatedNFTError', `Error deploying GatedNFT`, err);
  }
}
