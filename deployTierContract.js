import * as rainSDK from "rain-sdk";

export default async function deployTierContract(signer, gatedNFTContract) {
  const tierState = {
    erc721: undefined, // this will be set to the address of the GatedNFT configured above (after it is deployed)
    // tier 1 means the user needs 1 token, tier 2, 2 tokens (however, we have set users to only be allowed one, so only tier 1 works here)
    tierValues: [1,2,2,2,2,2,2,2] // any tiers beyond 1 won't matter because there will only ever be one of these tokens in existence
  }
  tierState.erc721 = gatedNFTContract.address; // set tier to use address of token above

  console.log("Creating: Tier Contract (using GatedNFT) with the following State:", tierState);
  const tierContract = await rainSDK.ERC721BalanceTier.deploy(signer, tierState); // todo should this be then passed to the constructor in the sdk or used as is?
  console.log(`Result: Tier Contract`, tierContract);
  return tierContract;
}
