import { makeAuthClient } from "helius-sdk/auth/client";

/**
 * Buy additional prepaid credits for an agent-plan project, paying via USDC
 * from the local keypair and polling activation.
 *
 * Agent-only in this release. Each unit of `qty` grants 1,000,000 credits at
 * the backend: 10 USDC × qty=1 → 1M credits; 10 × 3 → 3M credits.
 *
 * For link-only flows (e.g. you want to hand a hosted-checkout URL to a UI
 * instead of auto-paying from a keypair), call `auth.purchaseCredits(...)`
 * instead — it returns the same `paymentLink` without sending USDC.
 */
(async () => {
  const auth = makeAuthClient("helius-sdk-example/credits");

  // Load the same keypair used for signup. Paste its 64 saved bytes here.
  const secretKey = Uint8Array.from([
    // 12, 34, 56, ... (64 entries)
  ]);
  const keypair = auth.loadKeypair(secretKey);
  const walletAddress = await auth.getAddress(keypair);

  // Authenticate the wallet to get a JWT.
  const { message, signature } = await auth.signAuthMessage(secretKey);
  const { token: jwt } = await auth.walletSignup(
    message,
    signature,
    walletAddress
  );

  // Use the existing agent-plan project (first project on the account).
  const projects = await auth.listProjects(jwt);
  const projectId = projects[0]?.id;
  if (!projectId) throw new Error("No project found — sign up first.");

  const result = await auth.purchaseCreditsAndPay({
    secretKey,
    jwt,
    projectId,
    qty: 1,
  });

  switch (result.kind) {
    case "completed":
      console.log("Credits purchased!");
      console.log("Tx signature:", result.txSignature);
      console.log("Payment intent:", result.paymentIntentId);
      break;
    case "pending":
      console.log(
        "USDC sent (tx:",
        result.txSignature,
        "), but activation polling timed out. Re-poll later via:"
      );
      console.log(" ", result.paymentLink.paymentUrl);
      break;
    case "expired":
    case "failed":
      console.error(
        `Purchase ${result.kind}.`,
        "reason" in result ? result.reason : ""
      );
      break;
  }
})();
