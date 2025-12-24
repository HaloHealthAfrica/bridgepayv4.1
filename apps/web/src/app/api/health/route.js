export async function GET() {
  try {
    return Response.json({
      ok: true,
      env: process.env.ENV || process.env.NODE_ENV,
    });
  } catch (error) {
    console.error("Health check error:", error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
