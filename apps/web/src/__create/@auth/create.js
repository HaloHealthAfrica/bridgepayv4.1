import { getToken } from '@auth/core/jwt';
import { getContext } from 'hono/context-storage';

export default function CreateAuth() {
	const auth = async () => {
		const c = getContext();
		const token = await getToken({
			req: c.req.raw,
			secret: process.env.AUTH_SECRET,
			secureCookie: process.env.AUTH_URL.startsWith('https'),
		});
		if (token) {
			// Fetch role from database if not in token
			let role = token.role;
			if (!role && token.sub) {
				try {
					const sql = await import("@/app/api/utils/sql");
					const rows = await sql.default`SELECT role FROM auth_users WHERE id = ${token.sub} LIMIT 1`;
					role = rows?.[0]?.role || 'customer';
				} catch (e) {
					role = 'customer';
				}
			}
			
			return {
				user: {
					id: token.sub,
					email: token.email,
					name: token.name,
					image: token.picture,
					role: role || 'customer',
				},
				expires: token.exp.toString(),
			};
		}
	};
	return {
		auth,
	};
}
