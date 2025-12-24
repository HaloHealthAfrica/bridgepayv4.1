export async function GET() {
  try {
    // Check for Lemonade secrets (only true/false, never values)
    const secretsStatus = {
      LEMONADE_CONSUMER_KEY: !!process.env.LEMONADE_CONSUMER_KEY,
      LEMONADE_CONSUMER_SECRET: !!process.env.LEMONADE_CONSUMER_SECRET,
      LEMONADE_BASE_URL: !!process.env.LEMONADE_BASE_URL,
    };

    return Response.json(secretsStatus);
  } catch (error) {
    console.error("Secrets check error:", error);
    // Never crash; always return JSON
    return Response.json({
      LEMONADE_CONSUMER_KEY: false,
      LEMONADE_CONSUMER_SECRET: false,
      LEMONADE_BASE_URL: false,
      error: "Failed to check secrets",
    });
  }
}
