import sql from "@/app/api/utils/sql";
import { hash } from "argon2";
import { startRequest } from "@/app/api/utils/logger";
import { checkRateLimits } from "@/app/api/utils/ratelimit";
import { writeAudit } from "@/app/api/utils/audit";
import { validatePassword } from "@/app/api/utils/passwordValidation";

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate and normalize phone number (Kenyan format)
function validateAndNormalizePhone(phone) {
  if (!phone) return null;
  
  const cleaned = phone.replace(/\s+/g, '');
  const phoneRegex = /^(\+254|254|0)?[17]\d{8}$/;
  
  if (!phoneRegex.test(cleaned)) {
    throw new Error('Invalid phone number format. Use format: 0722123456');
  }
  
  return cleaned.replace(/^0/, '254');
}

// Registration endpoint - clean implementation
export async function POST(request) {
  const reqMeta = startRequest({ request, route: "/api/auth/register" });
  
  try {
    // Rate limit auth registration: 5/min IP, 30/hour IP
    const rl = checkRateLimits({
      request,
      route: "auth.register",
      rules: [
        { scope: "ip", limit: 5, burst: 5, windowMs: 60_000 },
        { scope: "ip", limit: 30, burst: 30, windowMs: 60 * 60_000 },
      ],
    });
    if (!rl.allowed) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: "Too many registration attempts. Please try again later." }
      }), {
        status: 429,
        headers: {
          ...reqMeta.header(),
          "Retry-After": String(rl.retryAfter),
          'Content-Type': 'application/json'
        }
      });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Invalid JSON in request body' }
      }), {
        status: 400,
        headers: { ...reqMeta.header(), 'Content-Type': 'application/json' }
      });
    }

    // Extract and validate input data
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const phone = String(body?.phone || '').trim();
    const password = String(body?.password || '').trim();
    const role = String(body?.role || 'CUSTOMER').toUpperCase();

    // Validate required fields
    if (!name || !email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Please fill in all required fields (name, email, password)' }
      }), {
        status: 400,
        headers: { ...reqMeta.header(), 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Invalid email address' }
      }), {
        status: 400,
        headers: { ...reqMeta.header(), 'Content-Type': 'application/json' }
      });
    }

    // Validate and normalize phone (optional)
    let normalizedPhone = null;
    if (phone) {
      try {
        normalizedPhone = validateAndNormalizePhone(phone);
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: error.message }
        }), {
          status: 400,
          headers: { ...reqMeta.header(), 'Content-Type': 'application/json' }
        });
      }
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: passwordValidation.errors.join('. ') }
      }), {
        status: 400,
        headers: { ...reqMeta.header(), 'Content-Type': 'application/json' }
      });
    }

    // Validate role
    const validRoles = ['CUSTOMER', 'MERCHANT', 'IMPLEMENTER'];
    const userRole = validRoles.includes(role) ? role.toLowerCase() : 'customer';

    // Check for existing user
    const existing = normalizedPhone 
      ? await sql`SELECT id FROM auth_users WHERE email = ${email} OR phone = ${normalizedPhone} LIMIT 1`
      : await sql`SELECT id FROM auth_users WHERE email = ${email} LIMIT 1`;
    
    if (existing?.length) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Email or phone number already registered' }
      }), {
        status: 400,
        headers: { ...reqMeta.header(), 'Content-Type': 'application/json' }
      });
    }

    // Create user
    const created = normalizedPhone ? 
      await sql`
        INSERT INTO auth_users (name, email, phone, role)
        VALUES (${name}, ${email}, ${normalizedPhone}, ${userRole})
        RETURNING id
      ` :
      await sql`
        INSERT INTO auth_users (name, email, role)
        VALUES (${name}, ${email}, ${userRole})
        RETURNING id
      `;

    const userId = created?.[0]?.id;
    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Could not create user' }
      }), {
        status: 500,
        headers: { ...reqMeta.header(), 'Content-Type': 'application/json' }
      });
    }

    // Create password hash and account
    const passwordHash = await hash(password);
    await sql`
      INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password)
      VALUES (${userId}, 'credentials', 'credentials', ${userId}, ${passwordHash})
    `;

    // Create wallet for the new user
    try {
      await sql`
        INSERT INTO wallets (user_id, currency, balance)
        VALUES (${userId}, 'KES', 0)
      `;
    } catch (walletError) {
      console.log("Wallet creation info:", walletError.message);
      // Continue - wallet might already exist or will be created on first use
    }

    // Create session
    const sessionToken = crypto.randomUUID() + '-' + Date.now();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
    
    await sql`
      INSERT INTO auth_sessions ("userId", expires, "sessionToken")
      VALUES (${userId}, ${expires.toISOString()}, ${sessionToken})
    `;

    await writeAudit({
      userId,
      action: "auth.register",
      metadata: { 
        correlationId: reqMeta.id,
        role: userRole,
        hasPhone: !!normalizedPhone
      },
    });

    // Return success response
    const user = {
      id: userId,
      name,
      email,
      phone: normalizedPhone,
      role: userRole,
      kycStatus: 'PENDING'
    };

    return new Response(JSON.stringify({
      success: true,
      data: {
        user,
        accessToken: sessionToken,
        refreshToken: sessionToken
      }
    }), {
      status: 201,
      headers: { ...reqMeta.header(), 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: {
        message: 'Registration failed. Please try again.',
        details: error.message
      }
    }), {
      status: 500,
      headers: { ...reqMeta.header(), 'Content-Type': 'application/json' }
    });
  }
}